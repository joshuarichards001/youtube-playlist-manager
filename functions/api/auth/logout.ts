export const onRequestPost: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie":
        "refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0",
    },
  });
};
