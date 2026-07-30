import { useEffect, useState } from "react";
import useStore from "../helpers/store";
import useAuth from "../hooks/useAuth";
import { fetchSubscriptionsAPI } from "../helpers/youtubeAPI/subscriptionAPI";
import { fetchUserAPI } from "../helpers/youtubeAPI/userAPI";
import DowntimeNotice from "./DowntimeNotice";
import HomePage from "./HomePage";
import LandingPage from "./LandingPage";

// Site is offline between 22:00 and 12:00 Europe/London time.
const isDowntime = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour >= 22 || hour < 12;
};

const App = () => {
  const accessToken = useStore((state) => state.accessToken);
  const authLoading = useStore((state) => state.authLoading);
  const setUser = useStore((state) => state.setUser);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const login = useAuth();
  const [downtime, setDowntime] = useState(isDowntime);

  useEffect(() => {
    const id = setInterval(() => setDowntime(isDowntime()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  if (downtime) return <DowntimeNotice />;

  if (authLoading) return null;

  return accessToken ? (
    <HomePage />
  ) : (
    <LandingPage onLogin={login} />
  );
};

export default App;
