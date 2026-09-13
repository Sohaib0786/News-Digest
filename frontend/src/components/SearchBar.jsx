import { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [topic, setTopic] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(topic.trim());
  }

  return (
    <form className="searchbar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="searchbar__input"
        placeholder={"Optional: narrow it down \u2014 \u201cAI regulation\u201d, \u201cspace\u201d, \u201cmarkets\u201d\u2026"}
        maxLength={200}
        autoComplete="off"
        value={topic}
        disabled={loading}
        onChange={(event) => setTopic(event.target.value)}
        aria-label="Topic to search for (optional)"
      />
      <button type="submit" className="searchbar__button" disabled={loading}>
        {loading ? "Fetching\u2026" : "Get the news"}
      </button>
    </form>
  );
}
