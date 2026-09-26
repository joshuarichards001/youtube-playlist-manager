// The site is only available while NextDNS Parental Control would let YouTube
// through. /api/downtime returns the YouTube service's Recreation Time
// schedule; see functions/api/downtime.ts.

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Weekday = (typeof WEEKDAYS)[number];

// Minutes from midnight. end <= start means the window runs past midnight.
interface RecreationWindow {
  start: number;
  end: number;
}

export type AccessSchedule =
  | { blocked: false }
  | {
      blocked: true;
      timezone: string;
      windows: Partial<Record<Weekday, RecreationWindow>>;
    };

// Used when NextDNS can't be reached: 14:00–22:00 UK time every day.
export const FALLBACK_SCHEDULE: AccessSchedule = {
  blocked: true,
  timezone: "Europe/London",
  windows: Object.fromEntries(
    WEEKDAYS.map((day) => [day, { start: 14 * 60, end: 22 * 60 }]),
  ),
};

export const fetchAccessSchedule = async (): Promise<AccessSchedule | null> => {
  try {
    const res = await fetch("/api/downtime");
    if (!res.ok) {
      console.warn("Downtime schedule unavailable", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch downtime schedule", error);
    return null;
  }
};

// Day index (0 = Monday) and minute of the day in the given timezone.
const getZonedTime = (timezone: string, now: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const day = WEEKDAYS.indexOf(get("weekday").toLowerCase() as Weekday);
  const minute = Number(get("hour")) * 60 + Number(get("minute"));
  return { day, minute };
};

const isOpen = (schedule: AccessSchedule, now: Date) => {
  if (!schedule.blocked) return true;

  const { day, minute } = getZonedTime(schedule.timezone, now);
  const today = schedule.windows[WEEKDAYS[day]];
  const yesterday = schedule.windows[WEEKDAYS[(day + 6) % 7]];

  if (today) {
    const wraps = today.end <= today.start;
    if (minute >= today.start && (wraps || minute < today.end)) return true;
  }
  // Tail of yesterday's window that ran past midnight.
  if (yesterday && yesterday.end <= yesterday.start && minute < yesterday.end) {
    return true;
  }
  return false;
};

// Minutes until the site next opens: 0 if open now, null if there is no
// Recreation Time in the coming week.
export const minutesUntilOpen = (
  schedule: AccessSchedule,
  now: Date,
): number | null => {
  if (isOpen(schedule, now) || !schedule.blocked) return 0;

  const { day, minute } = getZonedTime(schedule.timezone, now);
  for (let offset = 0; offset <= 7; offset++) {
    const window = schedule.windows[WEEKDAYS[(day + offset) % 7]];
    if (!window) continue;
    const diff = offset * 24 * 60 + window.start - minute;
    if (diff > 0) return diff;
  }
  return null;
};
