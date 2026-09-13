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
      {meta.articleCount} articles &middot; searched &ldquo;{meta.searchQueryUsed}&rdquo;
      {time ? ` \u00B7 updated ${time}` : ""}
    </footer>
  );
}
