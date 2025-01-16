import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import useStore from "./store";

export default function LoginButton() {
  const accessToken = useStore((state) => state.accessToken);
  const setAccessToken = useStore((state) => state.setAccessToken);
  const setPlaylists = useStore((state) => state.setPlaylists);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setAccessToken(tokenResponse.access_token);

        const result = await axios.get(
          "https://www.googleapis.com/youtube/v3/playlists",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
            params: {
              part: "snippet",
              mine: true,
              maxResults: 100,
            },
          }
        );
        setPlaylists(result.data.items);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    },
    onError: () => {
      console.error("Login Failed");
    },
  });

  if (accessToken) {
    return null;
  }

  return (
    <button className="btn" onClick={login}>
      Login with Google
    </button>
  );
}
