# Signal — a grounded, LLM-summarized news digest

A full-stack app that fetches the latest news through **Tavily web search**
(via **LangChain**) and uses **Google Gemini** only to summarize and organize
what Tavily returned — never to answer from its own memory.

```
┌────────────────┐      GET/POST /api/news       ┌───────────────────────┐
│  React frontend │ ─────────────────────────────▶│  FastAPI backend      │
│  (Vite, JS)     │                                │                        │
└────────────────┘◀───────────────────────────────│  1. Gemini plans a    │
        ▲                    JSON response         │     search query      │
        │                                          │     (tool calling)    │
   npm run dev                                     │  2. Tavily runs it    │
   (proxies /api                                    │     (LangChain tool)  │
    to :8000)                                       │  3. Gemini summarizes │
                                                     │     each article      │
                                                     │     into structured   │
                                                     │     JSON              │
                                                     └───────────────────────┘
```

## Why the news can't come from the LLM's memory

Two things enforce this:

1. **Tool-calling query planning** — the LLM is bound to the Tavily tool
   (`llm.bind_tools([tavily_tool])`) and is instructed to *only* decide the
   search string, never to answer the news question itself. We then execute
   the tool call ourselves and use Tavily's raw results.
2. **Field provenance** — every `title`, `url`, `source`, and `published_date`
   shown in the UI is copied directly from Tavily's response object. The LLM
   is only ever asked to fill in `summary_points` and `topic_tags` for one
   article's content at a time (`llm.with_structured_output(ArticleSummarySchema)`),
   with an explicit instruction not to add facts that aren't in the given text.

If summarization fails for an individual article, that article falls back to
showing Tavily's raw snippet instead of silently dropping it or letting the
whole request fail.

## Project structure

```
news-digest/
├── backend/
│   ├── main.py            FastAPI app, routes, error handling, static mount
│   ├── news_service.py    LangChain pipeline: plan → search → summarize
│   ├── models.py          Pydantic schemas (structured LLM output + API I/O)
│   ├── requirements.txt
│   └── .env.example
└── frontend/               React (Vite, JavaScript)
    ├── index.html
    ├── vite.config.js      dev-server proxy: /api/* → localhost:8000
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── hooks/
        │   └── useNewsDigest.js   fetch(), loading/error/live state
        └── components/
            ├── Masthead.jsx
            ├── SearchBar.jsx
            ├── ArticleCard.jsx
            ├── SkeletonCard.jsx
            ├── EmptyState.jsx
            ├── ErrorBanner.jsx
            ├── WarningsList.jsx
            └── FootMeta.jsx
```

## Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

- `TAVILY_API_KEY` — required. Free key at https://tavily.com
- `LLM_PROVIDER` — `gemini` (default), `openai`, or `mistral`
- `GOOGLE_API_KEY` — required if using Gemini: https://aistudio.google.com/apikey
- `OPENAI_API_KEY` — required if using OpenAI: https://platform.openai.com
- `MISTRAL_API_KEY` — required if using Mistral: https://console.mistral.ai

### Frontend

```bash
cd frontend
npm install
```

## Run

**Development** (hot-reloading, two processes):

```bash
# terminal 1
cd backend && uvicorn main:app --reload

# terminal 2
cd frontend && npm run dev
```

Open **http://localhost:5173** — Vite's dev server proxies `/api/*` requests
to the backend on port 8000, so there's no CORS setup to think about.

**Production** (single process):

```bash
cd frontend && npm run build      # outputs frontend/dist
cd ../backend && uvicorn main:app
```

Open **http://localhost:8000** — the backend serves the built React app
directly. API docs are at **http://localhost:8000/docs**.

## API

| Method | Path         | Body / Query                                   | Description                          |
|--------|--------------|-------------------------------------------------|---------------------------------------|
| GET    | `/api/news`  | `?topic=...&max_articles=10`                    | Fetch + summarize news                |
| POST   | `/api/news`  | `{"topic": "...", "max_articles": 10}`          | Same, JSON body                       |
| GET    | `/api/health`| —                                                | Health check                          |

Response shape:

```json
{
  "query": "AI regulation",
  "search_query_used": "AI regulation news 2026",
  "article_count": 10,
  "generated_at": "2026-09-12T12:00:00+00:00",
  "warnings": [],
  "articles": [
    {
      "rank": 1,
      "title": "...",
      "url": "https://...",
      "source": "reuters.com",
      "published_date": "2026-09-11",
      "raw_snippet": "...",
      "summary_points": ["...", "..."],
      "topic_tags": ["AI regulation", "EU"],
      "summarized": true
    }
  ]
}
```

## Error handling

- Missing/invalid API keys → `502` with a clear message, caught before any
  request reaches Tavily or the LLM provider.
- Tavily failures (network, rate limit, empty results) → caught and surfaced
  as a `502` with the underlying reason; nothing throws an unhandled `500`.
- A single article's summarization failing doesn't fail the whole request —
  it's flagged (`summarized: false`) and listed in `warnings`, with the raw
  Tavily snippet shown instead.
- Any truly unexpected error is caught by a global FastAPI exception handler
  and returned as JSON, never an HTML stack trace.
- The React app shows a skeleton loading state, a dismissable error banner
  with a **Try again** button on failure, and an empty state before the
  first search.

## Swapping the LLM

Everything routes through `get_llm()` in `news_service.py`. Set
`LLM_PROVIDER=openai` or `LLM_PROVIDER=mistral` in `.env` to switch away from
Gemini without touching any other code — all three support `bind_tools` and
`with_structured_output`, which is all this pipeline needs from a model.

## Notes on the original script

The script this was built from called `TavilySearchResults(max_result=5)`
with Mistral and printed a single combined summary to the console. This
version:

- fixes the `max_result` → `max_results` typo and raises the count to 10
- swaps the LLM to Google Gemini (`gemini-2.5-flash`), with OpenAI/Mistral
  kept as drop-in alternatives
- moves off the deprecated `TavilySearchResults` tool onto the current
  `langchain_tavily.TavilySearch`
- summarizes each article independently and in a structured JSON shape, so
  one bad/thin article can't degrade the rest
- exposes the whole thing over a FastAPI backend with a React frontend on top
