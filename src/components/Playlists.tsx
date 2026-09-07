import { useEffect, useState } from "react";
import useStore from "../helpers/store";
import { addVideosToPlaylistAPI, deleteVideosFromPlaylistAPI } from "../helpers/youtubeAPI/videoAPI";
import { createPlaylistAPI, fetchPlaylistsAPI, fetchSavedPlaylistsAPI } from "../helpers/youtubeAPI/playlistAPI";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const savedPlaylists = useStore((state) => state.savedPlaylists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const setSavedPlaylists = useStore((state) => state.setSavedPlaylists);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setVideoViewerPip = useStore((state) => state.setVideoViewerPip);

  const selectedPlaylist = currentView.type === 'playlist' ? currentView.playlist : null;
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");

  useEffect(() => {
    if (accessToken) {
      try {
        fetchPlaylistsAPI(accessToken).then(async (playlists) => {
          setPlaylists(playlists);

          const pathParts = window.location.pathname.split("/").filter(Boolean);
          const routeType = pathParts[0];
          const routeId = pathParts[1];
          const isPlaylistRoute = routeType === 'playlist' && !!routeId;

          if (isPlaylistRoute) {
            const selected = playlists.find((p) => p.id === routeId);
            if (selected) {
              setCurrentView({ type: 'playlist', playlist: selected });
            }
          }

          const saved = await fetchSavedPlaylistsAPI(
            accessToken,
            playlists.map((p) => p.id)
          );
          setSavedPlaylists(saved);

          if (isPlaylistRoute && !playlists.some((p) => p.id === routeId)) {
            const selected = saved.find((p) => p.id === routeId);
            if (selected) {
              setCurrentView({ type: 'playlist', playlist: selected });
            }
          }
        });
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    }
  }, [accessToken, setPlaylists, setSavedPlaylists, setCurrentView]);

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

  const openPlaylist = (playlist: Playlist) => {
    setCurrentView({ type: 'playlist', playlist });
    setSidebarOpen(false);
    if (window.innerWidth < 768 && viewingVideo) setVideoViewerPip(true);
    const url = new URL(window.location.href);
    url.pathname = `/playlist/${playlist.id}`;
    window.history.pushState({}, "", url.toString());
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

  const sortedPlaylists = [...playlists].sort((a, b) => {
    const pinnedId = "PLJNJKH0ZCMnnakxI-Gg8onlbwQNiNEgOp";
    if (a.id === pinnedId) return -1;
    if (b.id === pinnedId) return 1;
    return a.title.localeCompare(b.title);
  });

  const sortedSavedPlaylists = [...savedPlaylists].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <div className="flex flex-col flex-1 p-4 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Playlists</h2>
        {sortedPlaylists.length > 0 && (
          <ul className="gap-1">
            {sortedPlaylists.map((playlist) => (
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
                  onClick={() => openPlaylist(playlist)}
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
        {sortedSavedPlaylists.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-2 mt-4">Saved Playlists</h2>
            <ul className="gap-1">
              {sortedSavedPlaylists.map((playlist) => (
                // Saved playlists belong to someone else, so they can't take a
                // dropped video the way the user's own playlists can.
                <li key={playlist.id}>
                  <button
                    className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base flex flex-row justify-between items-baseline gap-2 ${selectedPlaylist?.id === playlist.id ? "bg-neutral/10" : ""
                      }`}
                    onClick={() => openPlaylist(playlist)}
                  >
                    <span className="flex flex-col items-start min-w-0">
                      <p>{truncateTitle(playlist.title, 20)}</p>
                      {playlist.channelTitle && (
                        <p className="text-xs text-base-content/70">
                          {truncateTitle(playlist.channelTitle, 22)}
                        </p>
                      )}
                    </span>
                    <p className="text-xs text-base-content/70 flex-shrink-0">
                      {playlist.videoCount} videos
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="flex flex-row items-center gap-2 mt-2">
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
      </div>
    </div>
  );
}
