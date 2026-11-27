// Client for /api/feed/* (D1). The Recent Feed is refreshed from the browser:
// claim the refresh (server says no if the last one is < 1h old or another
// client is mid-run), then refresh each subscribed channel with a few requests
// in flight, reporting progress to the store, then finish.

import useStore from "./store";

const CHANNEL_CONCURRENCY = 6;

const authed = (accessToken: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
});

export async function loadFeed(): Promise<void> {
  const { accessToken, setFeed, setFeedError } = useStore.getState();
  if (!accessToken) return;
  try {
    const res = await fetch("/api/feed", authed(accessToken));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setFeed((await res.json()) as StaticFeedData);
  } catch (err) {
    setFeedError(err instanceof Error ? err.message : String(err));
  }
}

let running = false;

// Refreshes the feed if it's stale (or always, with force). Safe to call often:
// a no-op while a refresh is already running in this tab.
export async function refreshFeed(force = false): Promise<void> {
  if (running) return;
  const { accessToken, subscriptions, setFeedRefresh, setFeed, setFeedError } =
    useStore.getState();
  if (!accessToken || subscriptions.length === 0) return;

  running = true;
  try {
    const start = await fetch(
      "/api/feed/start",
      authed(accessToken, { method: "POST", body: JSON.stringify({ force }) })
    );
    if (!start.ok) return;
    const { claimed } = (await start.json()) as { claimed: boolean };
    if (!claimed) return;

    const channels = subscriptions.map((s) => ({ id: s.channelId, title: s.title }));
    let done = 0;
    let failed = 0;
    setFeedRefresh({ done, total: channels.length, failed });

    let cursor = 0;
    const worker = async () => {
      while (cursor < channels.length) {
        const channel = channels[cursor++];
        // Re-read the token each time: a long refresh may outlive it.
        const token = useStore.getState().accessToken ?? accessToken;
        try {
          const res = await fetch(
            "/api/feed/channel",
            authed(token, {
              method: "POST",
              body: JSON.stringify({ channelId: channel.id, title: channel.title }),
            })
          );
          const body = res.ok ? ((await res.json()) as { ok: boolean }) : null;
          if (!body?.ok) failed++;
        } catch {
          failed++;
        }
        done++;
        setFeedRefresh({ done, total: channels.length, failed });
      }
    };
    await Promise.all(Array.from({ length: CHANNEL_CONCURRENCY }, worker));

    // Mostly-failed runs (YouTube blocking us, offline) keep the old feed and
    // leave refreshed_at alone so the next page load tries again.
    if (failed > channels.length / 2) {
      setFeedError(`Refresh failed for ${failed} of ${channels.length} channels`);
      return;
    }

    const token = useStore.getState().accessToken ?? accessToken;
    const finish = await fetch(
      "/api/feed/finish",
      authed(token, {
        method: "POST",
        body: JSON.stringify({ channelIds: channels.map((c) => c.id) }),
      })
    );
    if (finish.ok) setFeed((await finish.json()) as StaticFeedData);
  } catch {
    // offline or /api not available (npm run dev:vite)
  } finally {
    running = false;
    setFeedRefresh(null);
  }
}
