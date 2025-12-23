import Nav from "./Nav";
import Sidebar from "./Sidebar";
import Videos from "./Videos";

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Videos />
      </div>
    </main>
  )
}