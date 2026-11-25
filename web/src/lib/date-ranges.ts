/**
 * The catalogue's date filters (BF-100), in Kazakhstan time (UTC+5 all year).
 * Each returns ISO bounds for the API's starts_after / starts_before.
 */
export const WHEN = ["today", "tomorrow", "weekend", "week"] as const;
export type When = (typeof WHEN)[number];

const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isWhen(value: unknown): value is When {
  return typeof value === "string" && (WHEN as readonly string[]).includes(value);
}

/** Local midnight (UTC+5) of the day `days` from today, as a UTC Date. */
function localMidnight(now: Date, days: number): Date {
  const local = new Date(now.getTime() + OFFSET_MS);
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightLocal - OFFSET_MS + days * DAY_MS);
}

export function rangeFor(when: When | undefined, now = new Date()): { after: string; before?: string } {
  const iso = (d: Date) => d.toISOString();
  switch (when) {
    case "today":
      return { after: iso(now), before: iso(localMidnight(now, 1)) };
    case "tomorrow":
      return { after: iso(localMidnight(now, 1)), before: iso(localMidnight(now, 2)) };
    case "weekend": {
      const weekday = new Date(now.getTime() + OFFSET_MS).getUTCDay(); // 0 Sunday .. 6 Saturday
      const toSaturday = weekday === 0 ? -1 : 6 - weekday;
      const start = weekday === 6 || weekday === 0 ? now : localMidnight(now, toSaturday);
      return { after: iso(start), before: iso(localMidnight(now, toSaturday + 2)) };
    }
    case "week":
      return { after: iso(now), before: iso(new Date(now.getTime() + 7 * DAY_MS)) };
    default:
      return { after: iso(now) };
  }
}
