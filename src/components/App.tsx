import { useEffect } from "react";
import useStore from "../helpers/store";
import useAuth from "../hooks/useAuth";
import { fetchSubscriptionsAPI } from "../helpers/youtubeAPI/subscriptionAPI";
import { fetchUserAPI } from "../helpers/youtubeAPI/userAPI";
import HomePage from "./HomePage";
import LandingPage from "./LandingPage";

const App = () => {
  const accessToken = useStore((state) => state.accessToken);
  const authLoading = useStore((state) => state.authLoading);
  const setUser = useStore((state) => state.setUser);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const login = useAuth();

  useEffect(() => {
    if (!accessToken) return;

    fetchUserAPI(accessToken).then((user) => {
      if (!user) return;

      setUser(user);
    });

    fetchSubscriptionsAPI(accessToken).then((subs) => {
      if (subs.length === 0) return;
      setSubscriptions(subs);
    });
  }, [accessToken, setUser, setSubscriptions]);

  if (authLoading) return null;

  return accessToken ? (
    <HomePage />
  ) : (
    <LandingPage onLogin={login} />
  );
};

export default App;
