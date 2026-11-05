import { useCallback, useEffect, useState } from "react";
import { employeeApi } from "../services/employee";
import type { DailyReport, EmployeeToday, Expense } from "../types";

export function useEmployeeData(token: string) {
  const [data, setData] = useState<EmployeeToday | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await employeeApi.today(token));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDaily = useCallback((daily: DailyReport) => setData((d) => (d ? { ...d, daily } : d)), []);
  const addExpense = useCallback(
    (expense: Expense) =>
      setData((d) => (d && !d.expenses.some((x) => x.id === expense.id) ? { ...d, expenses: [expense, ...d.expenses] } : d)),
    [],
  );

  return { data, error, loading, reload: load, setDaily, addExpense };
}
