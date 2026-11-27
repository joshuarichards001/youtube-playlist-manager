// POST /api/feed/start  body { force?: boolean } -> { claimed: boolean }
// Claims the feed sweep if the last one finished over 6 hours ago (or always,
// with force) and no other client is mid-refresh. Only the claimant runs it.

import { claimRefresh, ensureFeedSchema, FeedEnv } from "../../_lib/feed";
import { isOwner, json } from "../../_lib/owner";

export const onRequestPost: PagesFunction<FeedEnv> = async ({ request, env }) => {
  if (!env.DB) return json({ error: "DB binding not configured" }, 500);
  if (!(await isOwner(request, env))) return json({ error: "Unauthorized" }, 401);
  await ensureFeedSchema(env.DB);

  const body = await request.json<{ force?: unknown }>().catch(() => ({ force: false }));
  return json({ claimed: await claimRefresh(env.DB, body.force === true) });
};
