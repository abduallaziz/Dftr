import { useEffect } from "react";
import { useMemo, useState } from "react";
import { BarChart3, Eye } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import Pagination from "../components/Pagination";
import { ErrorBanner, Spinner } from "../components/Feedback";
import CarsRecorder from "../features/accountant/CarsRecorder";
import FilterBar from "../features/accountant/FilterBar";
import DailyTable from "../features/reports/DailyTable";
import SummaryCards from "../features/reports/SummaryCards";
import { PAGE_SIZE, useAccountantData } from "../hooks/useAccountantData";
import { errorMessage, useI18n } from "../i18n";
import { ApiError } from "../services/api";
import type { DateRange, Period } from "../types";
import { rangeFor, riyadhToday, shiftAnchor } from "../utils/dates";
import { formatInt } from "../utils/format";
import InvalidLinkPage from "./InvalidLinkPage";

export default function AccountantPage({ token }: { token: string }) {
  const { t, lang } = useI18n();
  useEffect(() => {
    document.title = t("app.accountantTitle");
  }, [t]);
  const today = useMemo(() => riyadhToday(), []);
  const [period, setPeriod] = useState<Period>("monthly");
  const [anchor, setAnchor] = useState(today);
  const [custom, setCustom] = useState<DateRange>(() => rangeFor("monthly", today));
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [preset, setPreset] = useState<{ date: string; total: number | null; nonce: number } | null>(null);

  const range = period === "custom" ? custom : rangeFor(period, anchor);
  const rangeInvalid = range.from > range.to;
  const { showPayments, categories, summary, daily, loading, error, reload } = useAccountantData(
    token,
    { range, sort, dir, page },
    !rangeInvalid,
  );

  if (error instanceof ApiError && error.code === "unauthorized") return <InvalidLinkPage />;

  const pages = daily ? Math.max(1, Math.ceil(daily.total_count / PAGE_SIZE)) : 1;

  function onSort(field: "date" | "amount") {
    if (field === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setDir("desc");
    }
    setPage(0);
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-5 px-4 pb-16 pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white">
            <BarChart3 className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t("app.accountantTitle")}</h1>
            <p className="flex items-center gap-1 text-xs text-slate-500"><Eye className="h-3 w-3" aria-hidden /> {t("accountant.readOnly")}</p>
          </div>
        </div>
        <LanguageSelector />
      </header>

      <FilterBar
        period={period}
        range={range}
        anchor={anchor}
        rangeInvalid={rangeInvalid}
        onPeriod={(p) => {
          if (p === "custom") setCustom(range);
          setPeriod(p);
          setPage(0);
        }}
        onShift={(d) => {
          if (period !== "custom") setAnchor((a) => shiftAnchor(period, a, d));
          setPage(0);
        }}
        onToday={() => {
          setAnchor(today);
          setPage(0);
        }}
        onCustom={(r) => {
          setCustom(r);
          setPage(0);
        }}
      />

      <CarsRecorder token={token} today={today} preset={preset} onSaved={() => void reload()} />

      {error !== null && <ErrorBanner message={errorMessage(t, error)} onRetry={() => void reload()} />}
      {loading && !summary && !error && <Spinner />}

      {summary && (
        <div className={loading ? "opacity-60 transition-opacity" : ""} aria-busy={loading}>
          <SummaryCards summary={summary} showPayments={showPayments} />
        </div>
      )}

      {daily && (
        <section className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">{t("accountant.reportsTitle")}</h2>
            <span className="text-sm text-slate-500">{t("accountant.showing", { count: formatInt(daily.total_count, lang) })}</span>
          </div>
          {daily.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              {t("accountant.empty")}
            </div>
          ) : (
            <DailyTable token={token} rows={daily.rows} categories={categories} sort={sort} dir={dir} onSort={onSort} showPayments={showPayments} onEditTotal={(date, total) => { setPreset({ date, total, nonce: Date.now() }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          )}
          <Pagination page={page} pages={pages} onPage={setPage} />
        </section>
      )}
    </div>
  );
}
