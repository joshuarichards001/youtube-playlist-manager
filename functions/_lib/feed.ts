// Subscription feed storage + fetching, shared by /api/feed/*. Exports no
// onRequest* handler, so Pages doesn't route it.
//
// New uploads arrive in near real time via WebSub push (see websub.ts and
// /api/feed/push). The browser also runs a periodic sweep, which fills in
// anything a push missed and renews the WebSub leases. It goes one channel per
// request, so each invocation stays well under the Workers subrequest limit and
// the UI gets real progress:
//   POST /api/feed/start    -> claim the sweep if the last one is > 6h old
//   POST /api/feed/channel  -> fetch one channel's RSS, upsert its videos,
//                              (re)subscribe it to push if its lease is ending
//   POST /api/feed/finish   -> prune unsubscribed channels, stamp refreshed_at

import { XMLParser } from "fast-xml-parser";
import { OwnerEnv } from "./owner";

export interface FeedEnv extends OwnerEnv {
  DB: D1Database;
  // The WebSub HMAC secret defaults to one derived from this...
  GOOGLE_CLIENT_SECRET?: string;
  // ...unless this is set explicitly.
  WEBSUB_SECRET?: string;
}

export const MAX_FEED_VIDEOS = 100;
// Push delivers new uploads, so the sweep is only a backstop.
export const REFRESH_INTERVAL_MS = 6 * 60 * 60_000;
// A claimed refresh that never finishes (tab closed mid-run) stops blocking
// others after this long.
export const REFRESH_LOCK_MS = 10 * 60_000;
// Keep at most this many videos in the table; older ones can never make the
// top 100 again.
const MAX_STORED_VIDEOS = 1000;

export const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export interface FeedRow {
  video_id: string;
  title: string;
  channel: string;
  channel_id: string;
  thumbnail: string;
  release_date: string;
  view_count: number;
}

export interface FeedVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  releaseDate: string;
  viewCount: number;
}

let schemaReady = false;

export async function ensureFeedSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS feed_videos (
        video_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        channel TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        release_date TEXT NOT NULL,
        view_count INTEGER NOT NULL,
        is_short INTEGER NOT NULL
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS feed_videos_release ON feed_videos (is_short, release_date DESC)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS feed_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        refreshed_at INTEGER NOT NULL,
        started_at INTEGER NOT NULL
      )`
    ),
    db.prepare("INSERT OR IGNORE INTO feed_state (id, refreshed_at, started_at) VALUES (1, 0, 0)"),
    // One row per channel we want WebSub pushes for. lease_expires_at is set
    // when the hub verifies the subscription; requested_at rate-limits retries.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS feed_subscriptions (
        channel_id TEXT PRIMARY KEY,
        lease_expires_at INTEGER NOT NULL,
        requested_at INTEGER NOT NULL
      )`
    ),
  ]);
  schemaReady = true;
}

export async function readFeed(db: D1Database) {
  const [videos, state] = await db.batch([
    db
      .prepare(
        `SELECT video_id, title, channel, channel_id, thumbnail, release_date, view_count
         FROM feed_videos WHERE is_short = 0 ORDER BY release_date DESC LIMIT ?1`
      )
      .bind(MAX_FEED_VIDEOS),
    db.prepare("SELECT refreshed_at FROM feed_state WHERE id = 1"),
  ]);
  const refreshedAt = (state.results[0] as { refreshed_at: number } | undefined)?.refreshed_at ?? 0;
  return {
    generatedAt: refreshedAt ? new Date(refreshedAt).toISOString() : null,
    videos: (videos.results as FeedRow[]).map(
      (r): FeedVideo => ({
        id: r.video_id,
        title: r.title,
        channel: r.channel,
        channelId: r.channel_id,
        thumbnail: r.thumbnail,
        releaseDate: r.release_date,
        viewCount: r.view_count,
      })
    ),
  };
}

// Atomically claims the refresh. Returns true if this caller should run it.
export async function claimRefresh(db: D1Database, force: boolean): Promise<boolean> {
  const now = Date.now();
  const staleBefore = force ? now : now - REFRESH_INTERVAL_MS;
  const row = await db
    .prepare(
      `UPDATE feed_state SET started_at = ?1
       WHERE id = 1 AND refreshed_at <= ?2 AND started_at < ?3
       RETURNING id`
    )
    .bind(now, staleBefore, now - REFRESH_LOCK_MS)
    .first();
  return row !== null;
}

export async function finishRefresh(db: D1Database, channelIds: string[]) {
  await db.batch([
    // Drop videos from channels no longer subscribed to.
    db
      .prepare(
        "DELETE FROM feed_videos WHERE channel_id NOT IN (SELECT value FROM json_each(?1))"
      )
      .bind(JSON.stringify(channelIds)),
    db
      .prepare(
        `DELETE FROM feed_videos WHERE video_id NOT IN (
           SELECT video_id FROM feed_videos ORDER BY release_date DESC LIMIT ?1
         )`
      )
      .bind(MAX_STORED_VIDEOS),
    db
      .prepare("UPDATE feed_state SET refreshed_at = ?1, started_at = 0 WHERE id = 1")
      .bind(Date.now()),
  ]);
}

// --- Fetching -------------------------------------------------------------

export const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  // Pre-answers the EU cookie-consent interstitial, which would otherwise
  // redirect every /shorts/ probe and make Shorts look like regular videos.
  Cookie: "SOCS=CAI",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// RSS dates are "+00:00", Data API dates are "Z"; normalise so string sort works.
export const isoDate = (s: unknown) => {
  const d = new Date(typeof s === "string" ? s : "");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// Parsed XML / API JSON is untyped; fields are checked as they're read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = Record<string, any>;

export type Fetched = Omit<FeedVideo, "releaseDate"> & { releaseDate: string | null };

async function fetchViaRss(channelId: string, title: string): Promise<FeedVideo[] | null> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { headers: BROWSER_HEADERS });
    if (res.ok || res.status === 404) break;
    await sleep(500 * 2 ** attempt);
  }
  if (!res?.ok) return null;

  const doc = parser.parse(await res.text());
  const entries = doc?.feed?.entry;
  if (!entries) return [];
  const list: Loose[] = Array.isArray(entries) ? entries : [entries];
  return list
    .map((entry): Fetched => {
      const group = entry["media:group"] ?? {};
      const thumb = group["media:thumbnail"];
      const thumbnail = Array.isArray(thumb) ? thumb[0]?.["@_url"] : thumb?.["@_url"];
      const views = group["media:community"]?.["media:statistics"]?.["@_views"];
      const id = String(entry["yt:videoId"] ?? "");
      return {
        id,
        title: String(entry.title ?? ""),
        channel: entry.author?.name ?? title,
        channelId: entry["yt:channelId"] ?? channelId,
        thumbnail: thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        releaseDate: isoDate(entry.published),
        viewCount: views ? Number(views) || 0 : 0,
      };
    })
    .filter((v): v is FeedVideo => Boolean(v.id && v.releaseDate));
}

// Fallback for channels whose RSS feed 404s / is blocked: the uploads playlist
// via the Data API, using the caller's own access token (1 quota unit).
async function fetchViaApi(
  channelId: string,
  title: string,
  accessToken: string
): Promise<FeedVideo[] | null> {
  const playlistId = "UU" + channelId.slice(2);
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=${playlistId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json<{ items?: { snippet: Loose }[] }>();
  return (data.items ?? [])
    .map(({ snippet: s }): Fetched => {
      const id = String(s.resourceId?.videoId ?? "");
      return {
        id,
        title: String(s.title ?? ""),
        channel: s.channelTitle ?? title,
        channelId: s.channelId ?? channelId,
        thumbnail:
          s.thumbnails?.high?.url ?? s.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        releaseDate: isoDate(s.publishedAt),
        viewCount: 0,
      };
    })
    .filter((v): v is FeedVideo => Boolean(v.id && v.releaseDate));
}

// 200 => genuine Shorts page; 3xx => regular video redirected to /watch.
export async function isShort(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      redirect: "manual",
      headers: BROWSER_HEADERS,
    });
    // Never read the HTML; an unread body would pin one of the Worker's 6
    // concurrent connections until the runtime cancels it.
    await res.body?.cancel();
    return res.status === 200;
  } catch {
    return false;
  }
}

// Fetches one channel and upserts its videos. Returns null if both RSS and the
// Data API failed.
export async function refreshChannel(
  db: D1Database,
  channelId: string,
  title: string,
  accessToken: string
): Promise<number | null> {
  const videos =
    (await fetchViaRss(channelId, title).catch(() => null)) ??
    (await fetchViaApi(channelId, title, accessToken).catch(() => null));
  if (videos === null) return null;
  await upsertVideos(db, videos);
  return videos.length;
}

// Inserts or updates videos. Shorts status is probed only for videos we
// haven't seen before, then cached in the row.
export async function upsertVideos(db: D1Database, videos: FeedVideo[]): Promise<void> {
  if (videos.length === 0) return;

  const { results: known } = await db
    .prepare("SELECT video_id FROM feed_videos WHERE video_id IN (SELECT value FROM json_each(?1))")
    .bind(JSON.stringify(videos.map((v) => v.id)))
    .all<{ video_id: string }>();
  const knownIds = new Set(known.map((r) => r.video_id));
  const fresh = videos.filter((v) => !knownIds.has(v.id));
  const shortFlags = await Promise.all(fresh.map((v) => isShort(v.id)));
  const shortById = new Map(fresh.map((v, i) => [v.id, shortFlags[i]]));

  await db.batch(
    videos.map((v) =>
      db
        .prepare(
          `INSERT INTO feed_videos (video_id, title, channel, channel_id, thumbnail,
                                    release_date, view_count, is_short)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
           ON CONFLICT(video_id) DO UPDATE SET
             title = excluded.title,
             channel = excluded.channel,
             thumbnail = excluded.thumbnail,
             view_count = CASE WHEN excluded.view_count > 0
                               THEN excluded.view_count ELSE feed_videos.view_count END`
        )
        .bind(
          v.id,
          v.title.slice(0, 500),
          v.channel.slice(0, 200),
          v.channelId,
          v.thumbnail.slice(0, 500),
          v.releaseDate,
          v.viewCount,
          shortById.get(v.id) ? 1 : 0
        )
    )
  );
}
