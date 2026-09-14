import { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [topic, setTopic] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(topic.trim());
  }

  return (
    <form className="searchbar" onSubmit={handleSubmit}>
      <div className="searchbar__input-wrap">
        <svg
          className="searchbar__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="searchbar__input"
          placeholder={"Narrow it down \u2014 \u201cAI regulation\u201d, \u201cspace\u201d, \u201cmarkets\u201d\u2026"}
          maxLength={200}
          autoComplete="off"
          value={topic}
          disabled={loading}
          onChange={(event) => setTopic(event.target.value)}
          aria-label="Topic to search for (optional)"
        />
      </div>
      <button type="submit" className="searchbar__button" disabled={loading}>
        {loading && <span className="searchbar__spinner" aria-hidden="true" />}
        {loading ? "Fetching\u2026" : "Get the news"}
      </button>
    </form>
  );
}
