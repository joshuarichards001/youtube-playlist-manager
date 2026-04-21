import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHANNELS_PATH = resolve(ROOT, "data/channels.json");
const OUTPUT_PATH = resolve(ROOT, "public/subscription-feed.json");
const MAX_VIDEOS = 100;
const RSS_CONCURRENCY = 4;
const SHORTS_CONCURRENCY = 10;
const FETCH_RETRIES = 3;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? null;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchWithRetry = async (url, options, retries = FETCH_RETRIES) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok || res.status === 404) return res;
    if (attempt < retries) await sleep(1000 * 2 ** attempt);
  }
  return fetch(url, options);
};

const mapConcurrent = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
};

// Uploads playlist ID = channel ID with the leading UC replaced by UU.
const uploadsPlaylistId = (channelId) => "UU" + channelId.slice(2);

const fetchChannelFeedViaAPI = async (channel) => {
  const playlistId = uploadsPlaylistId(channel.id);
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems` +
    `?part=snippet&playlistId=${playlistId}&maxResults=15&key=${YOUTUBE_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[api] ${channel.title || channel.id}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.items ?? [])
      .map((item) => {
        const s = item.snippet;
        const videoId = s.resourceId?.videoId;
        return {
          id: videoId,
          title: s.title,
          channel: s.channelTitle ?? channel.title ?? "",
          channelId: s.channelId ?? channel.id,
          thumbnail:
            s.thumbnails?.high?.url ??
            s.thumbnails?.default?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          releaseDate: s.publishedAt,
          viewCount: 0,
        };
      })
      .filter((v) => v.id && v.releaseDate);
  } catch (err) {
    console.warn(`[api] ${channel.title || channel.id}: ${err.message}`);
    return [];
  }
};

const fetchChannelFeed = async (channel) => {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
  try {
    const res = await fetchWithRetry(url, { headers: BROWSER_HEADERS });
    if (!res.ok) {
      if (res.status === 404 && YOUTUBE_API_KEY) {
        console.warn(`[feed] ${channel.title || channel.id}: HTTP 404, falling back to Data API`);
        return fetchChannelFeedViaAPI(channel);
      }
      console.warn(`[feed] ${channel.title || channel.id}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const doc = parser.parse(xml);
    const entries = doc?.feed?.entry;
    if (!entries) return [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list
      .map((entry) => {
        const group = entry["media:group"] ?? {};
        const thumb = group["media:thumbnail"];
        const thumbnail = Array.isArray(thumb) ? thumb[0]?.["@_url"] : thumb?.["@_url"];
        const stats = group["media:community"]?.["media:statistics"];
        const viewCount = stats?.["@_views"] ? Number(stats["@_views"]) : 0;
        return {
          id: entry["yt:videoId"],
          title: entry.title,
          channel: entry.author?.name ?? channel.title ?? "",
          channelId: entry["yt:channelId"] ?? channel.id,
          thumbnail: thumbnail ?? `https://i.ytimg.com/vi/${entry["yt:videoId"]}/hqdefault.jpg`,
          releaseDate: entry.published,
          viewCount,
        };
      })
      .filter((v) => v.id && v.releaseDate);
  } catch (err) {
    console.warn(`[feed] ${channel.title || channel.id}: ${err.message}`);
    return [];
  }
};

const isShort = async (videoId) => {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "GET",
      redirect: "manual",
      headers: BROWSER_HEADERS,
    });
    // 200 => genuine short page; 3xx redirect => regular video at /watch
    return res.status === 200;
  } catch (err) {
    console.warn(`[shorts] ${videoId}: ${err.message} — treating as non-short`);
    return false;
  }
};

const main = async () => {
  const channelsRaw = await readFile(CHANNELS_PATH, "utf8");
  const channels = JSON.parse(channelsRaw);
  if (!Array.isArray(channels) || channels.length === 0) {
    console.error("No channels in data/channels.json");
    process.exit(1);
  }

  if (YOUTUBE_API_KEY) {
    console.log("YouTube Data API key present — will use as fallback for blocked RSS feeds.");
  } else {
    console.log("No YOUTUBE_API_KEY set — RSS only, no fallback.");
  }

  console.log(`Fetching RSS for ${channels.length} channels…`);
  const perChannel = await mapConcurrent(channels, RSS_CONCURRENCY, fetchChannelFeed);
  const failCount = perChannel.filter((entries) => entries.length === 0).length;
  if (failCount > channels.length * 0.5) {
    console.error(`Too many channels failed (${failCount}/${channels.length}). Aborting.`);
    process.exit(1);
  }
  const all = perChannel.flat();
  console.log(`Collected ${all.length} total entries (${failCount} channels returned no results).`);

  all.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  // Dedupe by video id, keep first (newest) occurrence.
  const seen = new Set();
  const deduped = [];
  for (const v of all) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    deduped.push(v);
  }

  console.log(`Checking shorts status for ${deduped.length} candidates…`);
  const shortsFlags = await mapConcurrent(
    deduped,
    SHORTS_CONCURRENCY,
    (v) => isShort(v.id)
  );
  const nonShorts = deduped.filter((_, i) => !shortsFlags[i]);
  console.log(`${nonShorts.length} non-shorts after filtering.`);

  const videos = nonShorts.slice(0, MAX_VIDEOS);
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
