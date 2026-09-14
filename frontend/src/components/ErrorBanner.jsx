export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <svg
        className="error-banner__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="error-banner__content">
        <strong>Couldn&rsquo;t fetch the news.</strong>
        <span className="error-banner__msg">{message}</span>
        <button type="button" className="error-banner__retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
