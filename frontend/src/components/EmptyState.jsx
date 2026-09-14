export default function EmptyState() {
  return (
    <div className="empty">
      <svg
        className="empty__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <path d="M10 6h8v4h-8z" />
      </svg>
      <p className="empty__title">Nothing pulled yet</p>
      <p className="empty__sub">
        Press &ldquo;Get the news&rdquo; to fetch and summarize the latest articles in real-time.
      </p>
    </div>
  );
}
