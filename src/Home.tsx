import Videos from "./Videos";
import useStore from "./store";
import LoginButton from "./LoginButton";
import Playlists from "./Playlists";

export default function Home() {
  const selectedPlaylist = useStore((state) => state.selectedPlaylist);

  return (
    <>
      <div className="drawer lg:drawer-open">
        <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col p-10">
          <LoginButton />
          {selectedPlaylist && (
            <Videos playlistName={selectedPlaylist.title} />
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
