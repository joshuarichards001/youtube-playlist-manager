import { refreshFeed } from "../helpers/feed";
import useStore from "../helpers/store";
import StaticFeed from "./StaticFeed";

// Subscription feed backed by D1. Data + refresh progress live in the store
// (useFeedRefresh keeps them current); this just renders them.
export default function RecentFeed() {
  const feed = useStore((state) => state.feed);
  const feedError = useStore((state) => state.feedError);
  const progress = useStore((state) => state.feedRefresh);

  const headerExtra = progress ? (
    <div className="mt-1 flex items-center gap-2 max-w-sm">
      <progress
        className="progress progress-primary w-full"
        value={progress.done}
        max={progress.total}
      />
      <span className="text-xs text-base-content/60 whitespace-nowrap tabular-nums">
        {progress.done}/{progress.total} channels
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {feedError && feed && (
        <p className="text-xs text-error truncate">{feedError}</p>
      )}
      <button
        className="btn btn-ghost btn-xs px-1 text-base-content/60"
        onClick={() => refreshFeed(true)}
      >
        Refresh now
      </button>
    </div>
  );

  return (
    <StaticFeed
      title="Recent Feed"
      data={feed}
      dataError={feedError}
      headerExtra={headerExtra}
      emptyMessage={progress ? "Fetching your subscriptions…" : "No videos yet."}
      sortable
    />
  );
}

// Thin bar under the nav while the feed refreshes, visible from any view.
export function FeedRefreshBar() {
  const progress = useStore((state) => state.feedRefresh);
  if (!progress) return null;
  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  return (
    <div className="h-0.5 w-full bg-base-300" title="Refreshing feed">
      <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
