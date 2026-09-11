import { useEffect, useState } from "react";
import useStore from "../helpers/store";
import useAuth from "../hooks/useAuth";
import { fetchSubscriptionsAPI } from "../helpers/youtubeAPI/subscriptionAPI";
import { fetchUserAPI } from "../helpers/youtubeAPI/userAPI";
import DowntimeNotice from "./DowntimeNotice";
import HomePage from "./HomePage";
import LandingPage from "./LandingPage";

// Site is available between 14:00 and 22:00 Europe/London time.
const OPEN_HOUR = 14;
const CLOSE_HOUR = 22;

const getLondonTime = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  return { hour, minute };
};

const isDowntime = () => {
  const { hour } = getLondonTime();
  return hour >= CLOSE_HOUR || hour < OPEN_HOUR;
};

// Minutes remaining until the site reopens at OPEN_HOUR, or 0 if it's already open.
const minutesUntilOpen = () => {
  const { hour, minute } = getLondonTime();
  if (hour >= OPEN_HOUR && hour < CLOSE_HOUR) return 0;

  const hoursUntilOpen = hour < OPEN_HOUR ? OPEN_HOUR - hour : 24 - hour + OPEN_HOUR;
  return hoursUntilOpen * 60 - minute;
};

const App = () => {
  const accessToken = useStore((state) => state.accessToken);
  const authLoading = useStore((state) => state.authLoading);
  const setUser = useStore((state) => state.setUser);
  const setSubscriptions = useStore((state) => state.setSubscriptions);
  const login = useAuth();
  const [downtime, setDowntime] = useState(isDowntime);
  const [minutesLeft, setMinutesLeft] = useState(minutesUntilOpen);

  useEffect(() => {
    const id = setInterval(() => {
      setDowntime(isDowntime());
      setMinutesLeft(minutesUntilOpen());
    }, 60_000);
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

  if (downtime) return <DowntimeNotice minutesLeft={minutesLeft} />;

  if (authLoading) return null;

  return accessToken ? (
    <HomePage />
  ) : (
    <LandingPage onLogin={login} />
  );
};

export default App;
