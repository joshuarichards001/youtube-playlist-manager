import useStore from "../helpers/store";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import MoveDropdown from "./MoveDropdown";
import SortDropdown from "./SortDropdown";

export default function VideoActions() {
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const gridView = useStore((state) => state.gridView);
  const setGridView = useStore((state) => state.setGridView);
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

  const handleDelete = () => {
    const modal = document.getElementById(
      "delete-confirmation-modal"
    ) as HTMLDialogElement;

    if (modal) {
      modal.showModal();
    }
  };

  return (
    <div className="flex flex-row flex-wrap gap-2 md:gap-4">
      {selectedVideos.length > 0 && <MoveDropdown />}
      {videos.length !== selectedVideos.length && (
        <button className="btn btn-sm md:btn-md btn-neutral" onClick={handleSelectAll}>
          Select All
        </button>
      )}
      {selectedVideos.length > 0 && (
        <button className="btn btn-sm md:btn-md btn-neutral" onClick={handleDeselectAll}>
          Deselect All
        </button>
      )}
      {selectedVideos.length > 0 && (
        <button className="btn btn-sm md:btn-md btn-error" onClick={handleDelete}>
          Delete ({selectedVideos.length})
        </button>
      )}
      {selectedVideos.length === 0 && <SortDropdown />}
      {selectedVideos.length === 0 && (
        <button
          className={`btn btn-sm md:btn-md btn-square ${gridView ? "btn-primary" : "btn-neutral"}`}
          onClick={() => setGridView(!gridView)}
          title={gridView ? "List view" : "Grid view"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
          </svg>
        </button>
      )}
      <DeleteConfirmationModal />
    </div>
  );
}
