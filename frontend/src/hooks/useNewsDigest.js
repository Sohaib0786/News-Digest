import { useCallback, useState } from "react";

// Same-origin in production (backend serves this app directly). In dev,
// Vite's proxy (see vite.config.js) forwards /api/* to localhost:8000.
const API_BASE = "";

export function useNewsDigest() {
  const [status, setStatus] = useState("idle"); // idle | loading | live | error
  const [articles, setArticles] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [lastTopic, setLastTopic] = useState("");

  const fetchNews = useCallback(async (topic) => {
    
    setLastTopic(topic || "");
    setStatus("loading");
    setError(null);

    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    params.set("max_articles", "10");

    try {
      const res = await fetch(`${API_BASE}/api/news?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      let payload;
      try {
        payload = await res.json();
      } catch {
        throw new Error("The server sent back something that wasn't valid JSON.");
      }

      if (!res.ok) {
        const detail = payload && (payload.detail || payload.error);
        throw new Error(detail || `Request failed with status ${res.status}.`);
      }

      setArticles(payload.articles || []);
      setWarnings(payload.warnings || []);
      setMeta({
        articleCount: payload.article_count,
        searchQueryUsed: payload.search_query_used,
        generatedAt: payload.generated_at,
      });
      setStatus("live");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while talking to the server.");
      setStatus("error");
    }
  }, []);

  return { status, articles, warnings, meta, error, lastTopic, fetchNews };
}
