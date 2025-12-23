import { useEffect } from "react";
import useStore from "../helpers/store";
import { fetchSubscriptionsAPI } from "../helpers/youtubeAPI";

export default function Subscriptions() {
  const subscriptions = useStore((state) => state.subscriptions);
  const accessToken = useStore((state) => state.accessToken);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const selectedSubscription = useStore((state) => state.selectedSubscription);
  const setSelectedSubscription = useStore((state) => state.setSelectedSubscription);
  const setSelectedPlaylist = useStore((state) => state.setSelectedPlaylist);
  const setVideos = useStore((state) => state.setVideos);
  const setNextPageToken = useStore((state) => state.setNextPageToken);

  useEffect(() => {
    if (accessToken) {
      try {
        fetchSubscriptionsAPI(accessToken).then((subscriptions) => {
          setSubscriptions(subscriptions);
        });
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      }
    }
  }, [accessToken, setSubscriptions]);

  const truncateTitle = (title: string, maxLength: number) => {
    return title.length > maxLength
      ? title.substring(0, maxLength) + "..."
      : title;
  };

  return (
    <div className="flex flex-col overflow-y-auto flex-1 p-4">
      <h2 className="text-lg font-semibold mb-2">Subscriptions</h2>
      {subscriptions.length > 0 && (
        <ul className="gap-1 flex-1">
          {[...subscriptions].sort((a, b) => a.title.localeCompare(b.title)).map((subscription) => (
            <li key={subscription.id}>
              <button
                className={`w-full p-2 rounded-md hover:bg-neutral/10 text-base flex flex-row items-center gap-2 ${selectedSubscription?.id === subscription.id ? "bg-neutral/10" : ""
                  }`}
                onClick={() => {
                  setVideos([]);
                  setNextPageToken(null);
                  setSelectedPlaylist(null);
                  setSelectedSubscription(subscription);
                }}
              >
                <img
                  src={subscription.thumbnail}
                  alt={subscription.title}
                  className="w-6 h-6 rounded-full"
                />
                <p>{truncateTitle(subscription.title, 18)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
