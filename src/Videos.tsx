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
                  <img
                    className="rounded-md h-20"
                    src={video.thumbnail}
                    alt={video.title}
                  />
                  <div className="flex flex-col pl-2 gap-2">
                    <p>{video.title}</p>
                    <p className="text-xs text-base-content/70">
                      {video.channel}
                    </p>
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
