// Client for /api/history (D1). A video is added when it starts playing in
// VideoViewer; re-watching moves it back to the top.

export type HistoryVideo = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  durationSeconds: number;
  viewCount: number;
  releaseDate: string;
  watchedAt: number;
};

export type HistoryPage = {
  videos: HistoryVideo[];
  nextCursor: number | null;
};

// Fire-and-forget; history is a nice-to-have and must never get in the way of
// playback.
export function recordHistory(accessToken: string | null, video: Video) {
  if (!accessToken || !video.resourceId) return;
  fetch("/api/history", {
    method: "PUT",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      videoId: video.resourceId,
      title: video.title,
      channel: video.channel,
      channelId: video.channelId,
      thumbnail: video.thumbnail,
      durationSeconds: video.durationSeconds,
      viewCount: video.viewCount,
      releaseDate: video.releaseDate,
    }),
  }).catch(() => {
    // offline or /api not available (npm run dev:vite)
  });
}

export async function fetchHistory(
  accessToken: string,
  before: number | null
): Promise<HistoryPage> {
  const query = before ? `?before=${before}` : "";
  const res = await fetch(`/api/history${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as HistoryPage;
}

export async function removeFromHistory(
  accessToken: string,
  videoIds: string[]
): Promise<boolean> {
  try {
    const res = await fetch("/api/history", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ videoIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
