// POST /api/feed/finish  body { channelIds: string[] } -> { generatedAt, videos }
// Ends a refresh: drops videos from channels not in channelIds (unsubscribed),
// unsubscribes them from WebSub push, stamps refreshed_at, and returns the
// updated feed.

import { CHANNEL_ID, ensureFeedSchema, FeedEnv, finishRefresh, readFeed } from "../../_lib/feed";
import { isOwner, json } from "../../_lib/owner";
import { pruneSubscriptions, pushCallbackUrl, pushSecret } from "../../_lib/websub";

export const onRequestPost: PagesFunction<FeedEnv> = async ({ request, env }) => {
  if (!env.DB) return json({ error: "DB binding not configured" }, 500);
  if (!(await isOwner(request, env))) return json({ error: "Unauthorized" }, 401);
  await ensureFeedSchema(env.DB);

  const body = await request.json<{ channelIds?: unknown }>().catch(() => null);
  const ids = Array.isArray(body?.channelIds) ? body.channelIds : [];
  const valid = ids.filter((id): id is string => typeof id === "string" && CHANNEL_ID.test(id));
  // An empty list would wipe the whole feed; refuse rather than guess.
  if (valid.length === 0 || valid.length > 5000) return json({ error: "Bad body" }, 400);

  await finishRefresh(env.DB, valid);
  await pruneSubscriptions(env.DB, valid, pushCallbackUrl(request), await pushSecret(env)).catch(
    () => {}
  );
  return json(await readFeed(env.DB));
};
