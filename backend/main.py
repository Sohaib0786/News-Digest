from dotenv import load_dotenv
from pathlib import Path

# Ensure the .env file next to this module is loaded even when the process
# current working directory is different (uvicorn reload spawns workers).
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from models import ErrorResponse, NewsDigestResponse, NewsRequest
from news_service import NewsServiceError, build_news_digest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("news_digest")

app = FastAPI(
    title="News Digest API",
    description="Fetches current news via Tavily web search and summarizes it with an LLM through LangChain.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail="Something went wrong while processing your request.",
        ).model_dump(),
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


def _run_digest(topic: Optional[str], max_articles: int) -> NewsDigestResponse:
    try:
        search_query, articles, warnings = build_news_digest(topic, max_articles)
    except NewsServiceError as exc:
        logger.warning("NewsServiceError: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    return NewsDigestResponse(
        query=topic or "Top headlines",
        search_query_used=search_query,
        article_count=len(articles),
        generated_at=datetime.now(timezone.utc).isoformat(),
        articles=articles,
        warnings=warnings,
    )


@app.get(
    "/api/news",
    response_model=NewsDigestResponse,
    responses={502: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Fetch and summarize the latest news",
)
def get_news(
    topic: Optional[str] = Query(default=None, max_length=200),
    max_articles: int = Query(default=10, ge=1, le=10),
):
    return _run_digest(topic, max_articles)


@app.post(
    "/api/news",
    response_model=NewsDigestResponse,
    responses={502: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Fetch and summarize the latest news (JSON body)",
)
def post_news(payload: NewsRequest):
    return _run_digest(payload.topic, payload.max_articles)


# In production, serve the built React app (frontend/dist, from `npm run
# build`) so the whole thing runs from a single process:
#   uvicorn main:app --reload
# During development, run the frontend separately with `npm run dev` —
# Vite's dev server proxies /api/* to this backend (see vite.config.js).
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
