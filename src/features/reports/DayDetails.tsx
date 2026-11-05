import { useEffect, useState } from "react";
import { ErrorBanner, Spinner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { accountantApi } from "../../services/accountant";
import { PAYMENT_KEYS, type Category, type DailyRow, type DayEntry } from "../../types";
import { categoryName } from "../../utils/category";
import { formatSar, formatTime } from "../../utils/format";

export default function DayDetails({ token, row, categories, showPayments }: { token: string; row: DailyRow; categories: Category[]; showPayments: boolean }) {
  const { t, lang } = useI18n();
  const [entries, setEntries] = useState<DayEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = row.report_date;

  useEffect(() => {
    let live = true;
    setEntries(null);
    setError(null);
    accountantApi
      .dayEntries(token, date)
      .then((r) => live && setEntries(r.entries))
      .catch((e: unknown) => live && setError(errorMessage(t, e)));
    return () => {
      live = false;
    };
  }, [token, date, t]);

  const nameOf = (id: string): string => {
    const c = categories.find((x) => x.id === id);
    return c ? categoryName(c, lang) : id;
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      {showPayments && <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">{t("accountant.dayPayments")}</h4>
        {row.has_report ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_KEYS.map((k) => (
              <div key={k} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">{t(`employee.payments.${k}`)}</div>
                <div className="font-semibold tabular-nums">{formatSar(row[k] ?? 0, lang)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("accountant.noReport")}</p>
        )}
      </div>}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">{t("accountant.entriesTitle")}</h4>
        {error && <ErrorBanner message={error} />}
        {!entries && !error && <Spinner />}
        {entries && entries.length === 0 && <p className="text-sm text-slate-500">{t("accountant.noEntries")}</p>}
        {entries && entries.length > 0 && (
          <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t("common.id")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("common.category")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("common.amount")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("common.time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 tabular-nums">#{e.id}</td>
                    <td className="px-3 py-2">{nameOf(e.category_id)}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{formatSar(e.amount, lang)}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{formatTime(e.created_at, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
