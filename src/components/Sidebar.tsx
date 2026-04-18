import useStore from "../helpers/store";
import Playlists from "./Playlists";
import Subscriptions from "./Subscriptions";

export default function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`bg-base-200 flex flex-col overflow-hidden fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-200 md:relative md:translate-x-0 md:min-w-80 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <Subscriptions />
        <div className="divider my-0 mx-4"></div>
        <Playlists />
      </aside>
    </>
  );
}
