import { useEffect, useState } from "react";
import {
  AccessSchedule,
  FALLBACK_SCHEDULE,
  fetchAccessSchedule,
  minutesUntilOpen,
} from "../helpers/downtime";

const SCHEDULE_REFRESH_MS = 5 * 60_000;

interface ScheduleState {
  schedule: AccessSchedule;
  // Set when FALLBACK_SCHEDULE is in use because NextDNS couldn't be read.
  fallbackReason?: string;
}

// Returns undefined until the schedule has loaded. minutesLeft is the minutes
// until the site reopens (0 = open now, null = no Recreation Time in the
// coming week).
const useDowntime = () => {
  const [state, setState] = useState<ScheduleState | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const load = () =>
      fetchAccessSchedule().then((result) =>
        setState((prev) => {
          if ("schedule" in result) return { schedule: result.schedule };
          // On failure keep the last known schedule, or fall back if there is none.
          if (prev && !prev.fallbackReason) return prev;
          return { schedule: FALLBACK_SCHEDULE, fallbackReason: result.error };
        }),
      );

    load();
    const id = setInterval(load, SCHEDULE_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!state) return undefined;
  return {
    minutesLeft: minutesUntilOpen(state.schedule, now),
    fallbackReason: state.fallbackReason,
  };
};

export default useDowntime;
