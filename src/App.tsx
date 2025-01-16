import LoginButton from "./LoginButton";
import Playlists from "./Playlists";
import Nav from "./Nav";

const App = () => {
  return (
    <main>
      <Nav />
      <section>
        <LoginButton />
        <Playlists />
      </section>
    </main>
  );
};

export default App;
