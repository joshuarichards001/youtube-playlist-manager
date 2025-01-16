import { useState } from "react";
import LoginButton from "./LoginButton";
import Playlists from "./Playlists";
import Nav from "./Nav";

const App = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  return (
    <main>
      <Nav />
      <section>
        {!accessToken && (
          <LoginButton
            setAccessToken={setAccessToken}
            setPlaylists={setPlaylists}
          />
        )}
        <Playlists playlists={playlists} accessToken={accessToken} />
      </section>
    </main>
  );
};

export default App;
