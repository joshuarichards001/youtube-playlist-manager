// Cloud copy of video resume positions so they follow you between devices.
// Backed by a D1 database bound as `DB`. Only the owner (ALLOWED_EMAIL, the
// same env var the OAuth callback uses) can read or write.
//
//   GET    /api/progress?id=<videoId>  -> { position, duration, savedAt } | null
//   GET    /api/progress?since=<ms>    -> { entries: [{ videoId, position, duration, savedAt }], cursor }
//   PUT    /api/progress               body { videoId, position, duration, savedAt }
//
// `since`/`cursor` use updated_at, stamped with the server clock on every
// accepted write, so a device whose clock is behind can't slip writes in under
// another device's cursor. Pass the returned cursor back as the next `since`.
//
// A finished video is stored as position 0 (a tombstone) rather than deleted,
// so "newest savedAt wins" also works for "I finished this on another device".

import { isOwner, json, OwnerEnv, VIDEO_ID } from "../_lib/owner";

const MAX_CLOCK_SKEW_MS = 60_000;

interface Env extends OwnerEnv {
  DB: D1Database;
}

interface ProgressRow {
  position: number;
  duration: number;
  saved_at: number;
}

interface ProgressListRow extends ProgressRow {
  video_id: string;
  updated_at: number;
}

let schemaReady = false;

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS progress (
        video_id TEXT PRIMARY KEY,
        position REAL NOT NULL,
        duration REAL NOT NULL,
        saved_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0
      )`
    )
    .run();
  // Tables created before bulk sync existed lack updated_at; their rows get 0
  // and so come back on every device's first full sync.
  try {
    await db
      .prepare("ALTER TABLE progress ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // duplicate column — already migrated
  }
  await db
    .prepare("CREATE INDEX IF NOT EXISTS progress_updated_at ON progress (updated_at)")
    .run();
  schemaReady = true;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET" && request.method !== "PUT") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!env.DB) return json({ error: "DB binding not configured" }, 500);
  if (!(await isOwner(request, env))) return json({ error: "Unauthorized" }, 401);

  await ensureSchema(env.DB);

  if (request.method === "GET") {
    const params = new URL(request.url).searchParams;

    if (params.has("since")) {
      const since = Number(params.get("since"));
      if (!Number.isFinite(since) || since < 0) return json({ error: "Bad since" }, 400);

      // >= so a write landing in the same millisecond as the cursor isn't
      // skipped; re-sending a row is harmless (the client keeps the newer one).
      const { results } = await env.DB.prepare(
        `SELECT video_id, position, duration, saved_at, updated_at
         FROM progress WHERE updated_at >= ?1`
      )
        .bind(since)
        .all<ProgressListRow>();

      let cursor = since;
      const entries = results.map((r) => {
        if (r.updated_at > cursor) cursor = r.updated_at;
        return {
          videoId: r.video_id,
          position: r.position,
          duration: r.duration,
          savedAt: r.saved_at,
        };
      });
      return json({ entries, cursor });
    }

    const videoId = params.get("id") ?? "";
    if (!VIDEO_ID.test(videoId)) return json({ error: "Bad video id" }, 400);

    const row = await env.DB.prepare(
      "SELECT position, duration, saved_at FROM progress WHERE video_id = ?1"
    )
      .bind(videoId)
      .first<ProgressRow>();

    return json(
      row
        ? { position: row.position, duration: row.duration, savedAt: row.saved_at }
        : null
    );
  }

  let body: { videoId?: unknown; position?: unknown; duration?: unknown; savedAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const { videoId, position, duration, savedAt } = body;
  if (
    typeof videoId !== "string" ||
    !VIDEO_ID.test(videoId) ||
    typeof position !== "number" ||
    typeof duration !== "number" ||
    typeof savedAt !== "number" ||
    !Number.isFinite(position) ||
    !Number.isFinite(duration) ||
    !Number.isFinite(savedAt) ||
    position < 0 ||
    duration < 0
  ) {
    return json({ error: "Bad body" }, 400);
  }

  const clampedSavedAt = Math.min(Math.round(savedAt), Date.now() + MAX_CLOCK_SKEW_MS);

  // Only overwrite when this write is newer — a late keepalive request from a
  // closed tab must not clobber progress made since on another device.
  await env.DB.prepare(
    `INSERT INTO progress (video_id, position, duration, saved_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(video_id) DO UPDATE SET
       position = excluded.position,
       duration = excluded.duration,
       saved_at = excluded.saved_at,
       updated_at = excluded.updated_at
     WHERE excluded.saved_at > progress.saved_at`
  )
    .bind(videoId, position, duration, clampedSavedAt, Date.now())
    .run();

  return json({ ok: true });
};
