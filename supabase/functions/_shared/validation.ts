// Pure validation helpers shared by both Edge Functions (and unit-tested with Vitest).
// No imports so it runs unchanged under Deno and Node.

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_RE = /^[a-z][a-z0-9_]{1,40}$/;

export const MAX_COUNT = 10000;
export const MAX_AMOUNT = 10_000_000;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Accepts a number or numeric string, max 2 decimals. */
export function parseMoney(v: unknown, opts: { allowZero: boolean }): Result<number> {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v.trim())) n = Number(v.trim());
  else return fail("invalid_amount");
  if (!Number.isFinite(n)) return fail("invalid_amount");
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return fail("invalid_amount");
  if (n < 0 || (!opts.allowZero && n === 0)) return fail("invalid_amount");
  if (n > MAX_AMOUNT) return fail("invalid_amount");
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export function parseCount(v: unknown): Result<number> {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_COUNT) return fail("invalid_count");
  return { ok: true, value: v };
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export interface ExpenseInput {
  category_id: string;
  amount: number;
  client_key: string;
}

export function parseExpense(body: Record<string, unknown>): Result<ExpenseInput> {
  const cat = body.category_id;
  if (typeof cat !== "string" || !CATEGORY_RE.test(cat)) return fail("invalid_category");
  const amount = parseMoney(body.amount, { allowZero: false });
  if (!amount.ok) return amount;
  const key = body.client_key;
  if (typeof key !== "string" || !UUID_RE.test(key)) return fail("invalid_client_key");
  return { ok: true, value: { category_id: cat, amount: amount.value, client_key: key.toLowerCase() } };
}

export interface DailyUpdate {
  employee_total_cars?: number;
  free_large?: number;
  free_small?: number;
  mada?: number;
  visa?: number;
  mastercard?: number;
  cash?: number;
}

const COUNT_FIELDS = ["employee_total_cars", "free_large", "free_small"] as const;
const MONEY_FIELDS = ["mada", "visa", "mastercard", "cash"] as const;

/** Partial update: only provided fields are validated and returned. At least one is required. */
export function parseDailyUpdate(body: Record<string, unknown>): Result<DailyUpdate> {
  const out: DailyUpdate = {};
  for (const f of COUNT_FIELDS) {
    if (body[f] === undefined) continue;
    const r = parseCount(body[f]);
    if (!r.ok) return r;
    out[f] = r.value;
  }
  for (const f of MONEY_FIELDS) {
    if (body[f] === undefined) continue;
    const r = parseMoney(body[f], { allowZero: true });
    if (!r.ok) return r;
    out[f] = r.value;
  }
  if (Object.keys(out).length === 0) return fail("nothing_to_save");
  return { ok: true, value: out };
}

export interface TotalCarsInput {
  date: string;
  total_cars: number;
}

export function parseTotalCars(body: Record<string, unknown>): Result<TotalCarsInput> {
  if (!isValidDate(body.date)) return fail("invalid_date");
  const n = parseCount(body.total_cars);
  if (!n.ok) return n;
  return { ok: true, value: { date: body.date, total_cars: n.value } };
}

export interface RangeInput {
  from: string;
  to: string;
}

export function parseRange(body: Record<string, unknown>): Result<RangeInput> {
  const { from, to } = body;
  if (!isValidDate(from) || !isValidDate(to)) return fail("invalid_date");
  if (from > to) return fail("invalid_range");
  // Guard against absurd ranges (max ~ 11 years).
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (days > 4000) return fail("invalid_range");
  return { ok: true, value: { from, to } };
}

export interface ListInput extends RangeInput {
  sort: "date" | "amount";
  dir: "asc" | "desc";
  limit: number;
  offset: number;
}

export function parseList(body: Record<string, unknown>): Result<ListInput> {
  const range = parseRange(body);
  if (!range.ok) return range;
  const sort = body.sort ?? "date";
  const dir = body.dir ?? "desc";
  if (sort !== "date" && sort !== "amount") return fail("invalid_sort");
  if (dir !== "asc" && dir !== "desc") return fail("invalid_sort");
  const limit = body.limit ?? 20;
  const offset = body.offset ?? 0;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) return fail("invalid_page");
  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) return fail("invalid_page");
  return { ok: true, value: { ...range.value, sort, dir, limit, offset } };
}
