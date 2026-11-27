// POST /api/feed/channel  body { channelId, title } -> { ok: boolean, count: number }
// Refreshes one subscribed channel's recent uploads into the feed table.

import { CHANNEL_ID, ensureFeedSchema, FeedEnv, refreshChannel } from "../../_lib/feed";
import { isOwner, json } from "../../_lib/owner";

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
  return json({ ok: count !== null, count: count ?? 0 });
};
