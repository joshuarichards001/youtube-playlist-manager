// Cloud copy of video resume positions so they follow you between devices.
// Backed by a D1 database bound as `DB`. Only the owner (ALLOWED_EMAIL, the
// same env var the OAuth callback uses) can read or write.
//
//   GET    /api/progress?id=<videoId>  -> { position, duration, savedAt } | null
//   PUT    /api/progress               body { videoId, position, duration, savedAt }
//
// A finished video is stored as position 0 (a tombstone) rather than deleted,
// so "newest savedAt wins" also works for "I finished this on another device".

const CLIENT_ID =
  "246964970891-05k3i3p0q2a97u70mla8gu854q5r624u.apps.googleusercontent.com";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_CLOCK_SKEW_MS = 60_000;

interface Env {
  DB: D1Database;
  ALLOWED_EMAIL: string;
}

interface TokenInfo {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
}

interface ProgressRow {
  position: number;
  duration: number;
  saved_at: number;
}

// Verified access tokens -> expiry (ms). Lives as long as the isolate, so most
// saves skip the round trip to Google.
const verifiedTokens = new Map<string, number>();
let schemaReady = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function isOwner(request: Request, env: Env): Promise<boolean> {
  const allowed = env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed) return false;

  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;

  const now = Date.now();
  const cachedExpiry = verifiedTokens.get(token);
  if (cachedExpiry && cachedExpiry > now) return true;

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`
  );
  if (!res.ok) return false;
  const info = await res.json<TokenInfo>();

  const verified = info.email_verified === true || info.email_verified === "true";
  const issuedToUs = info.aud === CLIENT_ID || info.azp === CLIENT_ID;
  if (!verified || !issuedToUs || info.email?.toLowerCase() !== allowed) {
    return false;
  }

  if (verifiedTokens.size > 50) verifiedTokens.clear();
  const exp = Number(info.exp) * 1000;
  verifiedTokens.set(token, Number.isFinite(exp) ? exp : now + 5 * 60_000);
  return true;
}

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS progress (
        video_id TEXT PRIMARY KEY,
        position REAL NOT NULL,
        duration REAL NOT NULL,
        saved_at INTEGER NOT NULL
      )`
    )
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
    const videoId = new URL(request.url).searchParams.get("id") ?? "";
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
    `INSERT INTO progress (video_id, position, duration, saved_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(video_id) DO UPDATE SET
       position = excluded.position,
       duration = excluded.duration,
       saved_at = excluded.saved_at
     WHERE excluded.saved_at > progress.saved_at`
  )
    .bind(videoId, position, duration, clampedSavedAt)
    .run();

  return json({ ok: true });
};
