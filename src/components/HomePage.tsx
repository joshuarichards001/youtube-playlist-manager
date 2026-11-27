import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { pathForView, viewForPath } from "../helpers/routes";
import useStore from "../helpers/store";
import { fetchVideoByIdAPI } from "../helpers/youtubeAPI/videoAPI";
import Nav from "./Nav";
import Sidebar from "./Sidebar";
import History from "./History";
import Search from "./Search";
import Subscriptions from "./Subscriptions";
import RecentFeed, { FeedRefreshBar } from "./RecentFeed";
import StaticFeed from "./StaticFeed";
import VideoViewer from "./VideoViewer";
import Videos from "./Videos";

export default function HomePage() {
  const playlists = useStore((state) => state.playlists);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const videoViewerPip = useStore((state) => state.videoViewerPip);
  const setVideoViewerPip = useStore((state) => state.setVideoViewerPip);
  const [videoViewerExpanded, setVideoViewerExpanded] = useState(false);
  // The store's initial (default) view and playlists. While currentView is still
  // the default, the route in the URL hasn't been applied yet (a playlist route
  // waits for playlists to load), so the URL sync below leaves the path alone.
  const initialViewRef = useRef(currentView);
  const initialPlaylistsRef = useRef(playlists);
  // Id from ?v= that is being loaded; the URL sync leaves ?v= alone meanwhile.
  const restoringVideoIdRef = useRef<string | null>(null);
  const lastViewingVideoRef = useRef(viewingVideo);

  const restoreVideo = useCallback((videoId: string) => {
    restoringVideoIdRef.current = videoId;
    const { accessToken, videos } = useStore.getState();
    const local = videos.find((v) => v.resourceId === videoId);
    const load = local
      ? Promise.resolve(local)
      : accessToken
        ? fetchVideoByIdAPI(accessToken, videoId)
        : Promise.resolve(null);

    load.then((video) => {
      // Superseded by another navigation or the user opening a different video.
      if (restoringVideoIdRef.current !== videoId) return;
      restoringVideoIdRef.current = null;
      if (video) {
        useStore.getState().setViewingVideo(video);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("v");
        window.history.replaceState({}, "", url.toString());
      }
    });
  }, []);

  // Apply the route from the URL on load.
  useEffect(() => {
    const { playlists, subscriptions } = useStore.getState();
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId) restoreVideo(videoId);

    const view = viewForPath(window.location.pathname, playlists, subscriptions);
    if (!view) return; // playlist route: applied once playlists load

    const path = pathForView(view);
    if (path && path !== window.location.pathname) {
      const url = new URL(window.location.href);
      url.pathname = path;
      window.history.replaceState({}, "", url.toString());
    }
    setCurrentView(view);
  }, [setCurrentView, restoreVideo]);

  // Playlist routes can only be resolved once playlists have loaded.
  useEffect(() => {
    if (playlists === initialPlaylistsRef.current) return;
    if (useStore.getState().currentView !== initialViewRef.current) return;

    const { subscriptions } = useStore.getState();
    const view = viewForPath(window.location.pathname, playlists, subscriptions);
    if (!view) {
      const url = new URL(window.location.href);
      url.pathname = "/feed";
      window.history.replaceState({}, "", url.toString());
    }
    setCurrentView(view ?? { type: "feed" });
  }, [playlists, setCurrentView]);

  // Back/forward: restore the view and video from the URL.
  useEffect(() => {
    const onPopState = () => {
      const state = useStore.getState();
      state.setSidebarOpen(false);

      const pathChanged = pathForView(state.currentView) !== window.location.pathname;
      if (pathChanged) {
        let view = viewForPath(window.location.pathname, state.playlists, state.subscriptions);
        if (!view) {
          const url = new URL(window.location.href);
          url.pathname = "/feed";
          window.history.replaceState({}, "", url.toString());
          view = { type: "feed" };
        }
        state.setCurrentView(view);
      }

      const videoId = new URLSearchParams(window.location.search).get("v");
      if (!videoId) {
        restoringVideoIdRef.current = null;
        if (state.viewingVideo) {
          state.setViewingVideo(null);
          state.setVideoViewerPip(false);
          setVideoViewerExpanded(false);
        }
      } else if (state.viewingVideo?.resourceId !== videoId) {
        restoreVideo(videoId);
      } else if (pathChanged && window.innerWidth < 768) {
        // Same as picking a view from the sidebar: keep the video playing in pip.
        state.setVideoViewerPip(true);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [restoreVideo]);

  // Keep the URL in sync with the current view and video, as a single history
  // entry per change. No-op when the URL already matches (e.g. after popstate).
  useEffect(() => {
    if (lastViewingVideoRef.current !== viewingVideo) {
      lastViewingVideoRef.current = viewingVideo;
      restoringVideoIdRef.current = null;
    }

    const url = new URL(window.location.href);
    const path = currentView === initialViewRef.current ? null : pathForView(currentView);
    if (path) url.pathname = path;
    if (!restoringVideoIdRef.current) {
      if (viewingVideo) {
        url.searchParams.set("v", viewingVideo.resourceId);
      } else {
        url.searchParams.delete("v");
      }
    }
    if (url.href !== window.location.href) {
      window.history.pushState({}, "", url.toString());
    }
  }, [currentView, viewingVideo]);

  const handleClose = () => {
    setViewingVideo(null);
    setVideoViewerExpanded(false);
    setVideoViewerPip(false);
  };

  const handleExpandToggle = () => {
    setVideoViewerPip(false);
    setVideoViewerExpanded((e) => !e);
  };

  const handlePipToggle = () => {
    setVideoViewerExpanded(false);
    setVideoViewerPip(!videoViewerPip);
  };

  // Navigating to a channel from the viewer has to reveal the channel list: drop
  // out of full screen into the split layout, or into pip below the xl breakpoint
  // where the viewer covers the whole pane instead of splitting it.
  const handleChannelNavigate = () => {
    setVideoViewerExpanded(false);
    if (!window.matchMedia("(min-width: 1280px)").matches) {
      setVideoViewerPip(true);
    }
  };

  const renderMain = () => {
    if (currentView.type === "feed")
      return <RecentFeed />;
    if (currentView.type === "recommended")
      return <StaticFeed title="Recommended" src="/recommended-feed.json" />;
    if (currentView.type === "subscriptions") return <Subscriptions />;
    if (currentView.type === "search") return <Search />;
    if (currentView.type === "history") return <History />;
    return <Videos />;
  };

  return (
    <main className="h-screen flex flex-col">
      <Nav />
      <FeedRefreshBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {(!viewingVideo || !videoViewerExpanded || videoViewerPip) && (
          // Remount per route so each view starts scrolled to the top.
          <Fragment key={pathForView(currentView) ?? "none"}>{renderMain()}</Fragment>
        )}
        {viewingVideo && (
          <VideoViewer
            video={viewingVideo}
            onClose={handleClose}
            expanded={videoViewerExpanded}
            onExpandToggle={handleExpandToggle}
            pip={videoViewerPip}
            onPipToggle={handlePipToggle}
            onChannelNavigate={handleChannelNavigate}
          />
        )}
      </div>
    </main>
  )
}