"""
News digest pipeline.

Flow:
  1. PLAN   - the LLM is bound to the Tavily tool (`bind_tools`) and decides the
              search query. It is instructed never to answer from its own
              knowledge, only to call the tool. (demonstrates: tool calling)
  2. SEARCH - we execute the tool call against Tavily ourselves and take the
              raw results as-is. (demonstrates: Tavily web search via LangChain)
  3. SUMMARIZE - for each article, a *separate* LLM call is grounded only in
              that article's own content and forced into a Pydantic schema.
              (demonstrates: structured outputs)

Titles, URLs, sources, and publish dates shown to the user always come
directly from Tavily's response, never from the LLM — the LLM's only
output is the bullet summary and topic tags for text it was actually given.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from urllib.parse import urlparse

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_tavily import TavilySearch

from models import Article, ArticleSummarySchema

logger = logging.getLogger("news_digest")


class NewsServiceError(Exception):
    """Expected, user-facing failure (bad config, no results, upstream error)."""


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise NewsServiceError(
            f"Missing required environment variable '{name}'. Copy .env.example to "
            f".env and fill it in."
        )
    return value


# --------------------------------------------------------------------------
# LLM + tool setup
# --------------------------------------------------------------------------
def get_llm():
    """Chat model for both query planning and summarization.

    Defaults to Google Gemini. Provider is still swappable via LLM_PROVIDER
    (gemini / openai / mistral) so the pipeline works with any of the three
    without touching any logic below — all three support `bind_tools` and
    `with_structured_output`, which is all this pipeline needs from a model.
    """
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()

    if provider == "openai":
        _require_env("OPENAI_API_KEY")
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.2)

    if provider == "mistral":
        _require_env("MISTRAL_API_KEY")
        from langchain_mistralai import ChatMistralAI

        return ChatMistralAI(model=os.getenv("MISTRAL_MODEL", "mistral-small-2506"), temperature=0.2)

    _require_env("GOOGLE_API_KEY")
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        temperature=0.2,
    )


def get_search_tool(max_results: int) -> TavilySearch:
    _require_env("TAVILY_API_KEY")
    # `topic="news"` biases Tavily toward recent news coverage and includes
    # each result's published_date where available.
    return TavilySearch(
        max_results=max_results,
        topic="news",
        search_depth="advanced",
        include_answer=False,
        include_raw_content=False,
        include_images=False,
    )


# --------------------------------------------------------------------------
# Step 1: tool-calling query planner
# --------------------------------------------------------------------------
def _plan_search_query(llm, tavily_tool: TavilySearch, topic: Optional[str]) -> str:
    llm_with_tools = llm.bind_tools([tavily_tool])
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    focus = (
        f'The user wants current news about: "{topic}".'
        if topic
        else "The user wants a broad digest of today's top general news headlines."
    )

    system = SystemMessage(
        content=(
            "You are a research assistant with no knowledge of current events. "
            f"Today's date is {today}. You MUST call the search tool exactly once "
            "with a short, well-formed search-engine-style query that will surface "
            "recent, reputable news coverage. Do not answer the question yourself "
            "and do not state any facts about current events."
        )
    )
    ai_msg = llm_with_tools.invoke([system, HumanMessage(content=focus)])

    tool_calls = getattr(ai_msg, "tool_calls", None) or []
    if not tool_calls:
        fallback = topic.strip() if topic else "top news today"
        logger.warning("LLM issued no tool call; falling back to query=%r", fallback)
        return fallback

    args = tool_calls[0].get("args", {}) or {}
    return args.get("query") or (topic or "top news today")


# --------------------------------------------------------------------------
# Step 2: execute the search
# --------------------------------------------------------------------------
def _run_search(tavily_tool: TavilySearch, query: str, max_results: int) -> List[dict]:
    try:
        response = tavily_tool.invoke({"query": query})
    except Exception as exc:  # network errors, auth errors, rate limits, etc.
        logger.exception("Tavily search failed")
        raise NewsServiceError(f"Tavily search failed: {exc}") from exc

    if isinstance(response, str):
        # Some tool errors surface as a string instead of raising.
        raise NewsServiceError(f"Tavily returned an unexpected response: {response[:200]}")

    results = (response or {}).get("results") or []
    if not results:
        raise NewsServiceError("Tavily returned no results for this topic. Try a different one.")

    return results[:max_results]


def _domain_from_url(url: str) -> str:
    try:
        netloc = urlparse(url).netloc
        return netloc.replace("www.", "") or "Unknown source"
    except Exception:
        return "Unknown source"


# --------------------------------------------------------------------------
# Step 3: per-article structured summarization
# --------------------------------------------------------------------------
_SUMMARY_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You summarize a single news article into short, neutral bullet points. "
            "Use ONLY the article text given below — never add facts, dates, numbers, "
            "or claims that are not present in it. If the text is too thin to "
            "summarize meaningfully, say that plainly in one bullet instead of guessing.",
        ),
        (
            "human",
            "Article title: {title}\nSource: {source}\n\nArticle content:\n{content}",
        ),
    ]
)


def _summarize_article(llm, title: str, source: str, content: str) -> ArticleSummarySchema:
    structured_llm = llm.with_structured_output(ArticleSummarySchema)
    chain = _SUMMARY_PROMPT | structured_llm
    return chain.invoke({"title": title, "source": source, "content": content})


# --------------------------------------------------------------------------
# Orchestrator
# --------------------------------------------------------------------------
def build_news_digest(
    topic: Optional[str], max_articles: int = 10
) -> Tuple[str, List[Article], List[str]]:
    max_articles = max(1, min(max_articles, 10))

    llm = get_llm()
    tavily_tool = get_search_tool(max_articles)

    search_query = _plan_search_query(llm, tavily_tool, topic)
    raw_results = _run_search(tavily_tool, search_query, max_articles)

    articles: List[Article] = []
    warnings: List[str] = []

    for i, item in enumerate(raw_results, start=1):
        title = (item.get("title") or "Untitled").strip()
        url = item.get("url") or ""
        content = (item.get("content") or "").strip()
        source = _domain_from_url(url)
        published_date = item.get("published_date") or "Unknown"

        try:
            if not content:
                raise ValueError("Tavily returned no content for this result")
            summary = _summarize_article(llm, title, source, content)
            articles.append(
                Article(
                    rank=i,
                    title=title,
                    url=url,
                    source=source,
                    published_date=published_date,
                    raw_snippet=content[:400],
                    summary_points=summary.summary_points,
                    topic_tags=summary.topic_tags,
                    summarized=True,
                )
            )
        except Exception as exc:
            logger.warning("Summarization failed for %r: %s", title, exc)
            warnings.append(f"Couldn't summarize \u201c{title}\u201d \u2014 showing the raw snippet instead.")
            fallback_point = (
                content[:280] + ("\u2026" if len(content) > 280 else "")
                if content
                else "No content was available from the search result."
            )
            articles.append(
                Article(
                    rank=i,
                    title=title,
                    url=url,
                    source=source,
                    published_date=published_date,
                    raw_snippet=content[:400],
                    summary_points=[fallback_point],
                    topic_tags=[],
                    summarized=False,
                )
            )

    return search_query, articles, warnings
