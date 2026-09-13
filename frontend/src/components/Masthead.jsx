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
        <span className="wordmark">Signal</span>
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
