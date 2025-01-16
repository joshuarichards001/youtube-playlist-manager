import { useState } from "react";
import Videos from "./Videos";
import axios from "axios";

type Props = {
  playlists: Playlist[];
  accessToken: string | null;
};

export default function Playlists({ playlists, accessToken }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  );

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
      console.log("Fetched videos:", result.data.items);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  return (
    <>
      <div className="drawer lg:drawer-open">
        <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col p-10">
          {selectedPlaylist && (
            <Videos
              playlistName={selectedPlaylist.snippet.title}
              videos={videos}
            />
          )}
          <label
            htmlFor="my-drawer-2"
            className="btn btn-primary drawer-button lg:hidden"
          >
            Open drawer
          </label>
        </div>
        <div className="drawer-side">
          <label
            htmlFor="my-drawer-2"
            aria-label="close sidebar"
            className="drawer-overlay"
          ></label>
          {playlists.length > 0 && (
            <ul className="menu gap-1 bg-base-200 text-base-content min-h-full w-80 p-4">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button className="text-base" onClick={() => fetchVideos(playlist)}>
                    {playlist.snippet.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
