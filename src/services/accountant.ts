import type { Category, DailyPage, DateRange, DayEntry, Summary } from "../types";
import { callApi } from "./api";

export interface ListQuery extends DateRange {
  sort: "date" | "amount";
  dir: "asc" | "desc";
  limit: number;
  offset: number;
}

export const accountantApi = {
  categories: (token: string) => callApi<{ categories: Category[] }>("accountant-api", token, { action: "categories" }),
  summary: (token: string, r: DateRange) => callApi<{ summary: Summary }>("accountant-api", token, { action: "summary", ...r }),
  daily: (token: string, q: ListQuery) => callApi<DailyPage>("accountant-api", token, { action: "daily", ...q }),
  dayEntries: (token: string, date: string) =>
    callApi<{ entries: DayEntry[] }>("accountant-api", token, { action: "day_entries", date }),
};
