import { useEffect } from "react";
import useStore from "../helpers/store";
import { fetchSubscriptionsAPI, unsubscribeAPI } from "../helpers/youtubeAPI";

export default function Subscriptions() {
  const subscriptions = useStore((state) => state.subscriptions);
  const accessToken = useStore((state) => state.accessToken);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const selectedSubscription = currentView.type === 'channel' ? currentView.subscription : null;

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

  const handleHeaderClick = () => {
    setCurrentView({ type: 'subscriptionFeed' });
  };

  const handleUnsubscribe = async (e: React.MouseEvent, subscription: Subscription) => {
    e.stopPropagation();
    if (!accessToken) return;

    const confirmUnsubscribe = window.confirm(
      `Are you sure you want to unsubscribe from ${subscription.title}?`
    );

    if (confirmUnsubscribe) {
      const success = await unsubscribeAPI(accessToken, subscription.id);
      if (success) {
        setSubscriptions(subscriptions.filter((sub) => sub.id !== subscription.id));
        if (selectedSubscription?.id === subscription.id) {
          setCurrentView({ type: 'none' });
        }
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 overflow-hidden">
      <button
        className="flex items-center justify-between w-full text-left hover:bg-neutral/10 rounded-md p-2 -ml-2 mb-2"
        onClick={handleHeaderClick}
      >
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {subscriptions.length > 0 && (
        <ul className="gap-1 flex-1 overflow-y-auto">
          {[...subscriptions].sort((a, b) => a.title.localeCompare(b.title)).map((subscription) => (
            <li key={subscription.id}>
              <button
                className={`group w-full p-2 rounded-md hover:bg-neutral/10 text-base flex flex-row items-center gap-2 ${selectedSubscription?.id === subscription.id ? "bg-neutral/10" : ""
                  }`}
                onClick={() => {
                  setCurrentView({ type: 'channel', subscription });
                }}
              >
                <img
                  src={subscription.thumbnail}
                  alt={subscription.title}
                  className="w-6 h-6 rounded-full"
                />
                <p className="flex-1 text-left">{truncateTitle(subscription.title, 18)}</p>
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
