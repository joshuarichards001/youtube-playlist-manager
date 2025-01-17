import { useEffect } from "react";
import useStore from "../helpers/store";
import {
  convertDurationToTimeString,
  convertReleaseDateToTimeSinceRelease,
} from "../helpers/functions";
import VideoActions from "./VideoActions";

export default function Videos() {
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const sort = useStore((state) => state.sort);

  useEffect(() => {
    const sortedVideos = [...videos].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "viewCount":
          return b.viewCount - a.viewCount;
        case "releaseDate":
          return b.releaseDate.localeCompare(a.releaseDate);
        case "duration":
          return b.durationSeconds - a.durationSeconds;
        default:
          return 0;
      }
    });

    setVideos(sortedVideos);
  }, [sort]);

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
          <div className="flex flex-row justify-between items-center mb-4">
            <h2 className="font-bold text-xl mb-4">
              {selectedPlaylist?.title}
            </h2>
            <VideoActions />
          </div>
          <ul className="flex flex-col">
            {videos.map((video) => (
              <li
                className={`flex flex-row cursor-move hover:bg-base-200 p-2 rounded-lg justify-between items-center w-full ${
                  video.selected ? "bg-primary/10 hover:bg-primary/20" : ""
                }`}
                key={video.id}
                draggable
                onDragStart={(e) => handleDragStart(e, video)}
                onClick={() => {
                  setVideos(
                    videos.map((mapVideo) =>
                      mapVideo.id === video.id
                        ? { ...mapVideo, selected: !mapVideo.selected }
                        : mapVideo
                    )
                  );
                }}
              >
                <div className="flex flex-row">
                  <div className="relative">
                    <img
                      className="rounded-md h-[66px] w-[120px] object-cover"
                      src={video.thumbnail}
                      alt={video.title}
                    />
                    <div className="absolute bottom-0 right-0 bg-black text-white text-xs px-1 rounded">
                      {convertDurationToTimeString(video.durationSeconds)}
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
                        {convertReleaseDateToTimeSinceRelease(
                          video.releaseDate
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="checkbox checkbox-lg mr-6"
                  checked={video.selected}
                  onChange={(e) => {
                    setVideos(
                      videos.map((mapVideo) =>
                        mapVideo.id === video.id
                          ? { ...mapVideo, selected: e.target.checked }
                          : mapVideo
                      )
                    );
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
