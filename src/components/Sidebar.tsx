import { useEffect } from "react";
import useStore from "../helpers/store";
import Playlists from "./Playlists";

export default function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setVideoViewerPip = useStore((state) => state.setVideoViewerPip);

  const isFeed = currentView.type === "feed";
  const isSubscriptions = currentView.type === "subscriptions";

  useEffect(() => {
    let startX: number | null = null;
    let startY: number | null = null;
    let startedOpen = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startedOpen = useStore.getState().sidebarOpen;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const startLeftEdge = startX;

      startX = null;
      startY = null;

      if (Math.abs(deltaX) < Math.abs(deltaY)) return;

      const threshold = 60;
      if (!startedOpen && startLeftEdge < 40 && deltaX > threshold) {
        setSidebarOpen(true);
      } else if (startedOpen && deltaX < -threshold) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [setSidebarOpen]);

  return (
    <aside
      className={`bg-base-200 flex-col overflow-y-auto md:flex md:static md:inset-auto md:z-auto md:w-80 md:min-w-80 md:h-auto ${sidebarOpen ? "fixed inset-0 z-50 flex w-full h-full" : "hidden"
        }`}
    >
      <div className="flex md:hidden justify-end px-2 pt-2">
        <button
          className="btn btn-ghost btn-square"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="px-4 pt-4 md:pt-4 flex flex-col gap-1">
        <button
          className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base text-left font-semibold ${isFeed ? "bg-neutral/10" : ""}`}
          onClick={() => {
            setCurrentView({ type: "feed" });
            setSidebarOpen(false);
            if (window.innerWidth < 768 && viewingVideo) setVideoViewerPip(true);
            const url = new URL(window.location.href);
            url.pathname = "/feed";
            window.history.pushState({}, "", url.toString());
          }}
        >
          Recent Feed
        </button>
        <button
          className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base text-left font-semibold ${isSubscriptions ? "bg-neutral/10" : ""}`}
          onClick={() => {
            setCurrentView({ type: "subscriptions" });
            setSidebarOpen(false);
            if (window.innerWidth < 768 && viewingVideo) setVideoViewerPip(true);
            const url = new URL(window.location.href);
            url.pathname = "/subscriptions";
            window.history.pushState({}, "", url.toString());
          }}
        >
          Subscriptions
        </button>
      </div>
      <div className="divider my-0 mx-4"></div>
      <Playlists />
    </aside>
  );
}
