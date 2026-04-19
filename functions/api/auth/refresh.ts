const CLIENT_ID =
  "246964970891-05k3i3p0q2a97u70mla8gu854q5r624u.apps.googleusercontent.com";
const CLEAR_COOKIE =
  "refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0";

interface Env {
  GOOGLE_CLIENT_SECRET: string;
}

function parseCookie(header: string, name: string): string | undefined {
  return header
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const cookieHeader = context.request.headers.get("Cookie") ?? "";
  const refreshToken = parseCookie(cookieHeader, "refreshToken");

  if (!refreshToken) {
    return new Response("No refresh token", { status: 401 });
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: context.env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!tokenRes.ok) {
    return new Response("Refresh failed", {
      status: 401,
      headers: { "Set-Cookie": CLEAR_COOKIE },
    });
  }

  const tokens = await tokenRes.json<{
    access_token: string;
    expires_in: number;
  }>();

  return new Response(
    JSON.stringify({ accessToken: tokens.access_token, expiresIn: tokens.expires_in }),
    { headers: { "Content-Type": "application/json" } }
  );
};
