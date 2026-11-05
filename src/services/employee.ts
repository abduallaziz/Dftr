import type { DailyReport, EmployeeToday, Expense } from "../types";
import { callApi } from "./api";

export const employeeApi = {
  today: (token: string) => callApi<EmployeeToday>("employee-api", token, { action: "get_today" }),
  submitExpense: (token: string, input: { category_id: string; amount: number; client_key: string }) =>
    callApi<{ expense: Expense; duplicate: boolean }>("employee-api", token, { action: "submit_expense", ...input }),
  saveDaily: (token: string, fields: Partial<Omit<DailyReport, "report_date">>) =>
    callApi<{ daily: DailyReport; accountant_total_cars: number | null }>("employee-api", token, { action: "save_daily", ...fields }),
};
