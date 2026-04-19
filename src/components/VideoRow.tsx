import {
  convertDurationToTimeString,
  convertReleaseDateToTimeSinceRelease,
} from "../helpers/functions";

export type VideoRowData = {
  id: string;
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
  onChannelClick?: (channelId: string) => void;
  hideChannel?: boolean;
};

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
}: Props) {
  const hasDuration =
    video.durationSeconds !== undefined && video.durationSeconds > 0;

  return (
    <li
      className={
        gridView
          ? `flex flex-col cursor-move hover:bg-base-200 py-2 rounded-lg ${selected ? "bg-primary/10 hover:bg-primary/20" : ""}`
          : `flex flex-row cursor-move hover:bg-base-200 py-2 rounded-lg justify-between items-center w-full ${selected ? "bg-primary/10 hover:bg-primary/20" : ""}`
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
            {hasDuration && (
              <div className="absolute bottom-1 right-1 bg-black text-white text-xs px-1 rounded">
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
                onClick={(e) => { e.stopPropagation(); onChannelClick(video.channelId!); }}
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
                {hasDuration && (
                  <div className="absolute bottom-0 right-0 bg-black text-white text-xs px-1 rounded">
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
                      onClick={(e) => { e.stopPropagation(); onChannelClick(video.channelId!); }}
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
