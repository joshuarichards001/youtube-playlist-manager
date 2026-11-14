// Resume positions live in two places:
// - localStorage: written every few seconds, read synchronously, per device.
// - /api/progress (D1): written less often, so positions follow you between
//   devices. When the two disagree, the entry with the newer savedAt wins.
//
// A finished video is stored as position 0 (not deleted) so that finishing a
// video on one device also resets it everywhere else.

const STORAGE_KEY = "yt-resume";
const MAX_ENTRIES = 500;
const MIN_SAVE_SECONDS = 5;
const COMPLETION_THRESHOLD_SECONDS = 10;
const REMOTE_TIMEOUT_MS = 1500;

export type ResumeEntry = {
  position: number;
  duration: number;
  savedAt: number;
};

type ResumeStore = Record<string, ResumeEntry>;

function readStore(): ResumeStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ResumeStore;
    return {};
  } catch {
    return {};
  }
}

function writeStore(store: ResumeStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded or storage unavailable — drop silently
  }
}

function writeEntry(videoId: string, entry: ResumeEntry) {
  const store = readStore();
  store[videoId] = entry;

  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys
      .map((k) => [k, store[k].savedAt] as const)
      .sort((a, b) => a[1] - b[1]);
    for (const [k] of sorted.slice(0, keys.length - MAX_ENTRIES)) {
      delete store[k];
    }
  }

  writeStore(store);
}

function toStartSeconds(entry: ResumeEntry | null | undefined): number {
  if (!entry || entry.position < MIN_SAVE_SECONDS) return 0;
  return Math.floor(entry.position);
}

// Saves locally and returns the entry written, or null if nothing was saved
// (too early in the video to be worth remembering).
export function saveResumePosition(
  videoId: string,
  position: number,
  duration: number
): ResumeEntry | null {
  if (!videoId) return null;
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return null;

  const finished =
    duration > 0 && position >= duration - COMPLETION_THRESHOLD_SECONDS;

  if (finished) {
    const existing = readStore()[videoId];
    // Already marked finished; nothing new to record.
    if (existing && existing.position === 0) return null;
    const entry = { position: 0, duration, savedAt: Date.now() };
    writeEntry(videoId, entry);
    return entry;
  }

  if (position < MIN_SAVE_SECONDS) return null;

  const entry = { position, duration, savedAt: Date.now() };
  writeEntry(videoId, entry);
  return entry;
}

async function fetchRemoteEntry(
  accessToken: string,
  videoId: string
): Promise<ResumeEntry | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/progress?id=${encodeURIComponent(videoId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ResumeEntry | null;
    if (!data || !Number.isFinite(data.position) || !Number.isFinite(data.savedAt)) {
      return null;
    }
    return data;
  } catch {
    // offline, timed out, or /api not available (npm run dev:vite)
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

// Returns the start time for a video, preferring the cloud copy when it is
// newer than the local one. Falls back to the local copy if the request fails
// or takes longer than REMOTE_TIMEOUT_MS.
export async function resolveResumePosition(
  accessToken: string | null,
  videoId: string
): Promise<number> {
  const local = readStore()[videoId];
  if (!accessToken || !videoId) return toStartSeconds(local);

  const remote = await fetchRemoteEntry(accessToken, videoId);
  if (remote && (!local || remote.savedAt > local.savedAt)) {
    writeEntry(videoId, remote);
    return toStartSeconds(remote);
  }
  return toStartSeconds(local);
}

// Fire-and-forget upload. keepalive lets it finish even if the tab is closing.
export function pushResumeEntry(
  accessToken: string | null,
  videoId: string,
  entry: ResumeEntry
) {
  if (!accessToken || !videoId) return;
  fetch("/api/progress", {
    method: "PUT",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ videoId, ...entry }),
  }).catch(() => {
    // offline — the local copy still has it and the next push will catch up
  });
}
