import { useEffect, useState } from "react";
import useStore from "../helpers/store";
import {
  fetchSubscriptionsAPI,
  unsubscribeAPI,
} from "../helpers/youtubeAPI/subscriptionAPI";

export default function Subscriptions() {
  const subscriptions = useStore((state) => state.subscriptions);
  const accessToken = useStore((state) => state.accessToken);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const setViewingVideo = useStore((state) => state.setViewingVideo);
  const viewingVideo = useStore((state) => state.viewingVideo);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetchSubscriptionsAPI(accessToken)
      .then((subs) => setSubscriptions(subs))
      .catch((error) => console.error("Error fetching subscriptions:", error))
      .finally(() => setLoading(false));
  }, [accessToken, setSubscriptions]);

  const handleUnsubscribe = async (
    e: React.MouseEvent,
    subscription: Subscription,
  ) => {
    e.stopPropagation();
    if (!accessToken) return;

    const confirmUnsubscribe = window.confirm(
      `Are you sure you want to unsubscribe from ${subscription.title}?`,
    );

    if (confirmUnsubscribe) {
      const success = await unsubscribeAPI(accessToken, subscription.id);
      if (success) {
        setSubscriptions(
          subscriptions.filter((sub) => sub.id !== subscription.id),
        );
      }
    }
  };

  const openChannel = (subscription: Subscription) => {
    setCurrentView({ type: "channel", subscription });
    setSidebarOpen(false);
    if (window.innerWidth < 768) setViewingVideo(null);
    const url = new URL(window.location.href);
    url.pathname = `/channel/${subscription.channelId}`;
    window.history.pushState({}, "", url.toString());
  };

  const sorted = [...subscriptions].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  return (
    <div
      className={`pt-4 px-4 md:pt-10 md:px-10 overflow-y-auto flex-col ${
        viewingVideo ? "hidden xl:flex xl:w-1/2" : "flex w-full"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-bold text-lg md:text-xl truncate">Subscriptions</h2>
        {subscriptions.length > 0 && (
          <p className="text-xs text-base-content/60">
            {subscriptions.length} channels
          </p>
        )}
      </div>
      {loading && subscriptions.length === 0 && (
        <div className="flex items-center justify-center py-10">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
      {!loading && subscriptions.length === 0 && (
        <p className="text-sm text-base-content/60">No subscriptions found.</p>
      )}
      {subscriptions.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 overflow-y-auto">
          {sorted.map((subscription) => (
            <li key={subscription.id}>
              <button
                className="group w-full p-3 rounded-md hover:bg-neutral/10 text-base flex flex-row items-center gap-3"
                onClick={() => openChannel(subscription)}
              >
                <img
                  src={subscription.thumbnail}
                  alt={subscription.title}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <p className="flex-1 text-left truncate">
                  {subscription.title}
                </p>
                <span
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-500 transition-opacity"
                  onClick={(e) => handleUnsubscribe(e, subscription)}
                  title="Unsubscribe"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
