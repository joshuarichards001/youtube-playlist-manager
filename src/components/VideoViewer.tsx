import { useEffect, useState } from "react";
import { convertReleaseDateToTimeSinceRelease } from "../helpers/functions";
import useStore from "../helpers/store";
import { fetchVideoCommentsAPI } from "../helpers/youtubeAPI/videoAPI";


interface VideoViewerProps {
  video: Video;
  onClose: () => void;
  expanded?: boolean;
  onExpandToggle?: () => void;
}

export default function VideoViewer({ video, onClose, expanded, onExpandToggle }: VideoViewerProps) {
  const accessToken = useStore((state) => state.accessToken);
  const subscriptions = useStore((state) => state.subscriptions);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

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

  return (
    <div className={`${expanded ? "w-full" : "w-full xl:w-1/2"} h-full flex flex-col xl:border-l border-base-300 bg-base-100`}>
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <div className="flex flex-col min-w-0 pr-4">
          <h2 className="font-bold text-lg truncate">{video.title}</h2>
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
        </div>
        <div className="flex items-center gap-1">
          {onExpandToggle && (
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="w-full">
          <iframe
            className="w-full aspect-video"
            src={`https://www.youtube.com/embed/${video.resourceId}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
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
      </div>
    </div>
  );
}
