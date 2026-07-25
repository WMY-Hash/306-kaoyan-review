"""
306 考研复习 — AI 辅导员后端 主入口
启动：python server/main.py  或  uvicorn server.main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import SERVER_HOST, SERVER_PORT, validate as validate_config

# ---------- 日志 ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("server")

# ---------- 生命周期 ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时校验配置 + 建向量索引；关闭时清理"""
    logger.info("正在启动 AI 辅导员后端...")
    validate_config()
    # 延迟导入，避免循环依赖
    from kb_index import build_index_if_needed
    build_index_if_needed()
    logger.info("启动完成，监听 %s:%s", SERVER_HOST, SERVER_PORT)
    yield
    logger.info("后端已关闭")

# ---------- FastAPI ----------
app = FastAPI(
    title="306 考研复习 AI 辅导员",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 本地工具，允许所有来源
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- 路由 ----------
@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

# 延迟注册业务路由（避免循环导入）
from chat import router as chat_router
app.include_router(chat_router, prefix="/api")

# ---------- 直接运行 ----------
if __name__ == "__main__":
    import os, sys
    # 确保 server/ 在 sys.path 中，支持两种启动方式：
    #   python server/main.py     （从项目根启动）
    #   cd server && python main.py
    _dir = os.path.dirname(os.path.abspath(__file__))
    if _dir not in sys.path:
        sys.path.insert(0, _dir)
    os.chdir(_dir)  # 让 ChromaDB 数据落在 server/chroma_data/

    import uvicorn
    uvicorn.run("main:app", host=SERVER_HOST, port=SERVER_PORT, reload=True)
