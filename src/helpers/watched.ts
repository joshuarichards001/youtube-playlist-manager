// Videos count as watched once playback reaches WATCHED_FRACTION of their
// duration. Stored per device in localStorage (`yt-watched`, videoId ->
// watchedAt); other devices pick it up because syncResumePositions marks any
// synced position past the threshold (or finished) as watched. Exposed to components through useWatched so thumbnails update
// as soon as the threshold is crossed.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "yt-watched";
const MAX_ENTRIES = 5000;
export const WATCHED_FRACTION = 0.9;

type WatchedStore = Record<string, number>;

let cache: WatchedStore | null = null;
const listeners = new Set<() => void>();

function readStore(): WatchedStore {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === "object" ? (parsed as WatchedStore) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function markWatched(videoId: string) {
  markWatchedMany([videoId]);
}

// Marks several videos at once with a single localStorage write. Already
// watched videos keep their original timestamp.
export function markWatchedMany(videoIds: string[]) {
  const store = readStore();
  const fresh = videoIds.filter((id) => id && !store[id]);
  if (fresh.length === 0) return;

  const now = Date.now();
  const next: WatchedStore = { ...store };
  for (const id of fresh) next[id] = now;

  const keys = Object.keys(next);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => next[a] - next[b])
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete next[k]);
  }

  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded or storage unavailable — keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

export function isWatched(videoId: string): boolean {
  return Boolean(readStore()[videoId]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWatched(videoId: string): boolean {
  return useSyncExternalStore(subscribe, () => isWatched(videoId));
}
