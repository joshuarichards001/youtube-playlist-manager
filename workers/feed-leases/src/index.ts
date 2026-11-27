// Hourly: renew WebSub leases that are close to expiring. See
// functions/_lib/websub.ts for the push flow; the hub's verification GET goes
// to the Pages callback, which records the new lease in feed_subscriptions.

import { pushSecret, renewDueLeases } from "../../../functions/_lib/websub";

interface Env {
  DB: D1Database;
  PUSH_CALLBACK_URL: string;
  GOOGLE_CLIENT_SECRET?: string;
  WEBSUB_SECRET?: string;
}

export default {
  async scheduled(_controller, env, ctx) {
    const secret = await pushSecret(env);
    if (!secret || !env.PUSH_CALLBACK_URL) {
      console.error("feed-leases: GOOGLE_CLIENT_SECRET/WEBSUB_SECRET or PUSH_CALLBACK_URL not set");
      return;
    }
    ctx.waitUntil(
      renewDueLeases(env.DB, env.PUSH_CALLBACK_URL, secret)
        .then((r) => console.log(`feed-leases: renewed ${r.accepted}/${r.sent}`))
        // The table is created by the Pages functions on first use.
        .catch((err) => console.error("feed-leases:", err))
    );
  },
} satisfies ExportedHandler<Env>;
