import useStore from "../helpers/store";
import Playlists from "./Playlists";
import Subscriptions from "./Subscriptions";

export default function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);

  const isFeed = currentView.type === "feed";

  return (
    <aside
      className={`bg-base-200 flex-col overflow-hidden md:flex md:w-80 md:min-w-80 ${sidebarOpen ? "flex w-full" : "hidden"
        }`}
    >
      <div className="px-4 pt-4">
        <button
          className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base text-left font-semibold ${isFeed ? "bg-neutral/10" : ""}`}
          onClick={() => {
            setCurrentView({ type: "feed" });
            setSidebarOpen(false);
            const url = new URL(window.location.href);
            url.pathname = "/feed";
            window.history.pushState({}, "", url.toString());
          }}
        >
          Recent Feed
        </button>
      </div>
      <div className="divider my-0 mx-4"></div>
      <Subscriptions />
      <div className="divider my-0 mx-4"></div>
      <Playlists />
    </aside>
  );
}
