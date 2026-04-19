import { useState } from "react";
import useStore from "../helpers/store";
import Nav from "./Nav";
import Sidebar from "./Sidebar";
import SubscriptionFeed from "./SubscriptionFeed";
import VideoViewer from "./VideoViewer";
import Videos from "./Videos";

export default function HomePage() {
  const currentView = useStore((state) => state.currentView);
  const viewingVideo = useStore((state) => state.viewingVideo);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const [videoViewerExpanded, setVideoViewerExpanded] = useState(false);

  const handleClose = () => {
    setViewingVideo(null);
    setVideoViewerExpanded(false);
  };

  return (
    <main className="h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {(!viewingVideo || !videoViewerExpanded) && (
          currentView.type === 'feed' ? <SubscriptionFeed /> : <Videos />
        )}
        {viewingVideo && (
          <VideoViewer
            video={viewingVideo}
            onClose={handleClose}
            expanded={videoViewerExpanded}
            onExpandToggle={() => setVideoViewerExpanded((e) => !e)}
          />
        )}
      </div>
    </main>
  )
}