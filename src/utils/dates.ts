import type { DateRange, Period } from "../types";

export const REPORT_TZ = "Asia/Riyadh";

const pad = (n: number): string => String(n).padStart(2, "0");

export function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Parses YYYY-MM-DD as a UTC midnight date (no local timezone involved). */
export function fromIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/** Today's calendar date in Saudi Arabia (Asia/Riyadh), independent of the device timezone. */
export function riyadhToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(iso: string, n: number): string {
  const d = fromIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** Weeks run Sunday..Saturday (Saudi convention). */
export function startOfWeek(iso: string): string {
  return addDays(iso, -fromIso(iso).getUTCDay());
}

export function addMonths(iso: string, n: number): string {
  const d = fromIso(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toIso(d);
}

/** Inclusive date range covering the period that contains `anchor`. */
export function rangeFor(period: Exclude<Period, "custom">, anchor: string): DateRange {
  const d = fromIso(anchor);
  switch (period) {
    case "daily":
      return { from: anchor, to: anchor };
    case "weekly": {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 6) };
    }
    case "monthly": {
      const from = toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
      const to = toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
      return { from, to };
    }
    case "yearly": {
      const y = d.getUTCFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
  }
}

/** Moves the anchor by one period (direction -1 or 1). */
export function shiftAnchor(period: Exclude<Period, "custom">, anchor: string, direction: -1 | 1): string {
  switch (period) {
    case "daily":
      return addDays(anchor, direction);
    case "weekly":
      return addDays(anchor, 7 * direction);
    case "monthly":
      return addMonths(anchor, direction);
    case "yearly":
      return addMonths(anchor, 12 * direction);
  }
}
