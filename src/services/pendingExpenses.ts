import type { Expense } from "../types";

/**
 * Identity of a registration ATTEMPT, kept on the device until the attempt is settled.
 * A key is reused only while its outcome is unknown (the reply got lost), so a retry can never create a second row,
 * while two genuine entries with the same category and amount (each with its own key) are both saved.
 */
export interface PendingAttempt {
  key: string;
  category_id: string;
  amount: number;
  at: number; // ms since epoch when the attempt started
}

const STORE_KEY = "carwash.pendingExpenses.v1";
export const MAX_AGE_MS = 24 * 60 * 60 * 1000; // a business day
export const LEGACY_REUSE_MS = 10 * 60 * 1000; // only used when the server cannot confirm keys

let memory: PendingAttempt[] = []; // fallback when localStorage is unavailable (private mode)

const isAttempt = (v: unknown): v is PendingAttempt =>
  typeof v === "object" && v !== null &&
  typeof (v as PendingAttempt).key === "string" && typeof (v as PendingAttempt).category_id === "string" &&
  typeof (v as PendingAttempt).amount === "number" && typeof (v as PendingAttempt).at === "number";

export function loadPending(now = Date.now()): PendingAttempt[] {
  let list: PendingAttempt[];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    list = Array.isArray(parsed) ? parsed.filter(isAttempt) : [];
  } catch {
    list = memory;
  }
  return list.filter((p) => now - p.at < MAX_AGE_MS);
}

function savePending(list: PendingAttempt[]): void {
  memory = list;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    // memory fallback already updated
  }
}

export function rememberAttempt(p: PendingAttempt): void {
  savePending([...loadPending().filter((x) => x.key !== p.key), p]);
}

export function settleAttempt(key: string): void {
  savePending(loadPending().filter((x) => x.key !== key));
}

export function pendingFor(categoryId: string): PendingAttempt | undefined {
  return loadPending()
    .filter((p) => p.category_id === categoryId)
    .sort((a, b) => b.at - a.at)[0];
}

export type Reconcile =
  | { action: "fresh" } // nothing unresolved: start a new entry with a new key
  | { action: "already-saved"; expense: Expense } // the server has it: attempt settled, start a NEW entry on purpose
  | { action: "retry"; attempt: PendingAttempt }; // the server does NOT have it: finish the same attempt with the same key

/**
 * Decide what to do when the employee opens a category that has an unresolved attempt.
 * serverToday = today's rows from the server, or null when the server could not be reached.
 */
export function reconcile(pending: PendingAttempt | undefined, serverToday: Expense[] | null, now = Date.now()): Reconcile {
  if (!pending) return { action: "fresh" };
  if (serverToday === null) {
    // Cannot verify: keep the identity so that a retry stays idempotent (bounded to avoid swallowing a real new entry).
    return now - pending.at < LEGACY_REUSE_MS ? { action: "retry", attempt: pending } : { action: "fresh" };
  }
  const hit = serverToday.find((e) => e.client_key === pending.key);
  if (hit) return { action: "already-saved", expense: hit };
  const serverShowsKeys = serverToday.some((e) => typeof e.client_key === "string");
  if (serverShowsKeys || serverToday.length === 0) return { action: "retry", attempt: pending }; // verified: not saved
  // Older server that does not return keys: reuse the key for a short window only.
  return now - pending.at < LEGACY_REUSE_MS ? { action: "retry", attempt: pending } : { action: "fresh" };
}

/** An answer from the server (even a rejection) settles the attempt; no answer (network, 5xx) leaves it unresolved. */
export function isUnknownOutcome(status: number): boolean {
  return status === 0 || status >= 500;
}
