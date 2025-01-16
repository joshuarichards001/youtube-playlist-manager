import axios from "axios";
import useStore from "./store";
import { useState } from "react";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const setSelectedPlaylist = useStore((state) => state.setSelectedPlaylist);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const fetchVideos = async (playlist: Playlist) => {
    if (!accessToken) {
      console.error("No access token available.");
      return;
    }

    try {
      const result = await axios.get(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            part: "snippet",
            playlistId: playlist.id,
            maxResults: 100,
          },
        }
      );
      setSelectedPlaylist(playlist);
      setVideos(result.data.items);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetPlaylistId: string) => {
    e.preventDefault();
    setDragOverId(null);

    const data = JSON.parse(e.dataTransfer.getData("video"));
    const { videoId, sourcePlaylistId, videoItemId } = data;

    if (sourcePlaylistId === targetPlaylistId) return;

    const previousVideos = useStore.getState().videos;
    const updatedVideos = previousVideos.filter(
      (video) => video.id !== videoItemId
    );
    setVideos(updatedVideos);

    try {
      // Add video to target playlist
      await axios.post(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          snippet: {
            playlistId: targetPlaylistId,
            resourceId: {
              kind: "youtube#video",
              videoId: videoId,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          params: {
            part: "snippet",
          },
        }
      );

      // Remove video from source playlist
      await axios.delete(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            id: videoItemId,
          },
        }
      );
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
                className={`text-base ${
                  selectedPlaylist?.id === playlist.id ? "bg-neutral" : ""
                }`}
                onClick={() => fetchVideos(playlist)}
              >
                {playlist.snippet.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
