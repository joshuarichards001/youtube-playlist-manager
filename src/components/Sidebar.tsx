import useStore from "../helpers/store";
import Playlists from "./Playlists";
import Subscriptions from "./Subscriptions";

export default function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);

  return (
    <aside
      className={`bg-base-200 flex-col overflow-hidden md:flex md:w-80 md:min-w-80 ${sidebarOpen ? "flex w-full" : "hidden"
        }`}
    >
      <Subscriptions />
      <div className="divider my-0 mx-4"></div>
      <Playlists />
    </aside>
  );
}
