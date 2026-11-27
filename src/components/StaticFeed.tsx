import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { sortVideos } from "../helpers/functions";
import useStore from "../helpers/store";
import MoveDropdown from "./MoveDropdown";
import ListHeader from "./ListHeader";
import VideoRow from "./VideoRow";

const toViewerVideo = (v: FeedVideo): Video => ({
  id: v.id,
  title: v.title,
  channel: v.channel,
  channelId: v.channelId,
  thumbnail: v.thumbnail,
  resourceId: v.id,
  durationSeconds: 0,
  releaseDate: v.releaseDate,
  dateAdded: "",
  viewCount: v.viewCount,
  selected: false,
});

type Props = {
  title: string;
  // Either a static JSON file to fetch, or feed data the caller already has.
  src?: string;
  data?: StaticFeedData | null;
  dataError?: string | null;
  // Extra content under the title (e.g. refresh progress).
  headerExtra?: ReactNode;
  emptyMessage?: string;
  // When false the JSON array order is meaningful (recommendation ranking),
  // so the sort dropdown is hidden and no sorting is applied.
  sortable?: boolean;
};

export default function StaticFeed({
  title,
  src,
  data = null,
  dataError = null,
  headerExtra,
  emptyMessage = "The feed is empty.",
  sortable = false,
}: Props) {
  const gridView = useStore((state) => state.gridView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const videoViewerPip = useStore((state) => state.videoViewerPip);
  const sort = useStore((state) => state.sort);
  const setSort = useStore((state) => state.setSort);
  const subscriptions = useStore((state) => state.subscriptions);
  const setCurrentView = useStore((state) => state.setCurrentView);

  useEffect(() => {
    if (sortable) setSort("releaseDate");
  }, [sortable, setSort]);

  const [fetched, setFetched] = useState<StaticFeedData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const feed = src ? fetched : data;
  const error = src ? fetchError : dataError;
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
    if (!sortable) return feed.videos;
    return sortVideos(feed.videos, sort);
  }, [feed, sort, sortable]);

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
    setSelectedIds(new Set());
    if (!src) return;
    let cancelled = false;
    setFetched(null);
    setFetchError(null);
    fetch(src, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: StaticFeedData) => {
        if (!cancelled) setFetched(json);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const handleChannelClick = useCallback((channelId: string) => {
    const match = subscriptions.find((s) => s.channelId === channelId);
    const subscription = match ?? { id: "", title: channelId, thumbnail: "", channelId };
    setCurrentView({ type: "channel", subscription });
  }, [subscriptions, setCurrentView]);

  const generatedLabel = feed?.generatedAt
    ? new Date(feed.generatedAt).toLocaleString()
    : null;

  return (
    <>
      <div
        className={`pt-4 px-4 md:pt-10 md:px-10 overflow-y-auto flex-col ${
          viewingVideo && !videoViewerPip ? "hidden xl:flex xl:w-1/2" : "flex w-full"
        }`}
      >
        <ListHeader
          showActions={!!feed && feed.videos.length > 0}
          selectedCount={selectedIds.size}
          totalCount={feed?.videos.length ?? 0}
          onSelectAll={() =>
            setSelectedIds(new Set(feed?.videos.map((v) => v.id) ?? []))
          }
          onDeselectAll={() => setSelectedIds(new Set())}
          hideSort={!sortable}
          selectionActions={
            <MoveDropdown
              selectedVideoResourceIds={Array.from(selectedIds)}
              onComplete={() => setSelectedIds(new Set())}
            />
          }
        >
          <h2 className="font-bold text-lg md:text-xl truncate">
            {title}
          </h2>
          {generatedLabel && (
            <p className="text-xs text-base-content/60 truncate">
              Updated {generatedLabel}
            </p>
          )}
          {headerExtra}
        </ListHeader>
        <div className="overflow-y-auto">
          {error && !feed && (
            <p className="text-sm text-error">Couldn't load feed: {error}</p>
          )}
          {!feed && !error && (
            <div className="flex items-center justify-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}
          {feed && feed.videos.length === 0 && (
            <p className="text-sm text-base-content/60">{emptyMessage}</p>
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
                  onChannelClick={handleChannelClick}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
