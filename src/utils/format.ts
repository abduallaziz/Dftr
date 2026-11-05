import type { Lang } from "../types";
import { REPORT_TZ, fromIso } from "./dates";

// Latin digits everywhere so numbers match the numeric input fields on every device.
const LOCALES: Record<Lang, string> = {
  ar: "ar-SA-u-nu-latn-ca-gregory",
  en: "en-US",
  bn: "bn-BD-u-nu-latn",
};

export function formatSar(value: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatInt(value: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(value);
}

export function formatDate(iso: string, lang: Lang, opts?: { weekday?: boolean }): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(opts?.weekday ? { weekday: "short" } : {}),
  }).format(fromIso(iso));
}

export function formatMonth(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", year: "numeric", month: "long" }).format(fromIso(iso));
}

/** Exact registration time of a server timestamp, shown in Saudi time. */
export function formatTime(timestamp: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: REPORT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

export function newClientKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Normalizes user text to a positive amount with max 2 decimals, or null when invalid. */
export function parseAmountInput(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= 10_000_000 ? n : null;
}

/** Payment fields allow zero; empty means zero. Returns null when invalid. */
export function parsePaymentInput(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (s === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n <= 100_000_000 ? n : null;
}
