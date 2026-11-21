import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHistory, HistoryVideo, removeFromHistory } from "../helpers/history";
import useStore from "../helpers/store";
import ListHeader from "./ListHeader";
import MoveDropdown from "./MoveDropdown";
import VideoRow from "./VideoRow";

const toViewerVideo = (v: HistoryVideo): Video => ({
  id: v.id,
  title: v.title,
  channel: v.channel,
  channelId: v.channelId,
  thumbnail: v.thumbnail,
  resourceId: v.id,
  durationSeconds: v.durationSeconds,
  releaseDate: v.releaseDate,
  dateAdded: "",
  viewCount: v.viewCount,
  selected: false,
});

const dayLabel = (watchedAt: number) => {
  const date = new Date(watchedAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== today.getFullYear() && { year: "numeric" }),
  });
};

export default function History() {
  const accessToken = useStore((state) => state.accessToken);
  const gridView = useStore((state) => state.gridView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const videoViewerPip = useStore((state) => state.videoViewerPip);
  const subscriptions = useStore((state) => state.subscriptions);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const [videos, setVideos] = useState<HistoryVideo[] | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetchHistory(accessToken, null)
      .then((page) => {
        if (cancelled) return;
        setVideos(page.videos);
        setNextCursor(page.nextCursor);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // Only on open; the token refreshing in the background shouldn't reset the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (!accessToken || nextCursor === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchHistory(accessToken, nextCursor);
      setVideos((prev) => [...(prev ?? []), ...page.videos]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const groups = useMemo(() => {
    const result: { label: string; videos: HistoryVideo[] }[] = [];
    for (const video of videos ?? []) {
      const label = dayLabel(video.watchedAt);
      const last = result[result.length - 1];
      if (last?.label === label) last.videos.push(video);
      else result.push({ label, videos: [video] });
    }
    return result;
  }, [videos]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemove = async () => {
    if (!accessToken || !videos) return;
    const ids = Array.from(selectedIds);
    const previous = videos;
    setVideos(videos.filter((v) => !selectedIds.has(v.id)));
    setSelectedIds(new Set());
    if (!(await removeFromHistory(accessToken, ids))) setVideos(previous);
  };

  const handleDragStart = (e: React.DragEvent, video: HistoryVideo) => {
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

  const handleChannelClick = useCallback((channelId: string, channelTitle: string) => {
    const match = subscriptions.find((s) => s.channelId === channelId);
    const subscription = match ?? { id: "", title: channelTitle, thumbnail: "", channelId };
    setCurrentView({ type: "channel", subscription });
  }, [subscriptions, setCurrentView]);

  let index = 0;

  return (
    <div
      className={`pt-4 px-4 md:pt-10 md:px-10 overflow-y-auto flex-col ${
        viewingVideo && !videoViewerPip ? "hidden xl:flex xl:w-1/2" : "flex w-full"
      }`}
    >
      <ListHeader
        showActions={!!videos && videos.length > 0}
        selectedCount={selectedIds.size}
        totalCount={videos?.length ?? 0}
        onSelectAll={() => setSelectedIds(new Set(videos?.map((v) => v.id) ?? []))}
        onDeselectAll={() => setSelectedIds(new Set())}
        onDelete={handleRemove}
        hideSort
        selectionActions={
          <MoveDropdown
            selectedVideoResourceIds={Array.from(selectedIds)}
            onComplete={() => setSelectedIds(new Set())}
          />
        }
      >
        <h2 className="font-bold text-lg md:text-xl truncate">History</h2>
      </ListHeader>
      <div className="overflow-y-auto">
        {error && (
          <p className="text-sm text-error">Couldn't load history: {error}</p>
        )}
        {!videos && !error && (
          <div className="flex items-center justify-center py-10">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        {videos && videos.length === 0 && (
          <p className="text-sm text-base-content/60">
            Videos you watch will show up here.
          </p>
        )}
        {groups.map((group) => (
          <section key={group.label} className="mb-6">
            <h3 className="font-semibold mb-2">{group.label}</h3>
            <ul
              className={
                gridView
                  ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
                  : "flex flex-col"
              }
            >
              {group.videos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  index={index++}
                  gridView={gridView}
                  selected={selectedIds.has(video.id)}
                  onToggleSelect={() => toggleSelected(video.id)}
                  onOpenViewer={() => setViewingVideo(toViewerVideo(video))}
                  onDragStart={(e) => handleDragStart(e, video)}
                  onChannelClick={handleChannelClick}
                />
              ))}
            </ul>
          </section>
        ))}
        {nextCursor !== null && (
          <div className="flex justify-center pb-6">
            <button className="btn btn-sm btn-neutral" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <span className="loading loading-spinner loading-sm"></span> : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
