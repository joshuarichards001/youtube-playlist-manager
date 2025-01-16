import useStore from "./store";

export default function Videos() {
  const videos = useStore((state) => state.videos);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);

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

  const formatDuration = (duration: string): string => {
    if (!duration) {
      return "0:00";
    }
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) {
      return "0:00";
    }

    const hours = (match[1] || "0H").slice(0, -1);
    const minutes = (match[2] || "0M").slice(0, -1);
    const seconds = (match[3] || "0S").slice(0, -1);

    return `${hours !== "0" ? hours + ":" : ""}${minutes.padStart(
      2,
      "0"
    )}:${seconds.padStart(2, "0")}`;
  };

  return (
    <>
      {videos.length > 0 && (
        <div>
          <h2 className="font-bold text-xl mb-4">{selectedPlaylist?.title}</h2>
          <ul className="flex flex-col">
            {videos.map((video) => (
              <li
                className="flex flex-row cursor-move hover:bg-base-200 p-2 rounded-lg justify-between items-center w-full"
                key={video.id}
                draggable
                onDragStart={(e) => handleDragStart(e, video)}
              >
                <div className="flex flex-row">
                  <div className="relative">
                    <img
                      className="rounded-md h-[66px] w-[120px] object-cover"
                      src={video.thumbnail}
                      alt={video.title}
                    />
                    <div className="absolute bottom-0 right-0 bg-black text-white text-xs px-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  <div className="flex flex-col pl-2 gap-2">
                    <p>{video.title}</p>
                    <div className="flex flex-row gap-4">
                      <p className="text-xs text-base-content/70">
                        {video.channel}
                      </p>
                      <p className="text-xs text-base-content/70">
                        {video.viewCount.toLocaleString()} views
                      </p>
                      <p className="text-xs text-base-content/70">
                        {new Date(video.releaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <input type="checkbox" className="checkbox checkbox-lg mr-6" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
