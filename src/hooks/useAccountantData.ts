import { useCallback, useEffect, useRef, useState } from "react";
import { accountantApi } from "../services/accountant";
import type { Category, DailyPage, DateRange, Summary } from "../types";

export const PAGE_SIZE = 20;

export interface Query {
  range: DateRange;
  sort: "date" | "amount";
  dir: "asc" | "desc";
  page: number;
}

export function useAccountantData(token: string, q: Query, enabled: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPayments, setShowPayments] = useState(false);
  const [serverToday, setServerToday] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const reqId = useRef(0);

  const { from, to } = q.range;
  const { sort, dir, page } = q;

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [cats, sum, day, settings] = await Promise.all([
        accountantApi.categories(token),
        accountantApi.summary(token, { from, to }),
        accountantApi.daily(token, { from, to, sort, dir, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
        accountantApi.settings(token),
      ]);
      if (id !== reqId.current) return; // a newer request superseded this one
      setCategories(cats.categories);
      setSummary(sum.summary);
      setDaily(day);
      setShowPayments(settings.show_payments);
      setServerToday(settings.today);
    } catch (e) {
      if (id === reqId.current) setError(e);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [token, from, to, sort, dir, page]);

  useEffect(() => {
    if (enabled) void load();
  }, [load, enabled]);

  return { serverToday, showPayments, categories, summary, daily, loading, error, reload: load };
}
