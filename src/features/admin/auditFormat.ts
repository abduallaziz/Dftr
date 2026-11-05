import type { AuditEntry, Lang } from "../../types";
import { hasKey } from "../../i18n";
import { formatDate, formatInt, formatSar, formatTime } from "../../utils/format";

export interface AuditLine {
  label: string;
  before?: string;
  after?: string;
}

export interface AuditExpenseRow {
  name: string;
  amount: string;
  time: string;
}

export interface DescribedEntry {
  title: string;
  lines: AuditLine[];
  expenses: AuditExpenseRow[];
}

interface Ctx {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: Lang;
  categoryName: (id: string) => string;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

const MONEY = new Set(["amount", "mada", "visa", "mastercard", "cash"]);
const INTS = new Set(["employee_total_cars", "total_cars", "free_large", "free_small", "sort_order"]);
// Technical fields are never shown.
const HIDDEN = new Set(["id", "key", "updated_at", "icon", "report_date", "value"]);

function fmt(field: string, v: unknown, c: Ctx): string {
  if (v === null || v === undefined) return "—";
  if (MONEY.has(field) && typeof v === "number") return formatSar(v, c.lang);
  if (INTS.has(field) && typeof v === "number") return formatInt(v, c.lang);
  if (field === "category_id" && typeof v === "string") return c.categoryName(v);
  if (field === "created_at" && typeof v === "string") return `${formatDate(v.slice(0, 10), c.lang)} ${formatTime(v, c.lang)}`;
  if (typeof v === "boolean") return v ? c.t("admin.yes") : c.t("admin.no");
  return String(v);
}

function settingValue(key: string, v: unknown, c: Ctx): string {
  if (v === null || v === undefined) return "—";
  if (key === "day_cutoff_hour" && typeof v === "number") return `${String(v).padStart(2, "0")}:00`;
  if (typeof v === "boolean") return v ? c.t("admin.valOn") : c.t("admin.valOff");
  return String(v);
}

function lineFor(field: string, before: unknown, after: unknown, mode: "insert" | "update" | "delete", c: Ctx): AuditLine | null {
  if (HIDDEN.has(field) || !hasKey(`admin.f.${field}`)) return null;
  const label = c.t(`admin.f.${field}`);
  if (mode === "insert") return { label, after: fmt(field, after, c) };
  if (mode === "delete") return { label, before: fmt(field, before, c) };
  if (JSON.stringify(before) === JSON.stringify(after)) return null; // unchanged
  return { label, before: fmt(field, before, c), after: fmt(field, after, c) };
}

export function describeEntry(e: AuditEntry, c: Ctx): DescribedEntry {
  const mode = e.action === "insert" ? "insert" : e.action === "delete" ? "delete" : "update";
  const actionLabel = c.t(`admin.action${mode[0]?.toUpperCase()}${mode.slice(1)}`);
  const what = hasKey(`admin.t.${e.table_name}`) ? c.t(`admin.t.${e.table_name}`) : e.table_name;
  const before = isRec(e.before) ? e.before : null;
  const after = isRec(e.after) ? e.after : null;
  const lines: AuditLine[] = [];
  const expenses: AuditExpenseRow[] = [];
  let subject = "";

  switch (e.table_name) {
    case "expenses":
      subject = `#${e.record_key}`;
      break;
    case "daily_reports":
    case "daily_totals":
    case "day":
      subject = formatDate(e.record_key, c.lang);
      break;
    case "expense_categories": {
      const src = after ?? before;
      const n = src ? (c.lang === "ar" ? src.name_ar : c.lang === "bn" ? src.name_bn : src.name_en) : e.record_key;
      subject = String(n ?? e.record_key);
      break;
    }
    case "app_settings": {
      const sk = `admin.s.${e.record_key}`;
      subject = hasKey(sk) ? c.t(sk) : "";
      lines.push({
        label: c.t("admin.f.value"),
        ...(mode !== "insert" ? { before: settingValue(e.record_key, before?.value, c) } : {}),
        ...(mode !== "delete" ? { after: settingValue(e.record_key, after?.value, c) } : {}),
      });
      return { title: `${actionLabel} · ${what}${subject ? `: ${subject}` : ""}`, lines, expenses };
    }
    default:
      break;
  }

  if (e.table_name === "day" && before) {
    // Whole-day deletion snapshot: { daily_report, accountant_count, expenses[] }
    const dr = isRec(before.daily_report) ? before.daily_report : null;
    const ac = isRec(before.accountant_count) ? before.accountant_count : null;
    const list = Array.isArray(before.expenses) ? before.expenses.filter(isRec) : [];
    if (dr) for (const f of ["employee_total_cars", "free_large", "free_small", "mada", "visa", "mastercard", "cash"]) {
      const l = lineFor(f, dr[f], undefined, "delete", c);
      if (l) lines.push(l);
    }
    if (ac) {
      const l = lineFor("total_cars", ac.total_cars, undefined, "delete", c);
      if (l) lines.push(l);
    }
    for (const x of list) {
      expenses.push({
        name: c.categoryName(String(x.category_id ?? "")),
        amount: formatSar(Number(x.amount ?? 0), c.lang),
        time: typeof x.created_at === "string" ? formatTime(x.created_at, c.lang) : "—",
      });
    }
    if (list.length > 0) {
      const total = list.reduce((s, x) => s + Number(x.amount ?? 0), 0);
      lines.unshift({ label: c.t("admin.dayExpenses"), before: `${formatInt(list.length, c.lang)} · ${formatSar(total, c.lang)}` });
    }
    return { title: `${actionLabel} · ${what} ${subject}`, lines, expenses };
  }

  const fields = new Set<string>([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const f of fields) {
    const l = lineFor(f, before?.[f], after?.[f], mode, c);
    if (l) lines.push(l);
  }
  // Expenses also show when they were registered.
  return { title: `${actionLabel} · ${what} ${subject}`.trim(), lines, expenses };
}
