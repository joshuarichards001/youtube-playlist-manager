const STORAGE_KEY = "yt-resume";
const MAX_ENTRIES = 500;
const MIN_SAVE_SECONDS = 5;
const COMPLETION_THRESHOLD_SECONDS = 10;

type ResumeEntry = {
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

export function getResumePosition(videoId: string): number | null {
  if (!videoId) return null;
  const entry = readStore()[videoId];
  if (!entry) return null;
  if (entry.position < MIN_SAVE_SECONDS) return null;
  return entry.position;
}

export function saveResumePosition(
  videoId: string,
  position: number,
  duration: number
) {
  if (!videoId) return;
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return;

  const store = readStore();

  if (duration > 0 && position >= duration - COMPLETION_THRESHOLD_SECONDS) {
    if (store[videoId]) {
      delete store[videoId];
      writeStore(store);
    }
    return;
  }

  if (position < MIN_SAVE_SECONDS) return;

  store[videoId] = { position, duration, savedAt: Date.now() };

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
