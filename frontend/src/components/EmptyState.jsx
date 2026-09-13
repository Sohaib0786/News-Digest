export default function EmptyState() {
  return (
    <div className="empty">
      <p>Nothing pulled yet.</p>
      <p className="empty__sub">
        Press &ldquo;Get the news&rdquo; to fetch and summarize the latest 10 articles.
      </p>
    </div>
  );
}
