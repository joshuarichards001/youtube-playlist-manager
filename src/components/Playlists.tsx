import useStore from "../helpers/store";
import { useCallback, useEffect, useState } from "react";
import {
  addVideosToPlaylistAPI,
  deletePlaylistAPI,
  deleteVideosFromPlaylistAPI,
  fetchPlaylistsAPI,
  fetchVideosAPI,
  createPlaylistAPI,
} from "../helpers/youtubeAPI";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const setSelectedPlaylist = useStore((state) => state.setSelectedPlaylist);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");

  const fetchVideos = useCallback(
    async (playlist: Playlist) => {
      if (!accessToken) {
        console.error("No access token available.");
        return;
      }

      try {
        setSelectedPlaylist(playlist);
        const videos = await fetchVideosAPI(accessToken, playlist);
        setVideos(videos);
        const url = new URL(window.location.href);
        url.pathname = `/${playlist.id}`;
        window.history.pushState({}, "", url.toString());
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    },
    [accessToken, setSelectedPlaylist, setVideos]
  );

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
          fetchVideos(selected);
        });
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    }
  }, [accessToken, setPlaylists, setSelectedPlaylist, fetchVideos]);

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

  const deletePlaylist = async (id: string) => {
    if (!accessToken) {
      console.error("No access token available.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this playlist?"
    );

    if (confirmDelete) {
      try {
        await deletePlaylistAPI(accessToken, id);
        window.location.reload();
      } catch (error) {
        console.error("Error deleting playlist:", error);
      }
    }
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
        <ul className="menu gap-1 bg-base-200 text-base-content min-h-full w-80 p-4">
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
                className={`text-base flex flex-row justify-between items-baseline ${
                  selectedPlaylist?.id === playlist.id ? "bg-neutral/10" : ""
                }`}
                onClick={() => fetchVideos(playlist)}
              >
                <p>{truncateTitle(playlist.title, 20)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-base-content/70">
                    {playlist.videoCount} videos
                  </p>
                  {selectedPlaylist?.id === playlist.id && (
                    <button
                      className="btn btn-error btn-xs"
                      onClick={() => deletePlaylist(playlist.id)}
                    >
                      x
                    </button>
                  )}
                </div>
              </button>
            </li>
          ))}
          <li className="flex flex-row items-center gap-2 pl-4">
            <input
              type="text"
              className="input input-bordered input-sm"
              placeholder="New Playlist Name"
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
