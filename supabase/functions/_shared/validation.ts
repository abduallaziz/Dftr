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

export type ItemLang = "ar" | "en" | "bn";
export const ITEM_LANGS: readonly ItemLang[] = ["ar", "en", "bn"];
export const OTHER_CATEGORY = "other";

/** Free-text item name typed by the employee: 2-60 characters, one line, no control characters. */
export function parseItemName(v: unknown): Result<string> {
  if (typeof v !== "string") return fail("invalid_item");
  // deno-lint-ignore no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > 60) return fail("invalid_item");
  return { ok: true, value: s };
}

export function parseItemLang(v: unknown): Result<ItemLang> {
  if (v === undefined || v === null) return { ok: true, value: "bn" };
  return typeof v === "string" && (ITEM_LANGS as readonly string[]).includes(v) ? { ok: true, value: v as ItemLang } : fail("invalid_item");
}

export type PaymentMethod = "cash" | "card";

/** Missing = cash (the default). Anything other than "cash" or "card" is rejected. */
export function parsePaymentMethod(v: unknown): Result<PaymentMethod> {
  if (v === undefined || v === null) return { ok: true, value: "cash" };
  if (v === "cash" || v === "card") return { ok: true, value: v };
  return fail("invalid_payment_method");
}

export interface ExpenseInput {
  category_id: string;
  amount: number;
  client_key: string;
  payment_method: PaymentMethod;
  /** Only for the "other" category: what was bought, in the language the employee wrote. */
  item?: { text: string; lang: ItemLang };
}

export function parseExpense(body: Record<string, unknown>): Result<ExpenseInput> {
  const cat = body.category_id;
  if (typeof cat !== "string" || !CATEGORY_RE.test(cat)) return fail("invalid_category");
  const amount = parseMoney(body.amount, { allowZero: false });
  if (!amount.ok) return amount;
  const key = body.client_key;
  if (typeof key !== "string" || !UUID_RE.test(key)) return fail("invalid_client_key");
  const method = parsePaymentMethod(body.payment_method);
  if (!method.ok) return method;
  const out: ExpenseInput = { category_id: cat, amount: amount.value, client_key: key.toLowerCase(), payment_method: method.value };
  if (cat === OTHER_CATEGORY) {
    // "Other" is only valid together with a name, otherwise nobody could tell what the money was spent on.
    const text = parseItemName(body.note);
    if (!text.ok) return text;
    const lang = parseItemLang(body.note_lang);
    if (!lang.ok) return lang;
    out.item = { text: text.value, lang: lang.value };
  }
  return { ok: true, value: out };
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

// ---------- Admin (owner) validation ----------

export const ICON_NAMES = ["Truck", "Droplets", "SprayCan", "Sparkles", "CircleDot", "Flame", "Wind", "Package", "ShoppingCart"] as const;

export function parseId(v: unknown): Result<number> {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) return fail("invalid_id");
  return { ok: true, value: v };
}

export function parseDate(v: unknown): Result<string> {
  return isValidDate(v) ? { ok: true, value: v } : fail("invalid_date");
}

export interface ExpensePatch {
  id: number;
  amount?: number;
  category_id?: string;
  payment_method?: PaymentMethod;
  /** Owner corrections of the three item texts. null clears one, undefined leaves it. */
  notes?: Partial<Record<ItemLang, string | null>>;
}

export function parseExpensePatch(body: Record<string, unknown>): Result<ExpensePatch> {
  const id = parseId(body.id);
  if (!id.ok) return id;
  const out: ExpensePatch = { id: id.value };
  if (body.amount !== undefined) {
    const a = parseMoney(body.amount, { allowZero: false });
    if (!a.ok) return a;
    out.amount = a.value;
  }
  if (body.category_id !== undefined) {
    if (typeof body.category_id !== "string" || !CATEGORY_RE.test(body.category_id)) return fail("invalid_category");
    out.category_id = body.category_id;
  }
  if (body.payment_method !== undefined) {
    const m = parsePaymentMethod(body.payment_method);
    if (!m.ok) return m;
    out.payment_method = m.value;
  }
  for (const l of ITEM_LANGS) {
    const raw = body[`note_${l}`];
    if (raw === undefined) continue;
    out.notes ??= {};
    if (raw === null || raw === "") out.notes[l] = null;
    else {
      const t = parseItemName(raw);
      if (!t.ok) return t;
      out.notes[l] = t.value;
    }
  }
  if (out.amount === undefined && out.category_id === undefined && out.payment_method === undefined && out.notes === undefined) return fail("nothing_to_save");
  return { ok: true, value: out };
}

export interface NewExpense {
  date: string;
  category_id: string;
  amount: number;
  payment_method: PaymentMethod;
  item?: { text: string; lang: ItemLang };
}

export function parseNewExpense(body: Record<string, unknown>): Result<NewExpense> {
  const d = parseDate(body.date);
  if (!d.ok) return d;
  if (typeof body.category_id !== "string" || !CATEGORY_RE.test(body.category_id)) return fail("invalid_category");
  const a = parseMoney(body.amount, { allowZero: false });
  if (!a.ok) return a;
  const m = parsePaymentMethod(body.payment_method);
  if (!m.ok) return m;
  const out: NewExpense = { date: d.value, category_id: body.category_id, amount: a.value, payment_method: m.value };
  if (body.category_id === OTHER_CATEGORY) {
    const text = parseItemName(body.note);
    if (!text.ok) return text;
    const lang = parseItemLang(body.note_lang);
    if (!lang.ok) return lang;
    out.item = { text: text.value, lang: lang.value };
  }
  return { ok: true, value: out };
}

export interface DayEdit {
  date: string;
  daily: Omit<DailyUpdate, "employee_total_cars"> & { employee_total_cars?: number | null };
  /** undefined = untouched, null = remove the accountant count */
  total_cars?: number | null;
}

export function parseDayEdit(body: Record<string, unknown>): Result<DayEdit> {
  const d = parseDate(body.date);
  if (!d.ok) return d;
  const src = isRecord(body.daily) ? body.daily : {};
  const daily: DayEdit["daily"] = {};
  if (src.employee_total_cars === null) daily.employee_total_cars = null;
  const rest = { ...src };
  delete rest.employee_total_cars;
  if (src.employee_total_cars !== undefined && src.employee_total_cars !== null) rest.employee_total_cars = src.employee_total_cars;
  if (Object.keys(rest).length > 0) {
    const parsed = parseDailyUpdate(rest);
    if (!parsed.ok) return parsed;
    Object.assign(daily, parsed.value);
  }
  let total: number | null | undefined;
  if (body.total_cars === null) total = null;
  else if (body.total_cars !== undefined) {
    const n = parseCount(body.total_cars);
    if (!n.ok) return n;
    total = n.value;
  }
  if (Object.keys(daily).length === 0 && total === undefined) return fail("nothing_to_save");
  return { ok: true, value: { date: d.value, daily, total_cars: total } };
}

export interface CategoryInput {
  id: string;
  name_ar: string;
  name_en: string;
  name_bn: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  create: boolean;
}

export function parseCategory(body: Record<string, unknown>): Result<CategoryInput> {
  if (typeof body.id !== "string" || !CATEGORY_RE.test(body.id)) return fail("invalid_category");
  const names: string[] = [];
  for (const k of ["name_ar", "name_en", "name_bn"] as const) {
    const v = body[k];
    if (typeof v !== "string" || v.trim().length < 1 || v.trim().length > 60) return fail("invalid_name");
    names.push(v.trim());
  }
  if (typeof body.icon !== "string" || !(ICON_NAMES as readonly string[]).includes(body.icon)) return fail("invalid_icon");
  if (typeof body.is_active !== "boolean") return fail("invalid_request");
  const so = body.sort_order;
  if (typeof so !== "number" || !Number.isInteger(so) || so < 0 || so > 1000) return fail("invalid_request");
  return {
    ok: true,
    value: {
      id: body.id, name_ar: names[0] ?? "", name_en: names[1] ?? "", name_bn: names[2] ?? "",
      icon: body.icon, is_active: body.is_active, sort_order: so, create: body.create === true,
    },
  };
}

export const SETTING_KEYS = ["show_payments_to_accountant", "day_cutoff_hour"] as const;

/** show_payments_to_accountant: boolean. day_cutoff_hour: integer 0-12 (hour of the day, Asia/Riyadh, when a new business day starts). */
export function parseSetting(body: Record<string, unknown>): Result<{ key: string; value: boolean | number }> {
  if (typeof body.key !== "string" || !(SETTING_KEYS as readonly string[]).includes(body.key)) return fail("invalid_request");
  if (body.key === "day_cutoff_hour") {
    const v = body.value;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 12) return fail("invalid_request");
    return { ok: true, value: { key: body.key, value: v } };
  }
  if (typeof body.value !== "boolean") return fail("invalid_request");
  return { ok: true, value: { key: body.key, value: body.value } };
}
