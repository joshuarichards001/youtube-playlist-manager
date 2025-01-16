import { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import Cookies from "js-cookie";
import useStore from "./store";

export default function LoginButton() {
  const accessToken = useStore((state) => state.accessToken);
  const setAccessToken = useStore((state) => state.setAccessToken);

  useEffect(() => {
    const token = Cookies.get("accessToken");
    if (token) {
      setAccessToken(token);
    }
  }, [setAccessToken]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in / 60 / 60 / 24;

      setAccessToken(token);
      Cookies.set("accessToken", token, { expires: expiresIn });
    },
    onError: () => {
      console.error("Login Failed");
    },
    scope:
      "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl",
    prompt: "consent",
  });

  if (accessToken) {
    return null;
  }

  return (
    <button className="btn" onClick={() => login()}>
      Login with Google
    </button>
  );
}
