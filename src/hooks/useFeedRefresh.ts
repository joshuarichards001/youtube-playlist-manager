import { useEffect } from "react";
import useStore from "../helpers/store";
import { loadFeed, refreshFeed } from "../helpers/feed";

// Loads the Recent Feed from D1 on sign-in, then refreshes it if the last
// refresh is over an hour old. Re-checks when the tab becomes visible again so
// a PWA resumed from the background (no reload) also gets a fresh feed. The
// one-hour rule lives server-side in /api/feed/start.
export default function useFeedRefresh() {
  const signedIn = useStore((state) => Boolean(state.accessToken));
  const hasSubscriptions = useStore((state) => state.subscriptions.length > 0);

  useEffect(() => {
    if (signedIn) loadFeed();
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !hasSubscriptions) return;

    refreshFeed();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshFeed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [signedIn, hasSubscriptions]);
}
