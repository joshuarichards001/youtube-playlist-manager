type Props = {
  video: Video;
};

export default function Video({ video }: Props) {
  return (
    <li
      className="flex flex-row cursor-move hover:bg-base-200 p-2 rounded-lg justify-between items-center w-full"
      draggable
    >
      <div className="flex flex-row">
        <img
          className="rounded-md h-20"
          src={video.snippet.thumbnails.default.url}
          alt={video.snippet.title}
        />
        <div className="flex flex-col pl-2 gap-2">
          <p>{video.snippet.title}</p>
          <p className="text-xs text-base-content/70">
            {video.snippet.videoOwnerChannelTitle}
          </p>
        </div>
      </div>
      <input type="checkbox" className="checkbox checkbox-lg mr-6" />
    </li>
  );
}
