// POST /api/feed/channel  body { channelId, title } -> { ok: boolean, count: number }
// Refreshes one subscribed channel's recent uploads into the feed table, and
// (re)subscribes it to WebSub push if its lease is missing or nearly expired.

import { CHANNEL_ID, ensureFeedSchema, FeedEnv, refreshChannel } from "../../_lib/feed";
import { isOwner, json } from "../../_lib/owner";
import { ensurePushSubscription, pushCallbackUrl, pushSecret } from "../../_lib/websub";

export const onRequestPost: PagesFunction<FeedEnv> = async ({ request, env }) => {
  if (!env.DB) return json({ error: "DB binding not configured" }, 500);
  if (!(await isOwner(request, env))) return json({ error: "Unauthorized" }, 401);
  await ensureFeedSchema(env.DB);

  const body = await request.json<Record<string, unknown>>().catch(() => null);
  const channelId = body?.channelId;
  if (typeof channelId !== "string" || !CHANNEL_ID.test(channelId)) {
    return json({ error: "Bad body" }, 400);
  }
  const title = typeof body?.title === "string" ? body.title.slice(0, 200) : channelId;
  const accessToken = (request.headers.get("Authorization") ?? "").slice(7);

  const count = await refreshChannel(env.DB, channelId, title, accessToken);

  const callback = pushCallbackUrl(request);
  const secret = await pushSecret(env);
  if (callback && secret) {
    // Push is an optimisation; the sweep result stands even if this fails.
    await ensurePushSubscription(env.DB, channelId, callback, secret).catch(() => {});
  }
  return json({ ok: count !== null, count: count ?? 0 });
};
