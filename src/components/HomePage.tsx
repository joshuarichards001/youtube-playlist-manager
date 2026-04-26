import { useEffect, useRef, useState } from "react";
import useStore from "../helpers/store";
import { fetchVideoByIdAPI } from "../helpers/youtubeAPI/videoAPI";
import Nav from "./Nav";
import Sidebar from "./Sidebar";
import Subscriptions from "./Subscriptions";
import SubscriptionFeed from "./SubscriptionFeed";
import VideoViewer from "./VideoViewer";
import Videos from "./Videos";

export default function HomePage() {
  const accessToken = useStore((state) => state.accessToken);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const videoViewerPip = useStore((state) => state.videoViewerPip);
  const setVideoViewerPip = useStore((state) => state.setVideoViewerPip);
  const [videoViewerExpanded, setVideoViewerExpanded] = useState(false);
  const hydratedFromUrlRef = useRef(false);
  const skipNextUrlSyncRef = useRef(true);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const routeType = pathParts[0];
    const routeId = pathParts[1];

    if (!routeType) {
      const url = new URL(window.location.href);
      url.pathname = "/feed";
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (routeType === "subscriptions") {
      setCurrentView({ type: "subscriptions" });
    } else if (routeType === "channel" && routeId) {
      setCurrentView({
        type: "channel",
        subscription: { id: "", title: "", thumbnail: "", channelId: routeId },
      });
    }
  }, [setCurrentView]);

  useEffect(() => {
    if (hydratedFromUrlRef.current || !accessToken) return;
    hydratedFromUrlRef.current = true;

    const videoId = new URLSearchParams(window.location.search).get("v");
    if (!videoId) return;

    fetchVideoByIdAPI(accessToken, videoId).then((video) => {
      if (video) {
        setViewingVideo(video);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("v");
        window.history.replaceState({}, "", url.toString());
      }
    });
  }, [accessToken, setViewingVideo]);

  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false;
      return;
    }
    const url = new URL(window.location.href);
    const currentParam = url.searchParams.get("v");
    const desired = viewingVideo?.resourceId ?? null;
    if (currentParam === desired) return;

    if (desired) {
      url.searchParams.set("v", desired);
    } else {
      url.searchParams.delete("v");
    }
    window.history.pushState({}, "", url.toString());
  }, [viewingVideo]);

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

  const renderMain = () => {
    if (currentView.type === "feed") return <SubscriptionFeed />;
    if (currentView.type === "subscriptions") return <Subscriptions />;
    return <Videos />;
  };

  return (
    <main className="h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {(!viewingVideo || !videoViewerExpanded || videoViewerPip) && renderMain()}
        {viewingVideo && (
          <VideoViewer
            video={viewingVideo}
            onClose={handleClose}
            expanded={videoViewerExpanded}
            onExpandToggle={handleExpandToggle}
            pip={videoViewerPip}
            onPipToggle={handlePipToggle}
          />
        )}
      </div>
    </main>
  )
}