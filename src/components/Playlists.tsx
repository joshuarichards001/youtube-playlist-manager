import { useEffect, useState } from "react";
import { createPlaylistAPI, fetchPlaylistsAPI } from "../helpers/playlistAPI";
import useStore from "../helpers/store";
import { addVideosToPlaylistAPI, deleteVideosFromPlaylistAPI } from "../helpers/videoAPI";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const selectedPlaylist = currentView.type === 'playlist' ? currentView.playlist : null;
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");

  useEffect(() => {
    if (accessToken) {
      try {
        fetchPlaylistsAPI(accessToken).then((playlists) => {
          setPlaylists(playlists);

          const pathParts = window.location.pathname.split("/").filter(Boolean);
          const routeType = pathParts[0];
          const routeId = pathParts[1];

          // Only set playlist view if URL explicitly requests a playlist
          if (routeType === 'playlist' && routeId) {
            const selected = playlists.find((p) => p.id === routeId);
            if (selected) {
              setCurrentView({ type: 'playlist', playlist: selected });
            }
          }
          // If no route or root path, default to feed (handled in Subscriptions.tsx)
        });
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    }
  }, [accessToken, setPlaylists, setCurrentView]);

  const handleDrop = async (e: React.DragEvent, targetPlaylistId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!accessToken) return;

    const data = JSON.parse(e.dataTransfer.getData("video"));
    const { videoId, sourcePlaylistId, videoItemId } = data;

    if (sourcePlaylistId === targetPlaylistId) return;

    const previousVideos = useStore.getState().videos;
    const isFromPlaylist = !!sourcePlaylistId;

    if (isFromPlaylist) {
      const updatedVideos = previousVideos.filter(
        (video) => video.id !== videoItemId
      );
      setVideos(updatedVideos);
    }

    try {
      if (isFromPlaylist) {
        await Promise.all([
          addVideosToPlaylistAPI(accessToken, [videoId], targetPlaylistId),
          deleteVideosFromPlaylistAPI(accessToken, [videoItemId]),
        ]);
      } else {
        await addVideosToPlaylistAPI(accessToken, [videoId], targetPlaylistId);
      }

      const updatedPlaylists = playlists.map((playlist) => {
        if (isFromPlaylist && playlist.id === sourcePlaylistId) {
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
    <div className="flex flex-col flex-1 p-4 overflow-hidden">
      <h2 className="text-lg font-semibold mb-2">Playlists</h2>
      {playlists.length > 0 && (
        <ul className="gap-1 flex-1 overflow-y-auto">
          {[...playlists].sort((a, b) => a.title.localeCompare(b.title)).map((playlist) => (
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
                className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base flex flex-row justify-between items-baseline ${selectedPlaylist?.id === playlist.id ? "bg-neutral/10" : ""
                  }`}
                onClick={() => {
                  setCurrentView({ type: 'playlist', playlist });
                  const url = new URL(window.location.href);
                  url.pathname = `/playlist/${playlist.id}`;
                  window.history.pushState({}, "", url.toString());
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
        </ul>
      )}
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
    </div>
  );
}
