// Videos count as watched once playback reaches WATCHED_FRACTION of their
// duration. Stored per device in localStorage (`yt-watched`, videoId ->
// watchedAt) and exposed to components through useWatched so thumbnails update
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
  if (!videoId) return;
  const store = readStore();
  if (store[videoId]) return;

  const next: WatchedStore = { ...store, [videoId]: Date.now() };
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
