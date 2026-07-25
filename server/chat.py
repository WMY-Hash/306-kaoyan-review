"""
RAG 聊天接口：/api/chat（流式 SSE）、/api/explain（考点讲解）
"""
import json
import logging
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import (
    LLM_PROVIDER, RETRIEVAL_TOP_K, MAX_CONTEXT_CHARS,
    DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_CHAT_MODEL,
    GEMINI_API_KEY, GEMINI_CHAT_MODEL,
)
from kb_index import search, get_point_by_id

logger = logging.getLogger("chat")
router = APIRouter()

# ---- 请求模型 ----
class ChatRequest(BaseModel):
    question: str
    history: Optional[list[dict]] = None  # [{"role":"user","content":"..."}, ...]

class ExplainRequest(BaseModel):
    pointId: str


# ---- System Prompt ----
SYSTEM_PROMPT = """你是「306 考研复习 AI 辅导员」，专门帮助一名临床医学本科生备考 306 临床医学综合能力（西医）。

你的职责：
1. 基于提供的【检索到的考点】回答用户问题，引用考点编号或标题。
2. 用通俗但准确的中文解释医学概念，适合大四医学生理解。
3. 如果问题涉及机制/通路，用分步解释。
4. 如果检索结果不足以回答，如实说"根据当前知识库，我暂时无法完整回答这个问题"，然后给出你知道的部分。
5. 回答末尾可附加 1–2 道自测题帮助用户巩固（可选）。

禁止：
- 编造没有在考点中出现过的医学事实或数值。
- 给出诊断或治疗建议（你是辅导工具，不是临床决策支持）。
- 回答与 306 考研无关的问题（礼貌拒绝）。"""


# ---- LLM 调用 ----
def _build_context(results: list[dict]) -> str:
    """把检索结果拼成 context 字符串"""
    parts = []
    total = 0
    for r in results:
        doc = r.get("document", "")
        meta = r.get("metadata", {})
        header = f"【{meta.get('subject','')} · {meta.get('chapter','')}】{meta.get('title','')}"
        chunk = f"{header}\n{doc}"
        if total + len(chunk) > MAX_CONTEXT_CHARS:
            remaining = MAX_CONTEXT_CHARS - total
            if remaining > 200:
                parts.append(chunk[:remaining] + "…")
            break
        parts.append(chunk)
        total += len(chunk)
    return "\n\n---\n\n".join(parts)


async def _stream_deepseek(messages: list[dict]):
    """DeepSeek 流式（SSE）"""
    url = f"{DEEPSEEK_BASE_URL}/chat/completions"
    body = {
        "model": DEEPSEEK_CHAT_MODEL,
        "messages": messages,
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 2048,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST", url,
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json=body,
        ) as resp:
            if resp.status_code != 200:
                text = await resp.aread()
                yield f"data: {json.dumps({'error': f'DeepSeek API 错误 {resp.status_code}: {text.decode()[:300]}'})}\n\n"
                yield "data: [DONE]\n\n"
                return
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield f"data: {json.dumps({'content': content})}\n\n"
                except json.JSONDecodeError:
                    continue


async def _stream_gemini(messages: list[dict]):
    """Gemini 流式（SSE，备用）"""
    # Gemini 用 generateContent stream
    # 把 OpenAI 格式 messages 转成 Gemini contents
    contents = []
    sys_parts = []
    for m in messages:
        if m["role"] == "system":
            sys_parts.append({"text": m["content"]})
        elif m["role"] == "user":
            contents.append({"role": "user", "parts": [{"text": m["content"]}]})
        elif m["role"] == "assistant":
            contents.append({"role": "model", "parts": [{"text": m["content"]}]})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_CHAT_MODEL}:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
    body = {
        "contents": contents,
        "systemInstruction": {"parts": sys_parts} if sys_parts else None,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048},
    }
    if body["systemInstruction"] is None:
        del body["systemInstruction"]

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", url, json=body) as resp:
            if resp.status_code != 200:
                text = await resp.aread()
                yield f"data: {json.dumps({'error': f'Gemini API 错误 {resp.status_code}: {text.decode()[:300]}'})}\n\n"
                yield "data: [DONE]\n\n"
                return
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                try:
                    chunk = json.loads(data)
                    candidates = chunk.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for p in parts:
                            if "text" in p:
                                yield f"data: {json.dumps({'content': p['text']})}\n\n"
                except json.JSONDecodeError:
                    continue


# ---- 路由 ----
@router.post("/chat")
async def chat(req: ChatRequest):
    """RAG 问答：检索 → 拼 prompt → 流式返回"""
    t0 = time.time()

    # 1. 检索
    results = search(req.question, top_k=RETRIEVAL_TOP_K)
    logger.info("检索到 %d 条结果，耗时 %.2fs", len(results), time.time()-t0)

    # 2. 拼 messages
    context = _build_context(results) if results else "（未检索到相关考点，请基于你的医学知识回答）"
    user_content = f"【检索到的考点】\n{context}\n\n【用户问题】\n{req.question}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if req.history:
        messages.extend(req.history)
    messages.append({"role": "user", "content": user_content})

    # 3. 流式返回
    async def generate():
        try:
            if LLM_PROVIDER == "deepseek":
                async for chunk in _stream_deepseek(messages):
                    yield chunk
            elif LLM_PROVIDER == "gemini":
                async for chunk in _stream_gemini(messages):
                    yield chunk
            else:
                yield f"data: {json.dumps({'error': f'不支持的 LLM: {LLM_PROVIDER}'})}\n\n"
                yield "data: [DONE]\n\n"
        except Exception as e:
            logger.exception("流式生成出错")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/explain")
async def explain(req: ExplainRequest):
    """考点讲解：不检索，直接用该考点全文让 AI 展开讲解"""
    point = get_point_by_id(req.pointId)
    if not point:
        raise HTTPException(status_code=404, detail=f"考点 {req.pointId} 不存在")

    user_content = (
        f"请针对以下 306 西医综合考点，为一名大四临床医学生做详细讲解。\n"
        f"讲解应包含：概念定义、核心机制、临床联系、记忆技巧。\n\n"
        f"【考点标题】{point['title']}\n"
        f"【所属科目】{point['subject']} · {point['chapter']}\n"
        f"【等级】{point['level']}\n"
        f"【正文】\n{point['body']}\n\n"
        f"【关联卡片】\n{point.get('cards_text','')}"
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    async def generate():
        try:
            if LLM_PROVIDER == "deepseek":
                async for chunk in _stream_deepseek(messages):
                    yield chunk
            elif LLM_PROVIDER == "gemini":
                async for chunk in _stream_gemini(messages):
                    yield chunk
        except Exception as e:
            logger.exception("讲解生成出错")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/admin/reindex")
async def reindex():
    """手动重建向量索引"""
    from kb_index import build_index_if_needed
    try:
        build_index_if_needed(force=True)
        return {"status": "ok", "message": "索引重建完成"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
