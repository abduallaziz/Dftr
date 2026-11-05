export type Lang = "ar" | "en" | "bn";
export type Role = "employee" | "accountant";

export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  name_bn: string;
  icon: string;
  sort_order: number;
  is_active?: boolean;
}

export interface Expense {
  id: number;
  category_id: string;
  amount: number;
  created_at: string;
  report_date?: string;
}

export interface DailyReport {
  report_date: string;
  employee_total_cars: number | null;
  free_large: number;
  free_small: number;
  mada: number;
  visa: number;
  mastercard: number;
  cash: number;
}

export type PaymentKey = "mada" | "visa" | "mastercard" | "cash";
export const PAYMENT_KEYS: readonly PaymentKey[] = ["mada", "visa", "mastercard", "cash"];

export interface EmployeeToday {
  date: string;
  categories: Category[];
  daily: DailyReport | null;
  expenses: Expense[];
}

export interface Summary {
  total_expenses: number;
  entries_count: number;
  by_category: Record<string, number>;
  free_large: number;
  free_small: number;
  mada: number;
  visa: number;
  mastercard: number;
  cash: number;
  total_cars: number;
  free_cars_on_total_days: number;
  days_match: number;
  days_mismatch: number;
}

export interface DailyRow {
  report_date: string;
  has_report: boolean;
  free_large: number | null;
  free_small: number | null;
  mada: number | null;
  visa: number | null;
  mastercard: number | null;
  cash: number | null;
  total_cars: number | null;
  employee_total_cars: number | null;
  total_expenses: number;
  by_category: Record<string, number>;
  entries_count: number;
}

export interface DailyPage {
  total_count: number;
  rows: DailyRow[];
}

export interface DayEntry {
  id: number;
  category_id: string;
  amount: number;
  created_at: string;
}

export type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface DateRange {
  from: string;
  to: string;
}
