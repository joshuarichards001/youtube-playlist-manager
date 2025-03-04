import useStore from "../helpers/store";
import { useEffect, useState } from "react";
import {
  addVideosToPlaylistAPI,
  deleteVideosFromPlaylistAPI,
  fetchPlaylistsAPI,
  createPlaylistAPI,
} from "../helpers/youtubeAPI";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const setNextPageToken = useStore((state) => state.setNextPageToken);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const setSelectedPlaylist = useStore((state) => state.setSelectedPlaylist);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");

  useEffect(() => {
    if (accessToken) {
      try {
        fetchPlaylistsAPI(accessToken).then((playlists) => {
          setPlaylists(playlists);

          const pathParts = window.location.pathname.split("/");
          const playlistId = pathParts[1];
          const selected =
            playlists.find((p) => p.id === playlistId) || playlists[0];

          setSelectedPlaylist(selected);
        });
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    }
  }, [accessToken, setPlaylists, setSelectedPlaylist]);

  const handleDrop = async (e: React.DragEvent, targetPlaylistId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!accessToken) return;

    const data = JSON.parse(e.dataTransfer.getData("video"));
    const { videoId, sourcePlaylistId, videoItemId } = data;

    if (sourcePlaylistId === targetPlaylistId) return;

    const previousVideos = useStore.getState().videos;
    const updatedVideos = previousVideos.filter(
      (video) => video.id !== videoItemId
    );
    setVideos(updatedVideos);

    try {
      await Promise.all([
        addVideosToPlaylistAPI(accessToken, [videoId], targetPlaylistId),
        deleteVideosFromPlaylistAPI(accessToken, [videoItemId]),
      ]);

      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === sourcePlaylistId) {
          return { ...playlist, videoCount: playlist.videoCount - 1 };
        } else if (playlist.id === targetPlaylistId) {
          return { ...playlist, videoCount: playlist.videoCount + 1 };
        }
        return playlist;
      });
      setPlaylists(updatedPlaylists);
    } catch (error) {
      console.error("Error moving video:", error);
      setVideos(previousVideos);
    }
  };

  const handleDragOver = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault();
    setDragOverId(playlistId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const truncateTitle = (title: string, maxLength: number) => {
    return title.length > maxLength
      ? title.substring(0, maxLength) + "..."
      : title;
  };

  const createPlaylist = async () => {
    if (!accessToken || !newPlaylistName.trim()) {
      console.error("No access token or playlist name provided.");
      return;
    }

    try {
      await createPlaylistAPI(accessToken, newPlaylistName);
      window.location.reload();
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  return (
    <>
      {playlists.length > 0 && (
        <ul className="min-w-80 bg-base-200 gap-1 p-4 overflow-y-auto">
          {playlists.map((playlist) => (
            <li
              key={playlist.id}
              onDrop={(e) => handleDrop(e, playlist.id)}
              onDragOver={(e) => handleDragOver(e, playlist.id)}
              onDragLeave={handleDragLeave}
              className={
                dragOverId === playlist.id ? "bg-primary/50 rounded-lg" : ""
              }
            >
              <button
                className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base flex flex-row justify-between items-baseline ${
                  selectedPlaylist?.id === playlist.id ? "bg-neutral/10" : ""
                }`}
                onClick={() => {
                  setVideos([]);
                  setNextPageToken(null);
                  setSelectedPlaylist(playlist);
                }}
              >
                <p>{truncateTitle(playlist.title, 20)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-base-content/70">
                    {playlist.videoCount} videos
                  </p>
                </div>
              </button>
            </li>
          ))}
          <div className="divider my-3"></div>
          <li className="flex flex-row items-center gap-2 mt-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              placeholder="Create New Playlist..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={createPlaylist}>
              Create
            </button>
          </li>
        </ul>
      )}
    </>
  );
}
