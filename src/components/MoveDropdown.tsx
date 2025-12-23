import { useState } from "react";
import useStore from "../helpers/store";
import {
  addVideosToPlaylistAPI,
  deleteVideosFromPlaylistAPI,
} from "../helpers/videoAPI";

export default function MoveDropdown() {
  const [loading, setLoading] = useState(false);
  const playlists = useStore((state) => state.playlists);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const currentView = useStore((state) => state.currentView);

  const selectedPlaylist = currentView.type === 'playlist' ? currentView.playlist : null;
  const filteredPlaylists = playlists.filter(
    (playlist) => playlist.id !== selectedPlaylist?.id
  );
  const accessToken = useStore((state) => state.accessToken);
  const videos = useStore((state) => state.videos);
  const setVideos = useStore((state) => state.setVideos);
  const selectedVideos = videos.filter((video) => video.selected);

  const handleMove = async (playlistId: string) => {
    if (!accessToken) return;

    setLoading(true);

    const videoItemIds = selectedVideos.map((video) => video.id);
    const videoResourceIds = selectedVideos.map((video) => video.resourceId);

    await Promise.all([
      await addVideosToPlaylistAPI(accessToken, videoResourceIds, playlistId),
      await deleteVideosFromPlaylistAPI(accessToken, videoItemIds),
    ]);

    const updatedVideos = videos.filter(
      (video) => !videoItemIds.includes(video.id)
    );
    setVideos(updatedVideos);

    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          videoCount: playlist.videoCount + selectedVideos.length,
        };
      } else if (playlist.id === selectedPlaylist?.id) {
        return {
          ...playlist,
          videoCount: playlist.videoCount - selectedVideos.length,
        };
      }

      return playlist;
    });
    setPlaylists(updatedPlaylists);

    setLoading(false);
  };

  return (
    <div className="relative">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="loading loading-spinner text-white"></div>
        </div>
      )}
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-neutral">
          Move To
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-200 rounded-box z-[1] w-52 p-2 shadow"
        >
          {filteredPlaylists.map((playlist) => (
            <li key={playlist.id}>
              <button onClick={() => handleMove(playlist.id)}>
                {playlist.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
