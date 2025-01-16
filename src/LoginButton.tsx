import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

interface IProps {
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
}

export default function LoginButton({ setAccessToken, setPlaylists }: IProps) {
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
      console.log("Login Failed");
    },
  });

  return (
    <button className="btn" onClick={login}>
      Login with Google
    </button>
  );
}
