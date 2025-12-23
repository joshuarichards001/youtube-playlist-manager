import { useEffect, useState } from "react";
import {
  convertDurationToTimeString,
  convertReleaseDateToTimeSinceRelease,
} from "../helpers/functions";
import useStore from "../helpers/store";
import { fetchSubscriptionsFeedAPI, RateLimitError, unsubscribeAPI } from "../helpers/youtubeAPI/subscriptionAPI";
import { fetchChannelVideosAPI, fetchVideosAPI } from "../helpers/youtubeAPI/videoAPI";
import { deletePlaylistAPI } from "../helpers/youtubeAPI/playlistAPI";
import VideoActions from "./VideoActions";
import VideoViewer from "./VideoViewer";

export default function Videos() {
  const accessToken = useStore((state) => state.accessToken);
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const subscriptions = useStore((state) => state.subscriptions);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const [subscriptionFeedLoading, setSubscriptionFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const sort = useStore((state) => state.sort);
  const nextPageToken = useStore((state) => state.nextPageToken);
  const setNextPageToken = useStore((state) => state.setNextPageToken);
  const [loading, setLoading] = useState(false);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);

  const selectedPlaylist = currentView.type === 'playlist' ? currentView.playlist : null;
  const selectedSubscription = currentView.type === 'channel' ? currentView.subscription : null;
  const isFeedMode = currentView.type === 'subscriptionFeed';

  useEffect(() => {
    const sortedVideos = [...videos].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "viewCount":
          return b.viewCount - a.viewCount;
        case "releaseDate":
          return b.releaseDate.localeCompare(a.releaseDate);
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

  useEffect(() => {
    if (isFeedMode && accessToken && subscriptions.length > 0 && videos.length === 0 && !subscriptionFeedLoading && !feedError) {
      setSubscriptionFeedLoading(true);
      setFeedError(null);
      fetchSubscriptionsFeedAPI(accessToken, subscriptions)
        .then((feedVideos) => {
          setVideos(feedVideos);
          setSubscriptionFeedLoading(false);
        })
        .catch((error) => {
          setSubscriptionFeedLoading(false);
          if (error instanceof RateLimitError) {
            setFeedError(error.message);
          } else {
            setFeedError('Failed to load subscription feed. Please try again later.');
          }
        });
    }
  }, [isFeedMode, accessToken, subscriptions, videos.length, subscriptionFeedLoading, feedError, setVideos]);

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

    const confirmUnsubscribe = window.confirm(
      `Are you sure you want to unsubscribe from ${selectedSubscription.title}?`
    );

    if (confirmUnsubscribe) {
      const success = await unsubscribeAPI(accessToken, selectedSubscription.id);
      if (success) {
        setSubscriptions(subscriptions.filter((sub) => sub.id !== selectedSubscription.id));
        setCurrentView({ type: 'none' });
      }
    }
  };

  const currentTitle = selectedPlaylist?.title || selectedSubscription?.title || (isFeedMode ? "Recent Videos" : "");
  const isPlaylistView = currentView.type === 'playlist';
  const isChannelView = currentView.type === 'channel';
  const isLoading = loading || (isFeedMode && subscriptionFeedLoading);

  return (
    <>
      {(selectedPlaylist || selectedSubscription || isFeedMode) && (
        <div className={`pt-10 px-10 overflow-y-auto flex flex-col ${viewingVideo ? 'w-1/2' : 'w-full'}`}>
          <div className="flex flex-row justify-between items-center mb-4">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <h2 className="font-bold text-xl">
                  {currentTitle}
                </h2>
                {isFeedMode && (
                  <p className="text-xs text-gray-500">Feed is updated daily</p>
                )}
              </div>
              {isPlaylistView && (
                <button
                  className="btn btn-error btn-xs"
                  onClick={() => deletePlaylist(selectedPlaylist?.id)}
                >
                  Delete
                </button>
              )}
              {isChannelView && (
                <button
                  className="btn btn-error btn-xs"
                  onClick={handleUnsubscribe}
                >
                  Unsubscribe
                </button>
              )}
            </div>
            <VideoActions />
          </div>
          <div className="overflow-y-auto">
            <ul className="flex flex-col">
              {videos.map((video, i) => (
                <li
                  className={`flex flex-row cursor-move hover:bg-base-200 p-2 rounded-lg justify-between items-center w-full ${video.selected ? "bg-primary/10 hover:bg-primary/20" : ""
                    }`}
                  key={video.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, video)}
                  onClick={() => {
                    setVideos(
                      videos.map((mapVideo) =>
                        mapVideo.id === video.id
                          ? { ...mapVideo, selected: !mapVideo.selected }
                          : mapVideo
                      )
                    );
                  }}
                >
                  <div className="flex flex-row items-center">
                    <p className="mr-4 text-base-content/70">{i + 1}</p>
                    <div className="flex flex-row">
                      <div className="relative">
                        <img
                          className="rounded-md h-[66px] w-[120px] object-cover"
                          src={video.thumbnail}
                          alt={video.title}
                        />
                        <div className="absolute bottom-0 right-0 bg-black text-white text-xs px-1 rounded">
                          {convertDurationToTimeString(video.durationSeconds)}
                        </div>
                      </div>
                      <div className="flex flex-col pl-2 gap-2">
                        <button
                          className="link hover:text-primary text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingVideo(video);
                          }}
                        >
                          {video.title}
                        </button>
                        <div className="flex flex-row gap-4">
                          <p className="text-xs text-base-content/70">
                            {video.channel}
                          </p>
                          <p className="text-xs text-base-content/70">
                            {video.viewCount.toLocaleString()} views
                          </p>
                          <p className="text-xs text-base-content/70">
                            {convertReleaseDateToTimeSinceRelease(
                              video.releaseDate
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-lg mr-6"
                    checked={video.selected}
                    onChange={(e) => {
                      setVideos(
                        videos.map((mapVideo) =>
                          mapVideo.id === video.id
                            ? { ...mapVideo, selected: e.target.checked }
                            : mapVideo
                        )
                      );
                    }}
                  />
                </li>
              ))}
            </ul>
            {isLoading && videos.length === 0 && !feedError && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-spinner loading-lg"></span>
                <span className="ml-4">Loading videos...</span>
              </div>
            )}
            {feedError && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="alert alert-error max-w-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{feedError}</span>
                </div>
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => {
                    setFeedError(null);
                    setVideos([]);
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
            {nextPageToken && !isFeedMode && (
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
      {viewingVideo && (
        <VideoViewer video={viewingVideo} onClose={() => setViewingVideo(null)} />
      )}
    </>
  );
}
