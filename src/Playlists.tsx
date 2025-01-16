import useStore from "./store";
import { useEffect, useState } from "react";
import {
  addVideoToPlaylistAPI,
  deleteVideoFromPlaylistAPI,
  fetchPlaylistsAPI,
  fetchVideosAPI,
} from "./youtubeAPI";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const setSelectedPlaylist = useStore((state) => state.setSelectedPlaylist);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      try {
        fetchPlaylistsAPI(accessToken).then((playlists) =>
          setPlaylists(playlists)
        );
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    }
  }, [accessToken, setPlaylists]);

  const fetchVideos = async (playlist: Playlist) => {
    if (!accessToken) {
      console.error("No access token available.");
      return;
    }

    try {
      setSelectedPlaylist(playlist);
      const videos = await fetchVideosAPI(accessToken, playlist);
      setVideos(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

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
        addVideoToPlaylistAPI(accessToken, videoId, targetPlaylistId),
        deleteVideoFromPlaylistAPI(accessToken, videoItemId),
      ]);
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
                  selectedPlaylist?.id === playlist.id ? "bg-neutral" : ""
                }`}
                onClick={() => fetchVideos(playlist)}
              >
                <p>{playlist.title}</p>
                <p className="text-xs text-base-content/70">
                  {playlist.videoCount} videos
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
