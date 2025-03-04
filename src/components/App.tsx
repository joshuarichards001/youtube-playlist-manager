import { useEffect } from "react";
import useStore from "../helpers/store";
import LandingPage from "./LandingPage";
import Nav from "./Nav";
import { fetchUserAPI } from "../helpers/youtubeAPI";
import Playlists from "./Playlists";
import Videos from "./Videos";

const App = () => {
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
    <main className="h-screen flex flex-col">
      <Nav />
      {accessToken ? (
        <div className="flex flex-1 overflow-hidden">
          <Playlists />
          <Videos />
        </div>
      ) : (
        <LandingPage />
      )}
    </main>
  );
};

export default App;
