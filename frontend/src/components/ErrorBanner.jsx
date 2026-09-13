export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <strong>Couldn&rsquo;t fetch the news.</strong>
      <span className="error-banner__msg">{message}</span>
      <button type="button" className="error-banner__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
