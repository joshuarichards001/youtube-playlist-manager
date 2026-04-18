import { useCallback, useEffect, useRef } from "react";
import {
  OverridableTokenClientConfig,
  useGoogleLogin,
  useGoogleOAuth,
} from "@react-oauth/google";
import Cookies from "js-cookie";
import useStore from "../helpers/store";

const TOKEN_COOKIE = "accessToken";
const EXPIRES_AT_COOKIE = "accessTokenExpiresAt";
const COOKIE_TTL_DAYS = 30;
const REFRESH_LEAD_MS = 5 * 60 * 1000;
const SCOPE =
  "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl";

type LoginFn = (config?: OverridableTokenClientConfig) => void;

export default function useAuth() {
  const setAccessToken = useStore((s) => s.setAccessToken);
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  const loginRef = useRef<LoginFn | null>(null);

  const scheduleRefresh = useCallback((expiresAt: number) => {
    const delay = Math.max(expiresAt - Date.now() - REFRESH_LEAD_MS, 0);
    window.setTimeout(() => loginRef.current?.({ prompt: "none" }), delay);
  }, []);

  const login = useGoogleLogin({
    flow: "implicit",
    scope: SCOPE,
    prompt: "none",
    onSuccess: (res) => {
      const expiresAt = Date.now() + res.expires_in * 1000;
      Cookies.set(TOKEN_COOKIE, res.access_token, { expires: COOKIE_TTL_DAYS });
      Cookies.set(EXPIRES_AT_COOKIE, String(expiresAt), {
        expires: COOKIE_TTL_DAYS,
      });
      setAccessToken(res.access_token);
      scheduleRefresh(expiresAt);
    },
    onError: (err) => console.error("Google login error:", err),
  });
  loginRef.current = login;

  useEffect(() => {
    if (!scriptLoadedSuccessfully) return;

    const token = Cookies.get(TOKEN_COOKIE);
    if (!token) return;

    const expiresAt = parseInt(Cookies.get(EXPIRES_AT_COOKIE) ?? "0", 10);
    if (expiresAt - Date.now() > REFRESH_LEAD_MS) {
      setAccessToken(token);
      scheduleRefresh(expiresAt);
    } else {
      login({ prompt: "none" });
    }
  }, [scriptLoadedSuccessfully, scheduleRefresh, setAccessToken, login]);

  return useCallback(() => login({ prompt: "consent" }), [login]);
}
