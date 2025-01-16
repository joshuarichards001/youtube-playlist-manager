import axios from "axios";
import useStore from "./store";

export default function Playlists() {
  const playlists = useStore((state) => state.playlists);
  const accessToken = useStore((state) => state.accessToken);
  const setVideos = useStore((state) => state.setVideos);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);
  const setSelectedPlaylist = useStore((state) => state.setSelectedPlaylist);

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

  return (
    <>
      {playlists.length > 0 && (
        <ul className="menu gap-1 bg-base-200 text-base-content min-h-full w-80 p-4">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
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
