import type { AdminDay, AdminExpense, AuditEntry, Category, DailyPage } from "../types";
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
  updateExpense: (t: string, id: number, patch: { amount?: number; category_id?: string }) =>
    call<{ expense: AdminExpense }>(t, { action: "update_expense", id, ...patch }),
  deleteExpense: (t: string, id: number) => call<{ ok: true }>(t, { action: "delete_expense", id }),
  addExpense: (t: string, date: string, category_id: string, amount: number) =>
    call<{ expense: AdminExpense }>(t, { action: "add_expense", date, category_id, amount }),
  saveDay: (t: string, p: DayEditPayload) => call<{ ok: true }>(t, { action: "save_day", ...p }),
  deleteDayData: (t: string, date: string) => call<{ ok: true }>(t, { action: "delete_day_data", date }),
  saveCategory: (t: string, c: CategoryPayload) => call<{ category: Category }>(t, { action: "save_category", ...c }),
  counts: (t: string, from: string, to: string) => call<{ rows: CountRow[] }>(t, { action: "counts", from, to }),
  getSettings: (t: string) => call<{ show_payments_to_accountant: boolean }>(t, { action: "get_settings" }),
  setPaymentsVisible: (t: string, value: boolean) => call<{ ok: true }>(t, { action: "set_setting", key: "show_payments_to_accountant", value }),
  audit: (t: string) => call<{ entries: AuditEntry[] }>(t, { action: "audit" }),
};
