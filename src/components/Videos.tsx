import { useEffect, useState } from "react";
import useStore from "../helpers/store";
import { subscribeAPI, unsubscribeAPI } from "../helpers/youtubeAPI/subscriptionAPI";
import { fetchChannelVideosAPI, fetchVideosAPI } from "../helpers/youtubeAPI/videoAPI";
import { deletePlaylistAPI } from "../helpers/youtubeAPI/playlistAPI";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import MoveDropdown from "./MoveDropdown";
import VideoActions from "./VideoActions";
import VideoRow from "./VideoRow";

export default function Videos() {
  const accessToken = useStore((state) => state.accessToken);
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const subscriptions = useStore((state) => state.subscriptions);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const sort = useStore((state) => state.sort);
  const nextPageToken = useStore((state) => state.nextPageToken);
  const setNextPageToken = useStore((state) => state.setNextPageToken);
  const [loading, setLoading] = useState(false);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const videoViewerPip = useStore((state) => state.videoViewerPip);
  const gridView = useStore((state) => state.gridView);

  const selectedPlaylist = currentView.type === 'playlist' ? currentView.playlist : null;
  const selectedSubscription = currentView.type === 'channel' ? currentView.subscription : null;

  useEffect(() => {
    const sortedVideos = [...videos].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "viewCount":
          return b.viewCount - a.viewCount;
        case "releaseDate":
          return b.releaseDate.localeCompare(a.releaseDate);
        case "dateAdded":
          return b.dateAdded.localeCompare(a.dateAdded);
        case "duration":
          return b.durationSeconds - a.durationSeconds;
        default:
          return 0;
      }
    });

    setVideos(sortedVideos);
  }, [sort]);

  const fetchNextPlaylistVideos = async () => {
    try {
      if (!accessToken) {
        console.error("No access token available.");
        return;
      }

      if (!selectedPlaylist) {
        return;
      }

      setLoading(true);
      const videoResponse = await fetchVideosAPI(
        accessToken,
        selectedPlaylist,
        nextPageToken
      );

      setVideos([...videos, ...videoResponse.videos]);
      setNextPageToken(videoResponse.nextPageToken);
      setLoading(false);
      const url = new URL(window.location.href);
      url.pathname = `/playlist/${selectedPlaylist.id}`;
      window.history.pushState({}, "", url.toString());
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  const fetchNextChannelVideos = async () => {
    try {
      if (!accessToken) {
        console.error("No access token available.");
        return;
      }

      if (!selectedSubscription) {
        return;
      }

      setLoading(true);
      const videoResponse = await fetchChannelVideosAPI(
        accessToken,
        selectedSubscription.channelId,
        nextPageToken
      );

      setVideos([...videos, ...videoResponse.videos]);
      setNextPageToken(videoResponse.nextPageToken);
      setLoading(false);
      const url = new URL(window.location.href);
      url.pathname = `/channel/${selectedSubscription.channelId}`;
      window.history.pushState({}, "", url.toString());
    } catch (error) {
      console.error("Error fetching channel videos:", error);
    }
  };

  useEffect(() => {
    fetchNextPlaylistVideos();
  }, [selectedPlaylist]);

  useEffect(() => {
    fetchNextChannelVideos();
  }, [selectedSubscription]);

  const handleDragStart = (e: React.DragEvent, video: Video) => {
    e.dataTransfer.setData(
      "video",
      JSON.stringify({
        videoId: video.resourceId,
        sourcePlaylistId: selectedPlaylist?.id,
        videoItemId: video.id,
      })
    );

    const dragImage = document.createElement("img");
    dragImage.style.position = "absolute";
    dragImage.style.top = "-9999px";
    dragImage.style.left = "-9999px";
    dragImage.src = video.thumbnail;
    e.dataTransfer.setDragImage(dragImage, 20, 20);
  };

  const deletePlaylist = async (id: string | undefined) => {
    if (!id) {
      return;
    }

    if (!accessToken) {
      console.error("No access token available.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this playlist?"
    );

    if (confirmDelete) {
      try {
        await deletePlaylistAPI(accessToken, id);
        window.location.reload();
      } catch (error) {
        console.error("Error deleting playlist:", error);
      }
    }
  };

  const handleUnsubscribe = async () => {
    if (!selectedSubscription || !accessToken) return;

    const existing = subscriptions.find(
      (sub) => sub.channelId === selectedSubscription.channelId
    );
    if (!existing) return;

    const confirmUnsubscribe = window.confirm(
      `Are you sure you want to unsubscribe from ${selectedSubscription.title}?`
    );

    if (confirmUnsubscribe) {
      const success = await unsubscribeAPI(accessToken, existing.id);
      if (success) {
        setSubscriptions(subscriptions.filter((sub) => sub.id !== existing.id));
        setCurrentView({ type: 'none' });
      }
    }
  };

  const handleSubscribe = async () => {
    if (!selectedSubscription || !accessToken) return;
    const newSub = await subscribeAPI(accessToken, selectedSubscription.channelId);
    if (newSub) {
      setSubscriptions([...subscriptions, newSub]);
    }
  };

  const currentTitle = selectedPlaylist?.title || selectedSubscription?.title || "";
  const isPlaylistView = currentView.type === 'playlist';
  const isChannelView = currentView.type === 'channel';
  const isSubscribed =
    isChannelView &&
    subscriptions.some((s) => s.channelId === selectedSubscription?.channelId);

  const selectedVideos = videos.filter((video) => video.selected);
  const selectedVideoResourceIds = selectedVideos.map((v) => v.resourceId);
  const selectedVideoItemIds = selectedVideos.map((v) => v.id);

  const setAllSelected = (value: boolean) =>
    setVideos(videos.map((v) => ({ ...v, selected: value })));

  const handleChannelClick = (channelId: string, channelTitle: string) => {
    const match = subscriptions.find((s) => s.channelId === channelId);
    const subscription = match ?? { id: "", title: channelTitle, thumbnail: "", channelId };
    setCurrentView({ type: "channel", subscription });
  };

  const openDeleteModal = () => {
    const modal = document.getElementById(
      "delete-confirmation-modal"
    ) as HTMLDialogElement | null;
    modal?.showModal();
  };

  const hasSelection = selectedVideos.length > 0;
  useEffect(() => {
    if (!isPlaylistView || !hasSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const modal = document.getElementById(
        "delete-confirmation-modal"
      ) as HTMLDialogElement | null;
      if (!modal || modal.open) return;
      e.preventDefault();
      modal.showModal();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPlaylistView, hasSelection]);

  return (
    <>
      {(selectedPlaylist || selectedSubscription) && (
        <div className={`pt-4 px-4 md:pt-10 md:px-10 overflow-y-auto flex-col ${viewingVideo && !videoViewerPip ? 'hidden xl:flex xl:w-1/2' : 'flex w-full'}`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="font-bold text-lg md:text-xl truncate">
                {isPlaylistView && selectedPlaylist ? (
                  <a
                    href={`https://www.youtube.com/playlist?list=${selectedPlaylist.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-hover"
                  >
                    {currentTitle}
                  </a>
                ) : isChannelView && selectedSubscription ? (
                  <a
                    href={`https://www.youtube.com/channel/${selectedSubscription.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-hover"
                  >
                    {currentTitle}
                  </a>
                ) : (
                  currentTitle
                )}
              </h2>
              {isPlaylistView && (
                <button
                  className="btn btn-error btn-xs flex-shrink-0"
                  onClick={() => deletePlaylist(selectedPlaylist?.id)}
                >
                  Delete
                </button>
              )}
              {isChannelView && (isSubscribed ? (
                <button
                  className="btn btn-error btn-xs flex-shrink-0"
                  onClick={handleUnsubscribe}
                >
                  Unsubscribe
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-xs flex-shrink-0"
                  onClick={handleSubscribe}
                >
                  Subscribe
                </button>
              ))}
            </div>
            <VideoActions
              selectedCount={selectedVideos.length}
              totalCount={videos.length}
              onSelectAll={() => setAllSelected(true)}
              onDeselectAll={() => setAllSelected(false)}
              onDelete={isPlaylistView ? openDeleteModal : undefined}
              moveDropdown={
                <MoveDropdown
                  selectedVideoResourceIds={selectedVideoResourceIds}
                  selectedVideoItemIds={
                    isPlaylistView ? selectedVideoItemIds : undefined
                  }
                  sourcePlaylistId={selectedPlaylist?.id}
                  onComplete={() =>
                    setVideos(videos.filter((v) => !v.selected))
                  }
                />
              }
            />
          </div>
          <div className="overflow-y-auto">
            <ul
              className={
                gridView
                  ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
                  : "flex flex-col"
              }
            >
              {videos.map((video, i) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  index={i}
                  gridView={gridView}
                  selected={video.selected}
                  onToggleSelect={() =>
                    setVideos(
                      videos.map((mapVideo) =>
                        mapVideo.id === video.id
                          ? { ...mapVideo, selected: !mapVideo.selected }
                          : mapVideo
                      )
                    )
                  }
                  onOpenViewer={() => setViewingVideo(video)}
                  onDragStart={(e) => handleDragStart(e, video)}
                  onChannelClick={isChannelView ? undefined : handleChannelClick}
                  hideChannel={isChannelView}
                />
              ))}
            </ul>
            {loading && videos.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-spinner loading-lg"></span>
                <span className="ml-4">Loading videos...</span>
              </div>
            )}
            {nextPageToken && (
              <button
                className="btn btn-primary my-10"
                onClick={selectedPlaylist ? fetchNextPlaylistVideos : fetchNextChannelVideos}
              >
                {loading && <span className="loading loading-spinner"></span>}
                Load More Videos...
              </button>
            )}
          </div>
        </div>
      )}
      <DeleteConfirmationModal />
    </>
  );
}
