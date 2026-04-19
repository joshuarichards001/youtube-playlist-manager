import { useEffect } from "react";
import useStore from "../helpers/store";
import useAuth from "../hooks/useAuth";
import { fetchUserAPI } from "../helpers/youtubeAPI/userAPI";
import HomePage from "./HomePage";
import LandingPage from "./LandingPage";

const App = () => {
  const accessToken = useStore((state) => state.accessToken);
  const authLoading = useStore((state) => state.authLoading);
  const setUser = useStore((state) => state.setUser);
  const login = useAuth();

  useEffect(() => {
    if (!accessToken) return;

    fetchUserAPI(accessToken).then((user) => {
      if (!user) return;

      setUser(user);
    });
  }, [accessToken, setUser]);

  if (authLoading) return null;

  return accessToken ? (
    <HomePage />
  ) : (
    <LandingPage onLogin={login} />
  );
};

export default App;
