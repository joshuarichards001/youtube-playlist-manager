import Nav from "./Nav";
import Playlists from "./Playlists";
import Videos from "./Videos";

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 overflow-hidden">
        <Playlists />
        <Videos />
      </div>
    </main>
  )
}