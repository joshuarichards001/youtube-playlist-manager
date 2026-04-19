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

  return (
    <main className="h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {currentView.type === 'feed' ? <SubscriptionFeed /> : <Videos />}
        {viewingVideo && (
          <VideoViewer video={viewingVideo} onClose={() => setViewingVideo(null)} />
        )}
      </div>
    </main>
  )
}