const STATUS_LABEL = {
  idle: "Idle",
  loading: "Fetching…",
  live: "Live",
  error: "Failed",
};

export default function Masthead({ status }) {
  return (
    <header className="masthead">
      <div className="masthead__top">
        <span className="wordmark">
          <span className="wordmark__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#1A0F00" />
            </svg>
          </span>
          News Digest
        </span>
        <span className={`status status--${status}`}>
          <span className="status__dot" />
          <span>{STATUS_LABEL[status]}</span>
        </span>
      </div>
      <h1 className="masthead__headline">What&rsquo;s happening right now.</h1>
      <p className="masthead__sub">
        Every article below is pulled live through Tavily search &mdash; nothing here
        comes from the model&rsquo;s memory. The model only reads what Tavily found and
        writes the summary.
      </p>
    </header>
  );
}
