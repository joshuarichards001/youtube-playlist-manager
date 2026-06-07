import { useCallback, useState } from "react";
import useStore from "../helpers/store";
import { searchVideosAPI } from "../helpers/youtubeAPI/videoAPI";
import MoveDropdown from "./MoveDropdown";
import VideoActions from "./VideoActions";
import VideoRow from "./VideoRow";

export default function Search() {
  const accessToken = useStore((state) => state.accessToken);
  const gridView = useStore((state) => state.gridView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const videoViewerPip = useStore((state) => state.videoViewerPip);
  const subscriptions = useStore((state) => state.subscriptions);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || !accessToken) return;

    setLoading(true);
    setSelectedIds(new Set());
    const videos = await searchVideosAPI(accessToken, trimmed);
    setResults(videos);
    setHasSearched(true);
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, video: Video) => {
    e.dataTransfer.setData(
      "video",
      JSON.stringify({
        videoId: video.resourceId,
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

  const handleChannelClick = useCallback(
    (channelId: string, channelTitle: string) => {
      const match = subscriptions.find((s) => s.channelId === channelId);
      const subscription =
        match ?? { id: "", title: channelTitle, thumbnail: "", channelId };
      setCurrentView({ type: "channel", subscription });
    },
    [subscriptions, setCurrentView],
  );

  return (
    <div
      className={`pt-4 px-4 md:pt-10 md:px-10 overflow-y-auto flex-col ${
        viewingVideo && !videoViewerPip ? "hidden xl:flex xl:w-1/2" : "flex w-full"
      }`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex flex-row gap-2 flex-1 min-w-0">
          <input
            type="text"
            className="input input-bordered flex-1 min-w-0"
            placeholder="Search YouTube..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !query.trim()}
          >
            {loading && <span className="loading loading-spinner"></span>}
            Search
          </button>
        </form>
        {results.length > 0 && (
          <VideoActions
            selectedCount={selectedIds.size}
            totalCount={results.length}
            onSelectAll={() => setSelectedIds(new Set(results.map((v) => v.id)))}
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
        {loading && (
          <div className="flex items-center justify-center py-10">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        {!loading && hasSearched && results.length === 0 && (
          <p className="text-sm text-base-content/60">
            No videos found. Try a different search.
          </p>
        )}
        {!loading && !hasSearched && (
          <p className="text-sm text-base-content/60">
            Search for videos and drag them into a playlist, or select and move them.
          </p>
        )}
        {!loading && results.length > 0 && (
          <ul
            className={
              gridView
                ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
                : "flex flex-col"
            }
          >
            {results.map((video, i) => (
              <VideoRow
                key={video.id}
                video={video}
                index={i}
                gridView={gridView}
                selected={selectedIds.has(video.id)}
                onToggleSelect={() => toggleSelected(video.id)}
                onOpenViewer={() => setViewingVideo(video)}
                onDragStart={(e) => handleDragStart(e, video)}
                onChannelClick={handleChannelClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
