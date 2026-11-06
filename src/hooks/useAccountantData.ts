import { useCallback, useEffect, useRef, useState } from "react";
import { accountantApi } from "../services/accountant";
import type { Category, DailyPage, DateRange, Summary } from "../types";

export const PAGE_SIZE = 20;
/** How often the dashboard silently re-reads the data while the tab is visible. */
export const REFRESH_MS = 30_000;

export interface Query {
  range: DateRange;
  sort: "date" | "amount";
  dir: "asc" | "desc";
  page: number;
}

export function useAccountantData(token: string, q: Query, enabled: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPayments, setShowPayments] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); // time of the last SUCCESSFUL load
  const [connected, setConnected] = useState(true); // false after the latest attempt failed
  const reqId = useRef(0);

  const { from, to } = q.range;
  const { sort, dir, page } = q;

  // silent = background refresh: no spinner/dimming, and a failed refresh keeps showing the last good data.
  const load = useCallback(async (silent = false) => {
    const id = ++reqId.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
      setLastUpdated(new Date());
      setConnected(true);
      setError(null);
    } catch (e) {
      if (id === reqId.current) {
        setConnected(false);
        if (!silent) setError(e);
      }
    } finally {
      if (id === reqId.current && !silent) setLoading(false);
    }
  }, [token, from, to, sort, dir, page]);

  useEffect(() => {
    if (enabled) void load();
  }, [load, enabled]);

  // Live updates without a page refresh: poll while the tab is visible, and refresh at once when the tab comes back.
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const id = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load, enabled]);

  return { showPayments, categories, summary, daily, loading, error, lastUpdated, connected, reload: () => load() };
}
