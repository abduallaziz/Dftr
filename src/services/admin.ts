import type { AdminDay, AdminExpense, AuditEntry, Category, DailyPage, Lang, PaymentMethod } from "../types";
import { callApi } from "./api";

const call = <T>(token: string, body: Record<string, unknown>) => callApi<T>("admin-api", token, body);

export interface CountRow {
  report_date: string;
  employee: number | null;
  accountant: number | null;
}

export interface DayEditPayload {
  date: string;
  daily: Record<string, number | null>;
  total_cars?: number | null;
}

export interface CategoryPayload {
  id: string;
  name_ar: string;
  name_en: string;
  name_bn: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  create: boolean;
}

export const adminApi = {
  day: (t: string, date: string) => call<AdminDay>(t, { action: "get_day", date }),
  days: (t: string, from: string, to: string) => call<DailyPage>(t, { action: "days", from, to, sort: "date", dir: "desc", limit: 100, offset: 0 }),
  updateExpense: (t: string, id: number, patch: { amount?: number; category_id?: string; payment_method?: PaymentMethod; note_ar?: string | null; note_en?: string | null; note_bn?: string | null }) =>
    call<{ expense: AdminExpense }>(t, { action: "update_expense", id, ...patch }),
  deleteExpense: (t: string, id: number) => call<{ ok: true }>(t, { action: "delete_expense", id }),
  addExpense: (t: string, date: string, category_id: string, amount: number, payment_method: PaymentMethod = "cash", item?: { note: string; note_lang: Lang }) =>
    call<{ expense: AdminExpense }>(t, { action: "add_expense", date, category_id, amount, payment_method, ...(item ?? {}) }),
  saveDay: (t: string, p: DayEditPayload) => call<{ ok: true }>(t, { action: "save_day", ...p }),
  deleteDayData: (t: string, date: string) => call<{ ok: true }>(t, { action: "delete_day_data", date }),
  deleteDayAll: (t: string, date: string) => call<{ ok: true; deleted: { expenses: number } }>(t, { action: "delete_day_all", date }),
  saveCategory: (t: string, c: CategoryPayload) => call<{ category: Category }>(t, { action: "save_category", ...c }),
  counts: (t: string, from: string, to: string) => call<{ rows: CountRow[] }>(t, { action: "counts", from, to }),
  getSettings: (t: string) => call<{ show_payments_to_accountant: boolean; day_cutoff_hour: number; business_today: string; translation_provider: "claude" | "free"; pending_translations: number }>(t, { action: "get_settings" }),
  setPaymentsVisible: (t: string, value: boolean) => call<{ ok: true }>(t, { action: "set_setting", key: "show_payments_to_accountant", value }),
  setCutoffHour: (t: string, value: number) => call<{ ok: true }>(t, { action: "set_setting", key: "day_cutoff_hour", value }),
  translatePending: (t: string) => call<{ provider: "claude" | "free"; tried: number; completed: number; remaining: number }>(t, { action: "translate_pending" }),
  audit: (t: string) => call<{ entries: AuditEntry[] }>(t, { action: "audit" }),
};
