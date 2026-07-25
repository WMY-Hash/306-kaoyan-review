"""
KB_DATA → ChromaDB 向量索引
启动时自动构建（增量：已有 id 跳过），支持 /api/admin/reindex 手动重建
"""
import json
import logging
import re
import time
from typing import Optional

import chromadb
import httpx
from chromadb.config import Settings as ChromaSettings

from config import (
    CHROMA_PERSIST_DIR, CHROMA_COLLECTION, KB_DATA_PATH,
    EMBED_PROVIDER,
    GEMINI_API_KEY, GEMINI_EMBED_MODEL,
    LOCAL_EMBED_MODEL,
)

logger = logging.getLogger("kb_index")

# ---- ChromaDB 客户端（持久化到 server/chroma_data/）----
_client = chromadb.PersistentClient(
    path=CHROMA_PERSIST_DIR,
    settings=ChromaSettings(anonymized_telemetry=False),
)

def _get_collection():
    return _client.get_or_create_collection(name=CHROMA_COLLECTION)


# ---- 从 data/kb.js 解析考点 ----
def parse_kb_js(path: Optional[str] = None) -> list[dict]:
    """
    解析 window.KB_DATA = {...} 格式的 JS 文件，返回考点列表。
    每个考点 dict: { id, title, subject, chapter, level, tags, body, cards_text, search_text }
    """
    if path is None:
        path = KB_DATA_PATH
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    # 提取 window.KB_DATA = {...} 之间的 JSON（粗暴但够用）
    m = re.search(r"window\.KB_DATA\s*=\s*(\{.*)", raw, re.DOTALL)
    if not m:
        raise ValueError(f"无法从 {path} 解析 KB_DATA")
    js_obj = m.group(1).rstrip().rstrip(";").rstrip()

    # 用 json.loads 不行——JS 对象有尾逗号、无引号 key、注释等。
    # 策略：用正则逐考点提取，比完整 JS 解析器轻量得多。
    data = _parse_kb_data_fallback(raw)
    points = []
    for subj in data.get("subjects", []):
        for ch in subj.get("chapters", []):
            for pt in ch.get("points", []):
                cards_text = ""
                for c in pt.get("cards", []):
                    cards_text += f"Q: {c.get('q','')}\nA: {c.get('a','')}\n"
                search_text = (
                    f"[{subj.get('name','')}] {pt.get('title','')}\n"
                    f"标签: {', '.join(pt.get('tags',[]))}\n"
                    f"等级: {pt.get('level','')}\n"
                    f"{pt.get('body','')}\n"
                    f"{cards_text}"
                )
                points.append({
                    "id": pt.get("id", ""),
                    "title": pt.get("title", ""),
                    "subject": subj.get("name", ""),
                    "chapter": ch.get("name", ""),
                    "level": pt.get("level", ""),
                    "tags": pt.get("tags", []),
                    "body": pt.get("body", ""),
                    "cards_text": cards_text,
                    "search_text": search_text,
                })
    return points


def _parse_kb_data_fallback(raw: str) -> dict:
    """用 Node.js vm 沙箱解析 kb.js（含注释、单引号、尾逗号等非标准 JSON）"""
    import subprocess, os as _os

    script = """
const fs = require('fs'), vm = require('vm');
const raw = fs.readFileSync(process.argv[1], 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(raw, ctx);
const data = ctx.window.KB_DATA;
process.stdout.write(JSON.stringify(data));
"""
    try:
        result = subprocess.run(
            ["node", "-e", script, KB_DATA_PATH],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Node 解析 kb.js 失败: {result.stderr[:300]}")
        out = result.stdout.strip()
        if not out:
            raise RuntimeError("Node 解析 kb.js 返回空")
        return json.loads(out)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Node 解析 kb.js 超时")


# ---- Embedding 调用 ----
_local_embed_model = None  # 懒加载

def _get_local_model():
    global _local_embed_model
    if _local_embed_model is None:
        from sentence_transformers import SentenceTransformer
        _local_embed_model = SentenceTransformer(LOCAL_EMBED_MODEL)
        logger.info("本地 embedding 模型已加载: %s", LOCAL_EMBED_MODEL)
    return _local_embed_model

def _embed_local(texts: list[str]) -> list[list[float]]:
    """本地 sentence-transformers 模型，零网络、零费用"""
    model = _get_local_model()
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vecs.tolist()

def _embed_gemini(texts: list[str]) -> list[list[float]]:
    """调 Gemini Embedding API（备用）"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_EMBED_MODEL}:batchEmbedContents?key={GEMINI_API_KEY}"
    all_vecs = []
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        body = {
            "requests": [{"model": f"models/{GEMINI_EMBED_MODEL}", "content": {"parts": [{"text": t}]}} for t in batch]
        }
        resp = httpx.post(url, json=body, timeout=120)
        if resp.status_code != 200:
            raise RuntimeError(f"Gemini embedding 失败: {resp.status_code} {resp.text[:300]}")
        data = resp.json()
        for emb in data.get("embeddings", []):
            all_vecs.append(emb["values"])
    return all_vecs


def embed(texts: list[str]) -> list[list[float]]:
    """统一的 embedding 入口，根据 EMBED_PROVIDER 分发"""
    if EMBED_PROVIDER == "local":
        return _embed_local(texts)
    elif EMBED_PROVIDER == "gemini":
        return _embed_gemini(texts)
    raise RuntimeError(f"不支持的 embedding provider: {EMBED_PROVIDER}，可选 local / gemini")


# ---- 索引构建 ----
def build_index_if_needed(force: bool = False):
    """
    增量构建向量索引：
    - 解析 KB_DATA → 考点列表
    - 对比 ChromaDB 已有 id，只 embed 新增的
    - force=True 时全量重建
    """
    logger.info("解析 KB_DATA...")
    points = parse_kb_js()
    logger.info("共 %d 个考点", len(points))

    col = _get_collection()

    if force:
        logger.info("强制重建：删除现有 collection")
        _client.delete_collection(CHROMA_COLLECTION)
        col = _get_collection()

    # 找出新增的考点
    existing_ids = set()
    if col.count() > 0:
        existing = col.get(include=[])  # 只取 id
        existing_ids = set(existing["ids"])

    new_points = [p for p in points if p["id"] not in existing_ids]
    if not new_points:
        logger.info("索引已是最新（%d 条），无需重建", len(existing_ids))
        return

    logger.info("新增 %d 个考点，开始 embedding...", len(new_points))
    texts = [p["search_text"] for p in new_points]

    # 分批 embed（DeepSeek 单次建议 ≤ 100 条）
    batch_size = 50
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        logger.info("  embedding 批次 %d/%d (%d 条)", i//batch_size+1, (len(texts)-1)//batch_size+1, len(batch))
        all_embeddings.extend(embed(batch))
        if i + batch_size < len(texts):
            time.sleep(0.3)  # 避免触发速率限制

    # 写入 ChromaDB
    ids = [p["id"] for p in new_points]
    metadatas = [
        {"title": p["title"], "subject": p["subject"], "chapter": p["chapter"],
         "level": p["level"], "tags": ",".join(p["tags"])}
        for p in new_points
    ]
    documents = texts

    col.add(ids=ids, embeddings=all_embeddings, metadatas=metadatas, documents=documents)
    logger.info("索引构建完成：新增 %d 条，共 %d 条", len(new_points), col.count())


# ---- 检索接口（供 chat 模块调用）----
def search(query: str, top_k: int = 5) -> list[dict]:
    """语义检索：返回 top_k 个最相关考点"""
    col = _get_collection()
    if col.count() == 0:
        return []

    q_embed = embed([query])[0]
    results = col.query(query_embeddings=[q_embed], n_results=top_k, include=["documents", "metadatas", "distances"])

    items = []
    if results["ids"] and results["ids"][0]:
        for i, pid in enumerate(results["ids"][0]):
            items.append({
                "id": pid,
                "document": results["documents"][0][i] if results["documents"] else "",
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })
    return items


def get_point_by_id(point_id: str) -> Optional[dict]:
    """按 id 获取单个考点原文"""
    points = parse_kb_js()
    for p in points:
        if p["id"] == point_id:
            return p
    return None
