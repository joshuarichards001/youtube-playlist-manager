import Playlists from "./Playlists";
import Subscriptions from "./Subscriptions";

export default function Sidebar() {
  return (
    <aside className="min-w-96 bg-base-200 flex flex-col overflow-hidden">
      <Subscriptions />
      <div className="divider my-0 mx-4"></div>
      <Playlists />
    </aside>
  );
}
