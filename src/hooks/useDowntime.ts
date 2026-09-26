import { useEffect, useState } from "react";
import {
  AccessSchedule,
  FALLBACK_SCHEDULE,
  fetchAccessSchedule,
  minutesUntilOpen,
} from "../helpers/downtime";

const SCHEDULE_REFRESH_MS = 5 * 60_000;

// Returns undefined until the schedule has loaded, then the minutes until the
// site reopens (0 = open now, null = no Recreation Time in the coming week).
const useDowntime = () => {
  const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const load = () =>
      fetchAccessSchedule().then((next) =>
        // On failure keep the last known schedule, or fall back if there is none.
        setSchedule((prev) => next ?? prev ?? FALLBACK_SCHEDULE),
      );

    load();
    const id = setInterval(load, SCHEDULE_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!schedule) return undefined;
  return minutesUntilOpen(schedule, now);
};

export default useDowntime;
