import Masthead from "./components/Masthead.jsx";
import SearchBar from "./components/SearchBar.jsx";
import ArticleCard from "./components/ArticleCard.jsx";
import SkeletonCard from "./components/SkeletonCard.jsx";
import EmptyState from "./components/EmptyState.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";
import WarningsList from "./components/WarningsList.jsx";
import FootMeta from "./components/FootMeta.jsx";
import { useNewsDigest } from "./hooks/useNewsDigest.js";

const SKELETON_COUNT = 4;

export default function App() {
  
  const { 
      status, 
      articles, 
      warnings, 
      meta, error, 
      lastTopic, 
      fetchNews } = useNewsDigest();

  return (

    <div className="page">
      <Masthead status={status} />
      <SearchBar onSearch={fetchNews} loading={status === "loading"} />

      <main className="feed" aria-live="polite">
        {status === "loading" &&
          Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}

        {status === "error" && (
          <ErrorBanner message={error} onRetry={() => fetchNews(lastTopic)} />
        )}

        {status === "idle" && <EmptyState />}

        {status === "live" &&
          (articles.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {articles.map((article) => (
                <ArticleCard key={`${article.rank}-${article.url}`} article={article} />
              ))}
              <WarningsList warnings={warnings} />
            </>
          ))}
      </main>

      <FootMeta meta={meta} />
    </div>
  );
}
