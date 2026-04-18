import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHANNELS_PATH = resolve(ROOT, "data/channels.json");
const OUTPUT_PATH = resolve(ROOT, "public/subscription-feed.json");
const MAX_VIDEOS = 200;
const RSS_CONCURRENCY = 8;
const SHORTS_CONCURRENCY = 10;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

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

const fetchChannelFeed = async (channel) => {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
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
      headers: { "User-Agent": "Mozilla/5.0 (feed-builder)" },
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

  console.log(`Fetching RSS for ${channels.length} channels…`);
  const perChannel = await mapConcurrent(channels, RSS_CONCURRENCY, fetchChannelFeed);
  const all = perChannel.flat();
  console.log(`Collected ${all.length} total entries.`);

  all.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  // Dedupe by video id, keep first (newest) occurrence.
  const seen = new Set();
  const deduped = [];
  for (const v of all) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    deduped.push(v);
  }

  // Check enough candidates to survive shorts filtering and still hit MAX_VIDEOS.
  const candidates = deduped.slice(0, MAX_VIDEOS * 2);
  console.log(`Checking shorts status for ${candidates.length} candidates…`);
  const shortsFlags = await mapConcurrent(
    candidates,
    SHORTS_CONCURRENCY,
    (v) => isShort(v.id)
  );
  const nonShorts = candidates.filter((_, i) => !shortsFlags[i]);
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
