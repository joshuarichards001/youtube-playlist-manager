import { useEffect, useRef, useState } from "react";
import { convertReleaseDateToTimeSinceRelease } from "../helpers/functions";
import {
  getResumePosition,
  saveResumePosition,
} from "../helpers/resumePosition";
import useStore from "../helpers/store";
import { loadYouTubeIframeApi } from "../helpers/youtubeIframeApi";
import { fetchVideoCommentsAPI } from "../helpers/youtubeAPI/videoAPI";


interface VideoViewerProps {
  video: Video;
  onClose: () => void;
  expanded?: boolean;
  onExpandToggle?: () => void;
  pip?: boolean;
  onPipToggle?: () => void;
}

export default function VideoViewer({ video, onClose, expanded, onExpandToggle, pip, onPipToggle }: VideoViewerProps) {
  const accessToken = useStore((state) => state.accessToken);
  const subscriptions = useStore((state) => state.subscriptions);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const playerReadyRef = useRef(false);
  const videoIdRef = useRef(video.resourceId);
  const lastPositionRef = useRef(0);
  const lastDurationRef = useRef(0);
  const intervalIdRef = useRef<number | null>(null);
  const saveCurrentRef = useRef<() => void>(() => {});
  const pendingSwitchRef = useRef<{
    videoId: string;
    startSeconds: number;
  } | null>(null);

  const [initialSrc] = useState(() => {
    const start = Math.floor(getResumePosition(video.resourceId) ?? 0);
    lastPositionRef.current = start;
    const params = new URLSearchParams({ autoplay: "1", enablejsapi: "1" });
    if (start > 0) params.set("start", String(start));
    return `https://www.youtube.com/embed/${video.resourceId}?${params.toString()}`;
  });

  useEffect(() => {
    const fetchComments = async () => {
      if (!accessToken) return;
      setLoadingComments(true);
      const fetchedComments = await fetchVideoCommentsAPI(
        accessToken,
        video.resourceId
      );
      setComments(fetchedComments);
      setLoadingComments(false);
    };
    fetchComments();
  }, [accessToken, video.resourceId]);

  useEffect(() => {
    let cancelled = false;

    const capture = () => {
      const player = playerRef.current;
      if (!player) return;
      try {
        if (player.getVideoData().video_id !== videoIdRef.current) return;
        const t = player.getCurrentTime();
        const d = player.getDuration();
        if (Number.isFinite(t)) lastPositionRef.current = t;
        if (Number.isFinite(d) && d > 0) lastDurationRef.current = d;
      } catch {
        // player not ready, destroyed, or transitioning
      }
    };

    const saveCurrent = () => {
      capture();
      saveResumePosition(
        videoIdRef.current,
        lastPositionRef.current,
        lastDurationRef.current
      );
    };
    saveCurrentRef.current = saveCurrent;

    const stopInterval = () => {
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    const startInterval = () => {
      stopInterval();
      intervalIdRef.current = window.setInterval(saveCurrent, 5000);
    };

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !iframeRef.current) return;
      playerRef.current = new YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            try {
              const d = playerRef.current?.getDuration() ?? 0;
              if (Number.isFinite(d) && d > 0) lastDurationRef.current = d;
            } catch {
              // ignore
            }
            const pending = pendingSwitchRef.current;
            if (pending) {
              pendingSwitchRef.current = null;
              try {
                playerRef.current?.loadVideoById(pending);
              } catch {
                // ignore
              }
            }
          },
          onStateChange: (e) => {
            const PLAYING = 1;
            const PAUSED = 2;
            const ENDED = 0;
            if (e.data === PLAYING) {
              startInterval();
            } else if (e.data === PAUSED || e.data === ENDED) {
              stopInterval();
              saveCurrent();
            }
          },
        },
      });
    });

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") saveCurrent();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", saveCurrent);

    return () => {
      cancelled = true;
      stopInterval();
      saveCurrent();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", saveCurrent);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      playerReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (videoIdRef.current === video.resourceId) return;

    saveCurrentRef.current();

    videoIdRef.current = video.resourceId;
    const start = Math.floor(getResumePosition(video.resourceId) ?? 0);
    lastPositionRef.current = start;
    lastDurationRef.current = 0;

    const switchTo = { videoId: video.resourceId, startSeconds: start };
    if (playerReadyRef.current && playerRef.current) {
      try {
        playerRef.current.loadVideoById(switchTo);
      } catch {
        pendingSwitchRef.current = switchTo;
      }
    } else {
      pendingSwitchRef.current = switchTo;
    }
  }, [video.resourceId]);

  return (
    <div
      className={
        pip
          ? `fixed bottom-4 right-4 w-64 md:w-80 z-50 flex-col bg-base-100 border border-base-300 rounded-lg shadow-2xl overflow-hidden ${sidebarOpen ? "hidden md:flex" : "flex"}`
          : `${expanded ? "w-full" : "w-full xl:w-1/2"} h-full flex flex-col xl:border-l border-base-300 bg-base-100`
      }
    >
      <div className={`flex items-center justify-between border-b border-base-300 ${pip ? "p-2" : "p-4"}`}>
        <div className="flex flex-col min-w-0 pr-4">
          <h2 className={`font-bold truncate ${pip ? "text-sm" : "text-lg"}`}>{video.title}</h2>
          {!pip && (
            <button
              className="text-sm text-base-content/60 hover:text-primary truncate text-left"
              onClick={() => {
                const match = subscriptions.find((s) => s.channelId === video.channelId);
                const subscription = match ?? { id: "", title: video.channel, thumbnail: "", channelId: video.channelId };
                setCurrentView({ type: "channel", subscription });
              }}
            >
              {video.channel}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onPipToggle && (
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={onPipToggle}
              title={pip ? "Restore" : "Picture in picture"}
            >
              {pip ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                  <rect x="12" y="12" width="8" height="6" rx="1" ry="1" fill="currentColor" />
                </svg>
              )}
            </button>
          )}
          {onExpandToggle && !pip && (
            <button
              className="btn btn-ghost btn-sm btn-circle hidden xl:flex"
              onClick={onExpandToggle}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="10" y2="12" />
                  <polyline points="6 8 10 12 6 16" />
                  <line x1="21" y1="12" x2="14" y2="12" />
                  <polyline points="18 8 14 12 18 16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="10" y1="12" x2="3" y2="12" />
                  <polyline points="6 8 3 12 6 16" />
                  <line x1="14" y1="12" x2="21" y2="12" />
                  <polyline points="18 8 21 12 18 16" />
                </svg>
              )}
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>
      <div className={pip ? "" : "flex-1 overflow-y-auto p-4"}>
        <div className="w-full flex justify-center">
          <div className={pip ? "w-full aspect-video relative" : "w-full aspect-video max-h-[calc(100dvh-180px)] max-w-[calc((100dvh-180px)*16/9)] relative"}>
            <iframe
              ref={iframeRef}
              className="absolute inset-0 w-full h-full"
              src={initialSrc}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        {!pip && (
        <div className="mt-4">
          <h3 className="font-semibold text-base mb-3">Top Comments</h3>
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-base-content/60">
              No comments available
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 bg-base-300 flex items-center justify-center text-xs font-medium overflow-hidden">
                    {comment.authorProfileImage ? (
                      <img
                        src={comment.authorProfileImage}
                        alt={comment.authorName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <span className={comment.authorProfileImage ? "hidden" : ""}>
                      {comment.authorName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{comment.authorName}</span>
                      <span className="text-base-content/50 text-xs">
                        {convertReleaseDateToTimeSinceRelease(comment.publishedAt)}
                      </span>
                    </div>
                    <p
                      className="text-sm mt-1 break-words"
                      dangerouslySetInnerHTML={{ __html: comment.text }}
                    />
                    {comment.likeCount > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-base-content/60">
                        <span>👍</span>
                        <span>{comment.likeCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
