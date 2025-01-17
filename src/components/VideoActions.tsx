import useStore from "../helpers/store";
import SortDropdown from "./SortDropdown";

export default function VideoActions() {
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const selectedVideos = videos.filter((video) => video.selected);

  const handleSelectAll = () => {
    const updatedVideos = videos.map((video) => ({
      ...video,
      selected: true,
    }));

    setVideos(updatedVideos);
  };

  const handleDeselectAll = () => {
    const updatedVideos = videos.map((video) => ({
      ...video,
      selected: false,
    }));

    setVideos(updatedVideos);
  };

  return (
    <div className="flex flex-row gap-4">
      {videos.length !== selectedVideos.length && (
        <button className="btn btn-neutral" onClick={handleSelectAll}>
          Select All
        </button>
      )}
      {selectedVideos.length > 0 && (
        <button className="btn btn-neutral" onClick={handleDeselectAll}>
          Deselect All
        </button>
      )}
      {selectedVideos.length > 0 && (
        <button className="btn btn-error">
          Delete ({selectedVideos.length} selected)
        </button>
      )}
      {selectedVideos.length === 0 && <SortDropdown />}
    </div>
  );
}
