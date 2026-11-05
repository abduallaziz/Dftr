import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ErrorBanner, Spinner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi } from "../../services/admin";
import type { AuditEntry, Category } from "../../types";
import { categoryName } from "../../utils/category";
import { formatDate, formatTime } from "../../utils/format";
import { describeEntry } from "./auditFormat";

const BADGE: Record<string, string> = {
  insert: "bg-emerald-50 text-emerald-800",
  update: "bg-amber-50 text-amber-800",
  delete: "bg-red-50 text-red-800",
};

export default function AuditLog({ token, categories }: { token: string; categories: Category[] }) {
  const { t, lang, dir } = useI18n();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    adminApi.audit(token).then((r) => setRows(r.entries)).catch((e: unknown) => setError(errorMessage(t, e)));
  }, [token, t]);

  const ctx = useMemo(
    () => ({
      t,
      lang,
      categoryName: (id: string): string => {
        const c = categories.find((x) => x.id === id);
        return c ? categoryName(c, lang) : id;
      },
    }),
    [t, lang, categories],
  );

  if (error) return <ErrorBanner message={error} />;
  if (!rows) return <Spinner />;
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.auditTitle")}</h2>
      {rows.length === 0 && <p className="text-sm text-slate-500">{t("admin.noAudit")}</p>}
      <ul className="space-y-3">
        {rows.map((r) => {
          const d = describeEntry(r, ctx);
          const mode = r.action === "insert" || r.action === "delete" ? r.action : "update";
          return (
            <li key={r.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE[mode]}`}>{t(`admin.action${mode[0]?.toUpperCase()}${mode.slice(1)}`)}</span>
                  <span className="font-semibold">{d.title.replace(/^[^·]*· ?/, "")}</span>
                </div>
                <span className="text-xs text-slate-500" dir="ltr">{formatDate(r.at.slice(0, 10), lang)} · {formatTime(r.at, lang)}</span>
              </div>
              {d.lines.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {d.lines.map((l, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
                      <span className="text-slate-600">{l.label}</span>
                      <span className="flex flex-wrap items-center gap-2 font-medium tabular-nums">
                        {l.before !== undefined && <span className={l.after !== undefined ? "text-slate-500 line-through" : ""}>{l.before}</span>}
                        {l.before !== undefined && l.after !== undefined && <Arrow className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
                        {l.after !== undefined && <span className="text-emerald-700">{l.after}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {d.expenses.length > 0 && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-medium text-brand-700">{t("admin.showExpenses", { count: d.expenses.length })}</summary>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {d.expenses.map((x, i) => (
                      <li key={i} className="flex justify-between gap-3 py-1">
                        <span>{x.name}</span>
                        <span className="tabular-nums text-slate-600">{x.amount} · {x.time}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
