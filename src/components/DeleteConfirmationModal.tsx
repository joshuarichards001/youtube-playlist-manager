import { useState } from "react";
import useStore from "../helpers/store";
import { deleteVideosFromPlaylistAPI } from "../helpers/youtubeAPI";

export default function DeleteConfirmationModal() {
  const [loading, setLoading] = useState(false);
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const selectedVideos = videos.filter((video) => video.selected);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const playlists = useStore((state) => state.playlists);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const accessToken = useStore((state) => state.accessToken);

  const handleDelete = async () => {
    if (!selectedPlaylist || !accessToken) return;

    setLoading(true);
    const videoIds = selectedVideos.map((video) => video.id);
    await deleteVideosFromPlaylistAPI(accessToken, videoIds);
    const updatedVideos = videos.filter(
      (video) => !videoIds.includes(video.id)
    );
    setVideos(updatedVideos);

    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === selectedPlaylist.id) {
        return {
          ...playlist,
          videoCount: playlist.videoCount - selectedVideos.length,
        };
      }

      return playlist;
    });
    setPlaylists(updatedPlaylists);

    setLoading(false);
    (
      document.getElementById("delete-confirmation-modal") as HTMLDialogElement
    ).close();
  };

  return (
    <dialog id="delete-confirmation-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          Are you sure you want to delete these {selectedVideos.length} videos
          from the {selectedPlaylist?.title} playlist?
        </h3>
        <p className="py-4">This action can't be undone!</p>
        <div className="flex flex-row gap-4">
          <button
            onClick={handleDelete}
            className="btn btn-error"
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner"></span>}
            Delete
          </button>
          <button
            className="btn btn-neutral"
            disabled={loading}
            onClick={() =>
              (
                document.getElementById(
                  "delete-confirmation-modal"
                ) as HTMLDialogElement
              ).close()
            }
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
