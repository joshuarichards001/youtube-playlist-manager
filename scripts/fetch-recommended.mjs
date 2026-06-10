import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Innertube } from "youtubei.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT_PATH = resolve(ROOT, "public/recommended-feed.json");
const MAX_VIDEOS = 50;
const MIN_VIDEOS = 10;
const MAX_CONTINUATIONS = 12;
const YOUTUBE_COOKIE = process.env.YOUTUBE_COOKIE ?? null;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? null;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? null;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? null;

const VIDEO_ID_RE = /^[\w-]{11}$/;

const fetchAccessToken = async () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN env vars."
    );
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (HTTP ${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.access_token;
};

// Pull plain video IDs out of a home-feed page. YouTube A/B tests two item
// representations (classic Video nodes and the newer LockupView), so accept
// both; Shorts, Mixes, and playlists are excluded here by node type, and the
// 11-char check drops playlist/mix IDs that slip through.
const videoIdsFromFeed = (feed) => {
  const ids = [];
  const memo = feed.page?.contents_memo;
  for (const node of memo?.get("Video") ?? []) {
    if (VIDEO_ID_RE.test(node.video_id ?? node.id ?? "")) {
      ids.push(node.video_id ?? node.id);
    }
  }
  for (const node of memo?.get("LockupView") ?? []) {
    if (node.content_type === "VIDEO" && VIDEO_ID_RE.test(node.content_id ?? "")) {
      ids.push(node.content_id);
    }
  }
  return ids;
};

const fetchHomeFeedIds = async () => {
  if (!YOUTUBE_COOKIE) {
    throw new Error("Missing YOUTUBE_COOKIE env var (logged-in youtube.com Cookie header).");
  }
  // retrieve_player: false — the player JS is only needed for stream
  // deciphering, and fetching it is an extra request that can fail.
  const yt = await Innertube.create({ cookie: YOUTUBE_COOKIE, retrieve_player: false });

  // Verify the cookie actually authenticates — with an expired cookie YouTube
  // silently serves the logged-out (generic) home feed, which we never want
  // to publish as "recommended".
  try {
    await yt.account.getInfo();
  } catch (err) {
    throw new Error(
      `YouTube cookie appears invalid or expired (account check failed: ${err.message}). ` +
        "Re-export the Cookie header from a logged-in youtube.com session and update the YOUTUBE_COOKIE secret."
    );
  }

  const seen = new Set();
  const ids = [];
  let feed = await yt.getHomeFeed();
  for (let i = 0; ; i++) {
    const before = ids.length;
    for (const id of videoIdsFromFeed(feed)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    console.log(`[home] page ${i + 1}: +${ids.length - before} videos (${ids.length} total)`);
    // Overshoot the target so we still have 50 after dropping live streams
    // and stray Shorts during hydration.
    if (ids.length >= MAX_VIDEOS * 1.5) break;
    if (i >= MAX_CONTINUATIONS || !feed.has_continuation) {
      console.log(
        `[home] stopping: ${!feed.has_continuation ? "no further continuation available" : "continuation budget exhausted"}`
      );
      break;
    }
    try {
      feed = await feed.getContinuation();
    } catch (err) {
      console.warn(`[home] continuation failed: ${err.message}`);
      break;
    }
  }
  return ids;
};

const convertDurationToSeconds = (duration) => {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration ?? "");
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
};

// Hydrate IDs through the official Data API so titles, dates, and view counts
// come from a stable source — only the ID harvesting depends on Innertube.
const hydrateVideos = async (accessToken, ids) => {
  const byId = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,contentDetails,statistics&maxResults=50&id=${chunk.join(",")}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`videos.list failed (HTTP ${res.status}): ${body}`);
    }
    const data = await res.json();
    for (const item of data.items ?? []) byId.set(item.id, item);
  }

  const videos = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (!item) continue;
    const s = item.snippet;
    if (s.liveBroadcastContent && s.liveBroadcastContent !== "none") continue;
    const durationSeconds = convertDurationToSeconds(item.contentDetails?.duration);
    if (durationSeconds > 0 && durationSeconds <= 61) continue; // Shorts
    videos.push({
      id,
      title: s.title,
      channel: s.channelTitle ?? "",
      channelId: s.channelId ?? "",
      thumbnail:
        s.thumbnails?.high?.url ??
        s.thumbnails?.default?.url ??
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      releaseDate: s.publishedAt,
      viewCount: Number(item.statistics?.viewCount ?? 0),
    });
  }
  return videos;
};

const main = async () => {
  console.log("Fetching home feed recommendations via Innertube…");
  const ids = await fetchHomeFeedIds();
  console.log(`Collected ${ids.length} candidate video IDs.`);

  console.log("Authenticating with Google…");
  const accessToken = await fetchAccessToken();
  console.log("Hydrating video details from YouTube Data API…");
  const videos = (await hydrateVideos(accessToken, ids)).slice(0, MAX_VIDEOS);
  if (videos.length < MIN_VIDEOS) {
    console.error(
      `Only ${videos.length} videos survived hydration (need ${MIN_VIDEOS}). Aborting without writing.`
    );
    process.exit(1);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    videos,
  };
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${videos.length} videos to ${OUTPUT_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
