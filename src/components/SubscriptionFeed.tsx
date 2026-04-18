import { useEffect, useState } from "react";
import { convertReleaseDateToTimeSinceRelease } from "../helpers/functions";
import useStore from "../helpers/store";
import VideoViewer from "./VideoViewer";

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

  const [feed, setFeed] = useState<SubscriptionFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          viewingVideo ? "hidden md:flex md:w-1/2" : "flex w-full"
        }`}
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-lg md:text-xl truncate">Recent Feed</h2>
            {generatedLabel && (
              <p className="text-xs text-base-content/60">
                Updated {generatedLabel}
              </p>
            )}
          </div>
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
              {feed.videos.map((video, i) => (
                <li
                  className={
                    gridView
                      ? "flex flex-col hover:bg-base-200 p-2 rounded-lg"
                      : "flex flex-row hover:bg-base-200 p-2 rounded-lg justify-between items-center w-full"
                  }
                  key={video.id}
                >
                  {gridView ? (
                    <>
                      <div className="relative w-full">
                        <img
                          className="rounded-md w-full aspect-video object-cover"
                          src={video.thumbnail}
                          alt={video.title}
                        />
                      </div>
                      <div className="flex flex-col pt-2 gap-1">
                        <button
                          className="link hover:text-primary text-left line-clamp-2"
                          onClick={() => setViewingVideo(toViewerVideo(video))}
                        >
                          {video.title}
                        </button>
                        <p className="text-xs text-base-content/70">
                          {video.channel}
                        </p>
                        <div className="flex flex-row gap-2 text-xs text-base-content/70">
                          {video.viewCount > 0 && (
                            <>
                              <p>{video.viewCount.toLocaleString()} views</p>
                              <p>·</p>
                            </>
                          )}
                          <p>
                            {convertReleaseDateToTimeSinceRelease(
                              video.releaseDate
                            )}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-row items-center min-w-0 flex-1 gap-2 md:gap-0">
                      <p className="md:mr-4 text-base-content/70 text-sm w-5 flex-shrink-0 text-center">
                        {i + 1}
                      </p>
                      <div className="flex flex-row min-w-0 flex-1 gap-2 md:gap-0">
                        <div className="relative flex-shrink-0">
                          <img
                            className="rounded-md h-[56px] w-[100px] md:h-[66px] md:w-[120px] object-cover"
                            src={video.thumbnail}
                            alt={video.title}
                          />
                        </div>
                        <div className="flex flex-col pl-2 gap-1 md:gap-2 min-w-0 flex-1">
                          <button
                            className="link hover:text-primary text-left text-sm md:text-base line-clamp-2"
                            onClick={() => setViewingVideo(toViewerVideo(video))}
                          >
                            {video.title}
                          </button>
                          <div className="flex flex-row flex-wrap gap-x-2 gap-y-0 md:gap-4">
                            <p className="text-xs text-base-content/70 truncate">
                              {video.channel}
                            </p>
                            {video.viewCount > 0 && (
                              <p className="text-xs text-base-content/70">
                                {video.viewCount.toLocaleString()} views
                              </p>
                            )}
                            <p className="text-xs text-base-content/70">
                              {convertReleaseDateToTimeSinceRelease(
                                video.releaseDate
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {viewingVideo && (
        <VideoViewer
          video={viewingVideo}
          onClose={() => setViewingVideo(null)}
        />
      )}
    </>
  );
}
