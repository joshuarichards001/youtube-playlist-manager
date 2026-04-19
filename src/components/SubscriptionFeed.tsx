import { useEffect, useMemo, useState } from "react";
import useStore from "../helpers/store";
import MoveDropdown from "./MoveDropdown";
import VideoActions from "./VideoActions";
import VideoRow from "./VideoRow";

const toViewerVideo = (v: FeedVideo): Video => ({
  id: v.id,
  title: v.title,
  channel: v.channel,
  thumbnail: v.thumbnail,
  resourceId: v.id,
  durationSeconds: 0,
  releaseDate: v.releaseDate,
  viewCount: v.viewCount,
  selected: false,
});

export default function SubscriptionFeed() {
  const gridView = useStore((state) => state.gridView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const sort = useStore((state) => state.sort);
  const setSort = useStore((state) => state.setSort);

  useEffect(() => {
    setSort("releaseDate");
  }, [setSort]);

  const [feed, setFeed] = useState<SubscriptionFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedVideos = useMemo(() => {
    if (!feed) return [];
    return [...feed.videos].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "viewCount":
          return b.viewCount - a.viewCount;
        case "releaseDate":
          return b.releaseDate.localeCompare(a.releaseDate);
        default:
          return 0;
      }
    });
  }, [feed, sort]);

  const handleDragStart = (e: React.DragEvent, video: FeedVideo) => {
    e.dataTransfer.setData(
      "video",
      JSON.stringify({
        videoId: video.id,
        sourcePlaylistId: undefined,
        videoItemId: undefined,
      }),
    );

    const dragImage = document.createElement("img");
    dragImage.style.position = "absolute";
    dragImage.style.top = "-9999px";
    dragImage.style.left = "-9999px";
    dragImage.src = video.thumbnail;
    e.dataTransfer.setDragImage(dragImage, 20, 20);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/subscription-feed.json", { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SubscriptionFeed) => {
        if (!cancelled) setFeed(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generatedLabel = feed?.generatedAt
    ? new Date(feed.generatedAt).toLocaleString()
    : null;

  return (
    <>
      <div
        className={`pt-4 px-4 md:pt-10 md:px-10 overflow-y-auto flex-col ${
          viewingVideo ? "hidden xl:flex xl:w-1/2" : "flex w-full"
        }`}
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-lg md:text-xl truncate">
              Recent Feed
            </h2>
            {generatedLabel && (
              <p className="text-xs text-base-content/60">
                Updated {generatedLabel}
              </p>
            )}
          </div>
          {feed && feed.videos.length > 0 && (
            <VideoActions
              selectedCount={selectedIds.size}
              totalCount={feed.videos.length}
              onSelectAll={() =>
                setSelectedIds(new Set(feed.videos.map((v) => v.id)))
              }
              onDeselectAll={() => setSelectedIds(new Set())}
              moveDropdown={
                <MoveDropdown
                  selectedVideoResourceIds={Array.from(selectedIds)}
                  onComplete={() => setSelectedIds(new Set())}
                />
              }
            />
          )}
        </div>
        <div className="overflow-y-auto">
          {error && (
            <p className="text-sm text-error">Couldn't load feed: {error}</p>
          )}
          {!feed && !error && (
            <div className="flex items-center justify-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}
          {feed && feed.videos.length === 0 && (
            <p className="text-sm text-base-content/60">
              The feed is empty. Run the daily job or populate
              <code className="mx-1">data/channels.json</code>.
            </p>
          )}
          {feed && feed.videos.length > 0 && (
            <ul
              className={
                gridView
                  ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
                  : "flex flex-col"
              }
            >
              {sortedVideos.map((video, i) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  index={i}
                  gridView={gridView}
                  selected={selectedIds.has(video.id)}
                  onToggleSelect={() => toggleSelected(video.id)}
                  onOpenViewer={() => setViewingVideo(toViewerVideo(video))}
                  onDragStart={(e) => handleDragStart(e, video)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
