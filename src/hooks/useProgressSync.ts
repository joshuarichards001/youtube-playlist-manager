import { useEffect } from "react";
import useStore from "../helpers/store";
import { syncResumePositions } from "../helpers/resumePosition";

const SYNC_INTERVAL_MS = 5 * 60_000;

// Keeps local resume positions / watched flags in step with other devices:
// syncs on sign-in, whenever the tab becomes visible again (e.g. switching
// back to the laptop after watching on the phone), and every 5 minutes.
export default function useProgressSync() {
  const signedIn = useStore((state) => Boolean(state.accessToken));

  useEffect(() => {
    if (!signedIn) return;

    const sync = () => syncResumePositions(useStore.getState().accessToken);
    sync();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn]);
}
