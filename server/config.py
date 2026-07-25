"""
306 考研复习 — AI 辅导员后端 配置
从环境变量 / .env 文件读取，零硬编码密钥
"""
import os

# 尝试从 .env 加载（可选，不需要额外依赖）
def _load_dotenv(path=None):
    if path is None:
        path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.isfile(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v

_load_dotenv()

# ---- LLM 提供商（对话生成）----
# 支持: "deepseek" | "gemini"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek")

# DeepSeek
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_CHAT_MODEL = os.getenv("DEEPSEEK_CHAT_MODEL", "deepseek-v4-flash")

# Gemini（备用，后续切换时只需填 key + 改 LLM_PROVIDER=gemini）
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash")

# ---- Embedding 提供商（文本转向量）----
# 支持: "local" | "gemini"
# "local" = sentence-transformers 本地模型，零费用、零网络、首次下载约 80MB
# "gemini" = text-embedding-004 API（需要 GEMINI_API_KEY）
EMBED_PROVIDER = os.getenv("EMBED_PROVIDER", "local")
LOCAL_EMBED_MODEL = os.getenv("LOCAL_EMBED_MODEL", "all-MiniLM-L6-v2")
GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "text-embedding-004")

# ---- 服务 ----
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8765"))

# ---- 向量库 ----
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_data")
CHROMA_COLLECTION = "kb_points"

# ---- KB 数据路径（相对于项目根） ----
import re
KB_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "kb.js")

# ---- RAG 参数 ----
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "5"))
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "4000"))

# ---- 校验 ----
def validate():
    """启动时校验必要的 key 已配置"""
    if LLM_PROVIDER == "deepseek":
        if not DEEPSEEK_API_KEY:
            raise RuntimeError(
                "DeepSeek API key 未配置。请在 server/.env 中设置 DEEPSEEK_API_KEY=sk-xxx"
            )
    elif LLM_PROVIDER == "gemini":
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "Gemini API key 未配置。请在 server/.env 中设置 GEMINI_API_KEY=xxx"
            )
    else:
        raise RuntimeError(f"不支持的 LLM_PROVIDER: {LLM_PROVIDER}，可选 deepseek / gemini")
