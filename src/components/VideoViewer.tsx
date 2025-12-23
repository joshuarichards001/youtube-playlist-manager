interface VideoViewerProps {
  video: Video;
  onClose: () => void;
}

export default function VideoViewer({ video, onClose }: VideoViewerProps) {
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
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="w-full h-full max-h-full">
          <iframe
            className="w-full h-full aspect-video"
            src={`https://www.youtube.com/embed/${video.resourceId}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
