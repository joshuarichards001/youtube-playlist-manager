// Shared by the owner-only endpoints (/api/progress, /api/history). Exports no
// onRequest* handler, so Pages doesn't route it.

const CLIENT_ID =
  "246964970891-05k3i3p0q2a97u70mla8gu854q5r624u.apps.googleusercontent.com";

export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export interface OwnerEnv {
  ALLOWED_EMAIL: string;
}

interface TokenInfo {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
}

// Verified access tokens -> expiry (ms). Lives as long as the isolate, so most
// requests skip the round trip to Google.
const verifiedTokens = new Map<string, number>();

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// True when the request carries a Google access token issued to our client ID
// for ALLOWED_EMAIL.
export async function isOwner(request: Request, env: OwnerEnv): Promise<boolean> {
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
