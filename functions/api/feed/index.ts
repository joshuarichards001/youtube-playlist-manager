// GET /api/feed -> { generatedAt: string | null, videos: FeedVideo[] }
// Top 100 non-Short videos from subscribed channels, newest first. Owner-only.

import { ensureFeedSchema, FeedEnv, readFeed } from "../../_lib/feed";
import { isOwner, json } from "../../_lib/owner";

export const onRequestGet: PagesFunction<FeedEnv> = async ({ request, env }) => {
  if (!env.DB) return json({ error: "DB binding not configured" }, 500);
  if (!(await isOwner(request, env))) return json({ error: "Unauthorized" }, 401);
  await ensureFeedSchema(env.DB);
  return json(await readFeed(env.DB));
};
