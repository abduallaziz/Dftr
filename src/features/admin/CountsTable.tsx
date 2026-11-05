import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, Spinner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi, type CountRow } from "../../services/admin";
import { addDays } from "../../utils/dates";
import { formatDate, formatInt } from "../../utils/format";

type Status = "match" | "mismatch" | "accountantMissing" | "employeeMissing";

function statusOf(r: CountRow): Status {
  if (r.employee === null) return "employeeMissing";
  if (r.accountant === null) return "accountantMissing";
  return r.employee === r.accountant ? "match" : "mismatch";
}

const STYLE: Record<Status, string> = {
  match: "bg-emerald-50 text-emerald-800",
  mismatch: "bg-red-50 text-red-800",
  accountantMissing: "bg-amber-50 text-amber-800",
  employeeMissing: "bg-amber-50 text-amber-800",
};

export default function CountsTable({ token, today, onOpenDay }: { token: string; today: string; onOpenDay: (date: string) => void }) {
  const { t, lang } = useI18n();
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<CountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (from > to) return;
    let live = true;
    setRows(null);
    setError(null);
    adminApi.counts(token, from, to).then((r) => live && setRows(r.rows)).catch((e: unknown) => live && setError(errorMessage(t, e)));
    return () => {
      live = false;
    };
  }, [token, from, to, t]);

  const tally = useMemo(() => {
    const c = { match: 0, mismatch: 0, accountantMissing: 0, employeeMissing: 0 };
    for (const r of rows ?? []) c[statusOf(r)]++;
    return c;
  }, [rows]);

  const label: Record<Status, string> = {
    match: t("admin.stMatch"),
    mismatch: t("admin.stMismatch"),
    accountantMissing: t("admin.stAccountantMissing"),
    employeeMissing: t("admin.stEmployeeMissing"),
  };
  const n = (v: number | null): string => (v === null ? "—" : formatInt(v, lang));

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.countsTitle")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="mb-1 block text-slate-600">{t("accountant.from")}</span>
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm"><span className="mb-1 block text-slate-600">{t("accountant.to")}</span>
          <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
      </div>
      {error && <ErrorBanner message={error} />}
      {!rows && !error && <Spinner />}
      {rows && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {(Object.keys(tally) as Status[]).map((s) => (
              <span key={s} className={`rounded-md px-3 py-1 font-medium ${STYLE[s]}`}>{label[s]}: {formatInt(tally[s], lang)}</span>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">{t("accountant.empty")}</p>
          ) : (
            <div className="relative overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-start">{t("accountant.colDate")}</th>
                    <th className="px-3 py-2 text-start">{t("accountant.colEmployeeCars")}</th>
                    <th className="px-3 py-2 text-start">{t("accountant.colTotalCars")}</th>
                    <th className="px-3 py-2 text-start">{t("admin.colDiff")}</th>
                    <th className="px-3 py-2 text-start">{t("accountant.colCheck")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const s = statusOf(r);
                    const diff = r.employee !== null && r.accountant !== null ? r.accountant - r.employee : null;
                    return (
                      <tr key={r.report_date} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => onOpenDay(r.report_date)} className="text-brand-700 underline-offset-2 hover:underline">
                            {formatDate(r.report_date, lang, { weekday: true })}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-semibold tabular-nums">{n(r.employee)}</td>
                        <td className="px-3 py-2 font-semibold tabular-nums">{n(r.accountant)}</td>
                        <td className="px-3 py-2 tabular-nums" dir="ltr">{diff === null ? "—" : diff > 0 ? `+${formatInt(diff, lang)}` : formatInt(diff, lang)}</td>
                        <td className="px-3 py-2"><span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${STYLE[s]}`}>{label[s]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
