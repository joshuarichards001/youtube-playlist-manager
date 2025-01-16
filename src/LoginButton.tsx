import { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import useStore from "./store";

export default function LoginButton() {
  const accessToken = useStore((state) => state.accessToken);
  const setAccessToken = useStore((state) => state.setAccessToken);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setAccessToken(token);
    }
  }, [setAccessToken]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      localStorage.setItem("accessToken", token);
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
