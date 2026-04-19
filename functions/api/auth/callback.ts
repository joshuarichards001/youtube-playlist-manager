const CLIENT_ID =
  "246964970891-05k3i3p0q2a97u70mla8gu854q5r624u.apps.googleusercontent.com";
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 365;

interface Env {
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { code } = await context.request.json<{ code: string }>();

  const params = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: context.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: "postmessage",
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!tokenRes.ok) {
    return new Response("Token exchange failed", { status: 400 });
  }

  const tokens = await tokenRes.json<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>();

  if (!tokens.refresh_token) {
    return new Response("No refresh token returned — re-authorize with prompt=consent", { status: 400 });
  }

  return new Response(
    JSON.stringify({ accessToken: tokens.access_token, expiresIn: tokens.expires_in }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `refreshToken=${tokens.refresh_token}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${REFRESH_TOKEN_MAX_AGE}`,
      },
    }
  );
};
