import { useCallback, useEffect, useRef } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import useStore from "../helpers/store";

const REFRESH_LEAD_MS = 5 * 60 * 1000;
const SCOPE =
  "openid email https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl";

export default function useAuth() {
  const setAccessToken = useStore((s) => s.setAccessToken);
  const setAuthLoading = useStore((s) => s.setAuthLoading);
  const silentRefreshRef = useRef<() => Promise<void>>(async () => {});

  const scheduleRefresh = useCallback((expiresIn: number) => {
    const delay = Math.max(expiresIn * 1000 - REFRESH_LEAD_MS, 0);
    window.setTimeout(() => silentRefreshRef.current(), delay);
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        setAccessToken(null);
        return;
      }
      const data: { accessToken: string; expiresIn: number } = await res.json();
      setAccessToken(data.accessToken);
      scheduleRefresh(data.expiresIn);
    } finally {
      setAuthLoading(false);
    }
  }, [setAccessToken, setAuthLoading, scheduleRefresh]);

  silentRefreshRef.current = silentRefresh;

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const login = useGoogleLogin({
    flow: "auth-code",
    scope: SCOPE,
    // Not in the library's TS types but forwarded verbatim to GIS initCodeClient;
    // forces Google to re-issue a refresh_token even if the app was previously authorized.
    ...({ prompt: "consent" } as object),
    onSuccess: async (res) => {
      const callbackRes = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: res.code }),
      });
      if (!callbackRes.ok) {
        const message = await callbackRes.text();
        console.error("Auth callback failed:", message);
        if (callbackRes.status === 403) {
          alert("This application is restricted to its owner. Your Google account is not authorized.");
        }
        return;
      }
      const data: { accessToken: string; expiresIn: number } =
        await callbackRes.json();
      setAccessToken(data.accessToken);
      scheduleRefresh(data.expiresIn);
    },
    onError: (err) => console.error("Google login error:", err),
  });

  return useCallback(() => login(), [login]);
}
