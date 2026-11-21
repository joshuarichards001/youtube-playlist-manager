import {
  convertDurationToTimeString,
  convertReleaseDateToTimeSinceRelease,
} from "../helpers/functions";
import { useResumeProgress } from "../helpers/resumePosition";
import { useWatched } from "../helpers/watched";

function WatchedBadge() {
  return (
    <div
      className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/75 text-white text-[10px] leading-none px-1 py-0.5 rounded"
      title="Watched"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Watched
    </div>
  );
}

// Red bar along the bottom of the thumbnail, like YouTube's.
function ProgressBar({ fraction }: { fraction: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/40 rounded-b-md overflow-hidden">
      <div
        className="h-full bg-red-600"
        style={{ width: `${Math.max(fraction, 0.02) * 100}%` }}
      />
    </div>
  );
}

export type VideoRowData = {
  id: string;
  // YouTube video ID when `id` is something else (e.g. a playlist item ID).
  resourceId?: string;
  title: string;
  channel: string;
  channelId?: string;
  thumbnail: string;
  viewCount: number;
  releaseDate: string;
  durationSeconds?: number;
};

type Props = {
  video: VideoRowData;
  index: number;
  gridView: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenViewer: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  hideChannel?: boolean;
  onDelete?: () => void;
};

// Trash button revealed on row hover (always visible on touch-sized screens).
function DeleteButton({ onDelete, className }: { onDelete: () => void; className: string }) {
  return (
    <button
      className={`btn btn-ghost btn-xs btn-square text-error md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${className}`}
      title="Remove from playlist"
      aria-label="Remove from playlist"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}

export default function VideoRow({
  video,
  index,
  gridView,
  selected,
  onToggleSelect,
  onOpenViewer,
  onDragStart,
  onChannelClick,
  hideChannel,
  onDelete,
}: Props) {
  const videoId = video.resourceId ?? video.id;
  const watched = useWatched(videoId);
  const resumeProgress = useResumeProgress(videoId);
  // Finished videos are stored at position 0, so fall back to a full bar.
  const progress = resumeProgress ?? (watched ? 1 : null);
  const hasDuration =
    video.durationSeconds !== undefined && video.durationSeconds > 0;

  return (
    <li
      className={
        gridView
          ? `group flex flex-col cursor-move hover:bg-base-200 py-2 rounded-lg ${selected ? "bg-primary/10 hover:bg-primary/20" : ""}`
          : `group flex flex-row cursor-move hover:bg-base-200 py-2 rounded-lg justify-between items-center w-full ${selected ? "bg-primary/10 hover:bg-primary/20" : ""}`
      }
      draggable
      onDragStart={onDragStart}
      onClick={onToggleSelect}
    >
      {gridView ? (
        <>
          <div
            className="peer relative w-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onOpenViewer();
            }}
          >
            <img
              className="rounded-md w-full aspect-video object-cover"
              src={video.thumbnail}
              alt={video.title}
            />
            {watched && <WatchedBadge />}
            {progress !== null && <ProgressBar fraction={progress} />}
            {hasDuration && (
              <div className={`absolute right-1 bg-black ${progress !== null ? "bottom-2" : "bottom-1"} text-white text-xs px-1 rounded`}>
                {convertDurationToTimeString(video.durationSeconds!)}
              </div>
            )}
            <input
              type="checkbox"
              className="checkbox checkbox-sm absolute top-1 right-1"
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={onToggleSelect}
            />
            {onDelete && (
              <DeleteButton
                onDelete={onDelete}
                className="absolute top-1 right-8 bg-base-100/80 hover:bg-base-100"
              />
            )}
          </div>
          <div className="flex flex-col pt-2 gap-1 peer-hover:[&>button:first-child]:text-primary">
            <button
              className="link hover:text-primary text-left line-clamp-2 w-fit"
              onClick={(e) => {
                e.stopPropagation();
                onOpenViewer();
              }}
            >
              {video.title}
            </button>
            {!hideChannel && (onChannelClick && video.channelId ? (
              <button
                className="text-xs text-base-content/70 hover:text-primary text-left w-fit"
                onClick={(e) => { e.stopPropagation(); onChannelClick(video.channelId!, video.channel); }}
              >
                {video.channel}
              </button>
            ) : (
              <p className="text-xs text-base-content/70">{video.channel}</p>
            ))}
            <div className="flex flex-row gap-2 text-xs text-base-content/70">
              {video.viewCount > 0 && (
                <>
                  <p>{video.viewCount.toLocaleString()} views</p>
                  <p>·</p>
                </>
              )}
              <p>{convertReleaseDateToTimeSinceRelease(video.releaseDate)}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-row items-center min-w-0 flex-1 gap-2 md:gap-0">
            <p className="md:mr-4 text-base-content/70 text-sm w-5 flex-shrink-0 text-center">
              {index + 1}
            </p>
            <div className="flex flex-row min-w-0 flex-1 gap-2 md:gap-0">
              <div
                className="peer relative flex-shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenViewer();
                }}
              >
                <img
                  className="rounded-md h-[56px] w-[100px] md:h-[66px] md:w-[120px] object-cover"
                  src={video.thumbnail}
                  alt={video.title}
                />
                {watched && <WatchedBadge />}
                {progress !== null && <ProgressBar fraction={progress} />}
                {hasDuration && (
                  <div className={`absolute right-0 bg-black ${progress !== null ? "bottom-1.5" : "bottom-0"} text-white text-xs px-1 rounded`}>
                    {convertDurationToTimeString(video.durationSeconds!)}
                  </div>
                )}
              </div>
              <div className="flex flex-col pl-2 gap-1 md:gap-2 min-w-0 flex-1 peer-hover:[&>button]:text-primary">
                <button
                  className="link hover:text-primary text-left text-sm md:text-base line-clamp-2 w-fit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenViewer();
                  }}
                >
                  {video.title}
                </button>
                <div className="flex flex-row flex-wrap gap-x-2 gap-y-0 md:gap-4">
                  {!hideChannel && (onChannelClick && video.channelId ? (
                    <button
                      className="text-xs text-base-content/70 hover:text-primary truncate text-left"
                      onClick={(e) => { e.stopPropagation(); onChannelClick(video.channelId!, video.channel); }}
                    >
                      {video.channel}
                    </button>
                  ) : (
                    <p className="text-xs text-base-content/70 truncate">
                      {video.channel}
                    </p>
                  ))}
                  {video.viewCount > 0 && (
                    <p className="text-xs text-base-content/70">
                      {video.viewCount.toLocaleString()} views
                    </p>
                  )}
                  <p className="text-xs text-base-content/70">
                    {convertReleaseDateToTimeSinceRelease(video.releaseDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {onDelete && <DeleteButton onDelete={onDelete} className="ml-2 flex-shrink-0" />}
          <input
            type="checkbox"
            className="checkbox checkbox-sm md:checkbox-lg ml-2 md:mr-6 flex-shrink-0"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={onToggleSelect}
          />
        </>
      )}
    </li>
  );
}
