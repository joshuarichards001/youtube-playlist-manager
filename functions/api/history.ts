// Watch history, shared across devices. Backed by the same D1 database as
// /api/progress (bound as `DB`); owner-only (ALLOWED_EMAIL).
//
//   GET    /api/history?before=<watchedAt>  -> { videos: HistoryVideo[], nextCursor: number | null }
//   PUT    /api/history                     body { videoId, title, channel, channelId, thumbnail,
//                                                 durationSeconds, viewCount, releaseDate }
//   DELETE /api/history                     body { videoIds: string[] }
//
// One row per video: watching it again moves it back to the top. Video metadata
// is stored with the row so listing history costs no YouTube API quota.

import { isOwner, json, OwnerEnv, VIDEO_ID } from "../_lib/owner";

const PAGE_SIZE = 60;
const MAX_TEXT = 500;
const MAX_DELETE = 500;

interface Env extends OwnerEnv {
  DB: D1Database;
}

interface HistoryRow {
  video_id: string;
  title: string;
  channel: string;
  channel_id: string;
  thumbnail: string;
  duration_seconds: number;
  view_count: number;
  release_date: string;
  watched_at: number;
}

let schemaReady = false;

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS history (
        video_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        channel TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        view_count INTEGER NOT NULL,
        release_date TEXT NOT NULL,
        watched_at INTEGER NOT NULL
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS history_watched_at ON history (watched_at DESC)"
    ),
  ]);
  schemaReady = true;
}

const text = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_TEXT) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (!["GET", "PUT", "DELETE"].includes(request.method)) {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!env.DB) return json({ error: "DB binding not configured" }, 500);
  if (!(await isOwner(request, env))) return json({ error: "Unauthorized" }, 401);

  await ensureSchema(env.DB);

  if (request.method === "GET") {
    const before = Number(new URL(request.url).searchParams.get("before"));
    const cursor = Number.isFinite(before) && before > 0 ? before : Number.MAX_SAFE_INTEGER;

    // Fetch one extra row to know whether another page exists.
    const { results } = await env.DB.prepare(
      `SELECT * FROM history WHERE watched_at < ?1 ORDER BY watched_at DESC LIMIT ?2`
    )
      .bind(cursor, PAGE_SIZE + 1)
      .all<HistoryRow>();

    const page = results.slice(0, PAGE_SIZE);
    return json({
      videos: page.map((r) => ({
        id: r.video_id,
        title: r.title,
        channel: r.channel,
        channelId: r.channel_id,
        thumbnail: r.thumbnail,
        durationSeconds: r.duration_seconds,
        viewCount: r.view_count,
        releaseDate: r.release_date,
        watchedAt: r.watched_at,
      })),
      nextCursor: results.length > PAGE_SIZE ? page[page.length - 1].watched_at : null,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  if (request.method === "DELETE") {
    const ids = Array.isArray(body.videoIds) ? body.videoIds : [];
    const valid = ids.filter((id): id is string => typeof id === "string" && VIDEO_ID.test(id));
    if (valid.length === 0 || valid.length > MAX_DELETE) {
      return json({ error: "Bad body" }, 400);
    }
    await env.DB.batch(
      valid.map((id) => env.DB.prepare("DELETE FROM history WHERE video_id = ?1").bind(id))
    );
    return json({ ok: true });
  }

  const { videoId } = body;
  if (typeof videoId !== "string" || !VIDEO_ID.test(videoId)) {
    return json({ error: "Bad body" }, 400);
  }

  // Server clock, so ordering is consistent across devices.
  await env.DB.prepare(
    `INSERT INTO history (video_id, title, channel, channel_id, thumbnail,
                          duration_seconds, view_count, release_date, watched_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT(video_id) DO UPDATE SET
       title = excluded.title,
       channel = excluded.channel,
       channel_id = excluded.channel_id,
       thumbnail = excluded.thumbnail,
       duration_seconds = CASE WHEN excluded.duration_seconds > 0
                               THEN excluded.duration_seconds ELSE history.duration_seconds END,
       view_count = CASE WHEN excluded.view_count > 0
                         THEN excluded.view_count ELSE history.view_count END,
       release_date = excluded.release_date,
       watched_at = excluded.watched_at`
  )
    .bind(
      videoId,
      text(body.title),
      text(body.channel),
      text(body.channelId),
      text(body.thumbnail),
      num(body.durationSeconds),
      Math.round(num(body.viewCount)),
      text(body.releaseDate),
      Date.now()
    )
    .run();

  return json({ ok: true });
};
