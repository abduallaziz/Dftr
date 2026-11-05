import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import { ErrorBanner, Spinner } from "../components/Feedback";
import AuditLog from "../features/admin/AuditLog";
import SettingsPanel from "../features/admin/SettingsPanel";
import CategoriesEditor from "../features/admin/CategoriesEditor";
import DayEditor from "../features/admin/DayEditor";
import ExpensesEditor from "../features/admin/ExpensesEditor";
import { errorMessage, useI18n } from "../i18n";
import { adminApi } from "../services/admin";
import type { AdminDay, DailyRow } from "../types";
import { addDays, riyadhToday } from "../utils/dates";
import { formatDate, formatSar } from "../utils/format";

type Tab = "records" | "categories" | "audit" | "settings";

export default function AdminPage({ token }: { token: string }) {
  const { t, lang, dir } = useI18n();
  const today = useMemo(() => riyadhToday(), []);
  const [tab, setTab] = useState<Tab>("records");
  const [date, setDate] = useState(today);
  // The loaded data remembers its date and load count, so forms are rebuilt only when fresh data has arrived.
  const [loaded, setLoaded] = useState<{ date: string; rev: number; data: AdminDay } | null>(null);
  const [recent, setRecent] = useState<DailyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;

  useEffect(() => {
    document.title = t("admin.title");
  }, [t]);

  useEffect(() => {
    let live = true;
    setError(null);
    adminApi.day(token, date).then((d) => live && setLoaded((p) => ({ date, rev: (p?.rev ?? 0) + 1, data: d }))).catch((e: unknown) => live && setError(errorMessage(t, e)));
    adminApi.days(token, addDays(today, -120), today).then((r) => live && setRecent(r.rows)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [token, date, today, version, t]);

  const day = loaded && loaded.date === date ? loaded.data : null;

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-5 px-4 pb-16 pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white"><ShieldCheck className="h-6 w-6" aria-hidden /></span>
          {t("admin.title")}
        </h1>
        <LanguageSelector />
      </header>

      <nav className="flex gap-2" role="tablist">
        {(["records", "categories", "audit", "settings"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? "bg-navy-800 text-white" : "border border-slate-200 bg-white"}`}>
            {t(`admin.tab${k[0]?.toUpperCase()}${k.slice(1)}`)}
          </button>
        ))}
      </nav>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {tab === "records" && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label={t("admin.prev")} className="rounded-lg border border-slate-200 p-2"><Prev className="h-5 w-5" /></button>
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
            <button type="button" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} aria-label={t("admin.next")} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><Next className="h-5 w-5" /></button>
            <span className="font-semibold">{formatDate(date, lang, { weekday: true })}</span>
          </div>
          {recent.length > 0 && (
            <details className="rounded-xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold">{t("admin.recentDays")}</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r.report_date} type="button" onClick={() => setDate(r.report_date)}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${r.report_date === date ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                    {formatDate(r.report_date, lang)} · {formatSar(r.total_expenses, lang)}
                  </button>
                ))}
              </div>
            </details>
          )}
          {!day && !error && <Spinner />}
          {day && loaded && (
            <div key={`${loaded.date}:${loaded.rev}`} className="space-y-5">
              <DayEditor token={token} date={loaded.date} day={day} onChanged={reload} />
              <ExpensesEditor token={token} date={loaded.date} day={day} onChanged={reload} />
            </div>
          )}
        </>
      )}
      {tab === "categories" && day && <CategoriesEditor token={token} categories={day.categories} onSaved={reload} />}
      {tab === "settings" && <SettingsPanel token={token} />}
      {tab === "audit" && <AuditLog key={version} token={token} />}
    </div>
  );
}
