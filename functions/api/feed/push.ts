// WebSub callback for YouTube upload notifications. Public (the hub calls it),
// so nothing here trusts the caller:
//   GET  -> intent verification: echo hub.challenge only for subscriptions we
//           asked for (a row exists) or unsubscribes we asked for (no row).
//   POST -> Atom notification: ignored unless the HMAC signature matches our
//           secret and the channel is one we subscribed to.

import {
  CHANNEL_ID,
  ensureFeedSchema,
  FeedEnv,
  FeedVideo,
  Fetched,
  isoDate,
  Loose,
  parser,
  upsertVideos,
} from "../../_lib/feed";
import { channelFromTopic, confirmLease, isPushChannel, pushSecret, validSignature } from "../../_lib/websub";

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain" } });

export const onRequestGet: PagesFunction<FeedEnv> = async ({ request, env }) => {
  if (!env.DB) return text("DB binding not configured", 500);
  await ensureFeedSchema(env.DB);

  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const challenge = params.get("hub.challenge");
  const channelId = channelFromTopic(params.get("hub.topic"));
  if (!challenge || !channelId || !CHANNEL_ID.test(channelId)) return text("Bad request", 400);

  const wanted = await isPushChannel(env.DB, channelId);
  if (mode === "subscribe" && wanted) {
    await confirmLease(env.DB, channelId, Number(params.get("hub.lease_seconds")));
    return text(challenge);
  }
  if (mode === "unsubscribe" && !wanted) return text(challenge);
  // "denied", or a request we didn't make.
  return text("Not found", 404);
};

export const onRequestPost: PagesFunction<FeedEnv> = async ({ request, env }) => {
  // Per the WebSub spec, acknowledge with 2xx even when the message is
  // rejected, so the hub doesn't keep retrying it.
  const ack = new Response(null, { status: 204 });
  if (!env.DB) return ack;
  const secret = await pushSecret(env);
  if (!secret) return ack;

  const body = await request.text();
  if (body.length > 256 * 1024) return ack;
  if (!(await validSignature(request.headers.get("X-Hub-Signature"), body, secret))) return ack;
  await ensureFeedSchema(env.DB);

  let doc: Loose;
  try {
    doc = parser.parse(body);
  } catch {
    return ack;
  }
  const feed: Loose = doc?.feed ?? {};
  const asList = (x: unknown): Loose[] => (x ? (Array.isArray(x) ? x : [x]) : []);

  // Deleted (or made private) videos.
  const deleted = asList(feed["at:deleted-entry"])
    .map((e) => String(e?.["@_ref"] ?? "").replace(/^yt:video:/, ""))
    .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id));
  if (deleted.length) {
    await env.DB
      .prepare("DELETE FROM feed_videos WHERE video_id IN (SELECT value FROM json_each(?1))")
      .bind(JSON.stringify(deleted))
      .run();
  }

  // New or updated videos. Pushes carry no thumbnail or view count; the next
  // sweep fills in views (the upsert keeps existing counts when given 0).
  const entries = asList(feed.entry)
    .map((entry): Fetched => {
      const id = String(entry["yt:videoId"] ?? "");
      return {
        id,
        title: String(entry.title ?? ""),
        channel: String(entry.author?.name ?? ""),
        channelId: String(entry["yt:channelId"] ?? ""),
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        releaseDate: isoDate(entry.published),
        viewCount: 0,
      };
    })
    .filter((v): v is FeedVideo => Boolean(v.id && v.channel && v.releaseDate && CHANNEL_ID.test(v.channelId)));

  const videos: FeedVideo[] = [];
  for (const v of entries) {
    if (await isPushChannel(env.DB, v.channelId)) videos.push(v);
  }
  await upsertVideos(env.DB, videos);
  return ack;
};
