// Mirrors the YouTube entry of the NextDNS Parental Control settings so the
// site is only available while NextDNS would let YouTube through.
//
// Response shape (see src/helpers/downtime.ts):
//   { blocked: false }                                  — YouTube not blocked
//   { blocked: true, timezone, windows: { monday: { start, end }, ... } }
// where start/end are minutes from midnight. A missing day means no
// Recreation Time that day (blocked all day).

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

interface Env {
  NEXTDNS_API_KEY: string;
  NEXTDNS_PROFILE_ID: string;
}

interface NextDNSParentalControl {
  data: {
    services?: { id: string; active: boolean; recreation?: boolean }[];
    recreation?: {
      times?: Partial<Record<Weekday, { start: string; end: string }>>;
      timezone?: string;
    };
  };
}

// "14:00:00" or "14:00" -> 840
function toMinutes(time: string): number | undefined {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return undefined;
  return h * 60 + m;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { NEXTDNS_API_KEY, NEXTDNS_PROFILE_ID } = context.env;
  if (!NEXTDNS_API_KEY || !NEXTDNS_PROFILE_ID) {
    return json({ error: "NextDNS not configured" }, 500);
  }

  const res = await fetch(
    `https://api.nextdns.io/profiles/${NEXTDNS_PROFILE_ID}/parentalControl`,
    { headers: { "X-Api-Key": NEXTDNS_API_KEY } }
  );
  if (!res.ok) {
    return json({ error: `NextDNS returned ${res.status}` }, 502);
  }

  const { data } = await res.json<NextDNSParentalControl>();
  const youtube = data.services?.find((s) => s.id === "youtube");

  if (!youtube?.active) return json({ blocked: false });

  const windows: Partial<Record<Weekday, { start: number; end: number }>> = {};

  // Without the clock toggled on, NextDNS blocks YouTube around the clock.
  if (youtube.recreation) {
    for (const day of WEEKDAYS) {
      const time = data.recreation?.times?.[day];
      if (!time) continue;
      const start = toMinutes(time.start);
      const end = toMinutes(time.end);
      if (start === undefined || end === undefined) continue;
      windows[day] = { start, end };
    }
  }

  return json({
    blocked: true,
    timezone: data.recreation?.timezone ?? "Europe/London",
    windows,
  });
};
