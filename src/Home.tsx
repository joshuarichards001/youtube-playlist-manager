import { useEffect } from "react";
import Videos from "./Videos";
import useStore from "./store";
import LoginButton from "./LoginButton";
import Playlists from "./Playlists";
import { fetchPlaylistsAPI } from "./youtubeAPI";

export default function Home() {
  const setPlaylists = useStore((state) => state.setPlaylists);
  const accessToken = useStore((state) => state.accessToken);
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);

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

  return (
    <>
      <div className="drawer lg:drawer-open">
        <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col p-10">
          <LoginButton />
          {selectedPlaylist && (
            <Videos playlistName={selectedPlaylist.snippet.title} />
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
          <Playlists />
        </div>
      </div>
    </>
  );
}
