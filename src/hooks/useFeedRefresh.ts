import { useEffect } from "react";
import useStore from "../helpers/store";
import { loadFeed, refreshFeed } from "../helpers/feed";

// New uploads reach D1 by WebSub push with no browser involved, so the feed is
// re-read every couple of minutes while the tab is visible (one cheap D1
// query), and immediately when it becomes visible again.
const RELOAD_INTERVAL_MS = 2 * 60_000;

// Loads the Recent Feed from D1 on sign-in and keeps it current, and runs the
// backstop sweep if the last one is over 6 hours old. The 6-hour rule lives
// server-side in /api/feed/start, so calling refreshFeed often is cheap.
export default function useFeedRefresh() {
  const signedIn = useStore((state) => Boolean(state.accessToken));
  const hasSubscriptions = useStore((state) => state.subscriptions.length > 0);

  useEffect(() => {
    if (!signedIn) return;
    loadFeed();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !useStore.getState().feedRefresh) loadFeed(true);
    }, RELOAD_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && !useStore.getState().feedRefresh) loadFeed(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
