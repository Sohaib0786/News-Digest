function formatDate(value) {
  if (!value || value === "Unknown") return "Date unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ArticleCard({ article }) {
  const rankLabel = String(article.rank).padStart(2, "0");
  const points = article.summary_points || [];
  const tags = article.topic_tags || [];

  return (
    <article className={`card${article.summarized ? "" : " card--fallback"}`}>
      <div className="card__rank">{rankLabel}</div>
      <div className="card__body">
        <div className="card__meta">
          <span className="card__source">{article.source || "Unknown source"}</span>
          <span className="card__dot">&middot;</span>
          <span className="card__date">{formatDate(article.published_date)}</span>
        </div>

        <h2 className="card__title">
          <a
            className="card__link"
            href={article.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            {article.title}
          </a>
        </h2>

        <ul className="card__points">
          {points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>

        {tags.length > 0 && (
          <div className="card__tags">
            {tags.map((tag) => (
              <span className="card__tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
