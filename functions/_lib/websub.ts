// WebSub (PubSubHubbub) push for YouTube uploads. Exports no onRequest*
// handler, so Pages doesn't route it.
//
// Each subscribed channel's topic is subscribed at Google's hub with
// /api/feed/push as the callback. The hub confirms with a GET (intent
// verification) and then POSTs an Atom entry, signed with our secret, whenever
// the channel uploads or edits a video. Leases last a few days, so the browser
// sweep (/api/feed/channel) renews any that are close to expiring, and
// /api/feed/finish unsubscribes channels that are no longer followed.

import { FeedEnv } from "./feed";

const HUB = "https://pubsubhubbub.appspot.com/subscribe";
const LEASE_SECONDS = 10 * 24 * 60 * 60; // the hub may grant less
// Renew once a lease has less than this left. Must comfortably exceed the
// sweep interval (6h) so a lease never lapses between sweeps.
const RENEW_BEFORE_MS = 2 * 24 * 60 * 60_000;
// Don't re-send a subscribe request that's still awaiting verification.
const RETRY_AFTER_MS = 60 * 60_000;
// Stay under the Workers subrequest limit when unsubscribing in bulk.
const MAX_UNSUBSCRIBES_PER_CALL = 40;

export const topicFor = (channelId: string) =>
  `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;

export function channelFromTopic(topic: string | null): string | null {
  if (!topic) return null;
  try {
    const url = new URL(topic);
    return url.searchParams.get("channel_id");
  } catch {
    return null;
  }
}

// The hub can only reach the production site. Skip local dev and Pages
// preview deploys (<hash|branch>.<project>.pages.dev): subscribing from them
// would point the hub at a callback that soon stops serving this database.
export function pushCallbackUrl(request: Request): string | null {
  const { hostname, origin } = new URL(request.url);
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  if (hostname.endsWith(".pages.dev") && hostname.split(".").length > 3) return null;
  return `${origin}/api/feed/push`;
}

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmacHex(alg: "SHA-1" | "SHA-256", key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: alg }, false, [
    "sign",
  ]);
  return toHex(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

// WEBSUB_SECRET if set, otherwise derived from GOOGLE_CLIENT_SECRET so no
// extra configuration is needed. Null disables push entirely.
export async function pushSecret(env: FeedEnv): Promise<string | null> {
  if (env.WEBSUB_SECRET) return env.WEBSUB_SECRET;
  if (!env.GOOGLE_CLIENT_SECRET) return null;
  return hmacHex("SHA-256", env.GOOGLE_CLIENT_SECRET, "youtube-feed-websub");
}

// Checks an X-Hub-Signature header ("sha1=<hex>", or sha256) against the body.
export async function validSignature(
  header: string | null,
  body: string,
  secret: string
): Promise<boolean> {
  const match = header?.match(/^(sha1|sha256)=([0-9a-f]+)$/i);
  if (!match) return false;
  const expected = await hmacHex(match[1].toLowerCase() === "sha1" ? "SHA-1" : "SHA-256", secret, body);
  const given = match[2].toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function sendToHub(
  mode: "subscribe" | "unsubscribe",
  channelId: string,
  callback: string,
  secret: string
): Promise<boolean> {
  const form = new URLSearchParams({
    "hub.mode": mode,
    "hub.topic": topicFor(channelId),
    "hub.callback": callback,
    "hub.verify": "async",
  });
  if (mode === "subscribe") {
    form.set("hub.secret", secret);
    form.set("hub.lease_seconds", String(LEASE_SECONDS));
  }
  try {
    const res = await fetch(HUB, { method: "POST", body: form });
    await res.body?.cancel();
    return res.status === 202 || res.status === 204;
  } catch {
    return false;
  }
}

// Subscribes the channel to push unless it already has a healthy lease or a
// request is pending. The row is written before calling the hub because the
// hub's verification GET can arrive before the subscribe call returns, and
// /api/feed/push only confirms channels that have a row.
export async function ensurePushSubscription(
  db: D1Database,
  channelId: string,
  callback: string,
  secret: string
): Promise<void> {
  const now = Date.now();
  const row = await db
    .prepare("SELECT lease_expires_at, requested_at FROM feed_subscriptions WHERE channel_id = ?1")
    .bind(channelId)
    .first<{ lease_expires_at: number; requested_at: number }>();
  if (row && row.lease_expires_at > now + RENEW_BEFORE_MS) return;
  if (row && row.requested_at > now - RETRY_AFTER_MS) return;

  await db
    .prepare(
      `INSERT INTO feed_subscriptions (channel_id, lease_expires_at, requested_at)
       VALUES (?1, 0, ?2)
       ON CONFLICT(channel_id) DO UPDATE SET requested_at = excluded.requested_at`
    )
    .bind(channelId, now)
    .run();
  await sendToHub("subscribe", channelId, callback, secret);
}

// Called by the hub's verification GET once it accepts a subscription.
export async function confirmLease(db: D1Database, channelId: string, leaseSeconds: number) {
  const seconds = Number.isFinite(leaseSeconds) && leaseSeconds > 0 ? leaseSeconds : 5 * 24 * 60 * 60;
  await db
    .prepare("UPDATE feed_subscriptions SET lease_expires_at = ?1 WHERE channel_id = ?2")
    .bind(Date.now() + seconds * 1000, channelId)
    .run();
}

export async function isPushChannel(db: D1Database, channelId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS ok FROM feed_subscriptions WHERE channel_id = ?1")
    .bind(channelId)
    .first();
  return row !== null;
}

// Drops push subscriptions for channels not in channelIds. The rows go first,
// so any pushes still in flight for them are ignored even if the hub never
// processes the unsubscribe (the lease then just expires).
export async function pruneSubscriptions(
  db: D1Database,
  channelIds: string[],
  callback: string | null,
  secret: string | null
): Promise<void> {
  const { results } = await db
    .prepare(
      `DELETE FROM feed_subscriptions
       WHERE channel_id NOT IN (SELECT value FROM json_each(?1))
       RETURNING channel_id`
    )
    .bind(JSON.stringify(channelIds))
    .all<{ channel_id: string }>();
  if (!callback || !secret) return;
  await Promise.all(
    results
      .slice(0, MAX_UNSUBSCRIBES_PER_CALL)
      .map((r) => sendToHub("unsubscribe", r.channel_id, callback, secret))
  );
}
