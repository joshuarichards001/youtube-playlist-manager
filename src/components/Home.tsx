import Videos from "./Videos";
import Playlists from "./Playlists";
import useStore from "../helpers/store";
import { useEffect } from "react";
import { fetchUserAPI } from "../helpers/youtubeAPI";

export default function Home() {
  const accessToken = useStore((state) => state.accessToken);
  const setUser = useStore((state) => state.setUser);

  useEffect(() => {
    if (!accessToken) return;

    fetchUserAPI(accessToken).then((user) => {
      if (!user) return;

      setUser(user);
    });
  }, [accessToken, setUser]);

  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col p-10">
        <Videos />
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
  );
}
