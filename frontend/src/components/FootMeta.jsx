function formatTime(iso) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function FootMeta({ meta }) {
  if (!meta) return <footer className="foot">&nbsp;</footer>;

  const time = formatTime(meta.generatedAt);

  return (
    <footer className="foot">
      <svg
        className="foot__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{meta.articleCount} articles</span>
      <span className="foot__sep">&middot;</span>
      <span>searched &ldquo;{meta.searchQueryUsed}&rdquo;</span>
      {time && (
        <>
          <span className="foot__sep">&middot;</span>
          <span>updated {time}</span>
        </>
      )}
    </footer>
  );
}
