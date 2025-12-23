import { useEffect, useState } from "react";
import { convertReleaseDateToTimeSinceRelease } from "../helpers/functions";
import useStore from "../helpers/store";
import { fetchVideoCommentsAPI } from "../helpers/youtubeAPI/videoAPI";

interface VideoViewerProps {
  video: Video;
  onClose: () => void;
}

export default function VideoViewer({ video, onClose }: VideoViewerProps) {
  const accessToken = useStore((state) => state.accessToken);
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
    <div className="w-1/2 h-full flex flex-col border-l border-base-300">
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <h2 className="font-bold text-lg truncate pr-4">{video.title}</h2>
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
        >
          ✕
        </button>
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
