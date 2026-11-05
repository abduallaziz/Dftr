import { useEffect, useMemo, useState } from "react";
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
import { accountantApi } from "../services/accountant";
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
  const localToday = useMemo(() => riyadhToday(), []);
  const [businessToday, setBusinessToday] = useState<string | null>(null);
  const today = businessToday ?? localToday;
  const [period, setPeriod] = useState<Period>("daily");
  const [anchor, setAnchor] = useState(localToday);
  const [custom, setCustom] = useState<DateRange>(() => rangeFor("monthly", localToday));
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [preset, setPreset] = useState<{ date: string; nonce: number } | null>(null);

  const range = period === "custom" ? custom : rangeFor(period, anchor);
  const rangeInvalid = range.from > range.to;
  const [initError, setInitError] = useState<unknown>(null);
  // Learn the server's business day BEFORE loading any data (it continues past midnight until the owner's cutoff hour),
  // so the page never flashes the wrong day or loads twice.
  useEffect(() => {
    let live = true;
    accountantApi
      .settings(token)
      .then((s) => {
        if (!live) return;
        setAnchor(s.today);
        setCustom(rangeFor("monthly", s.today));
        setBusinessToday(s.today);
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.code === "unauthorized") setInitError(e);
        else setBusinessToday(localToday); // fall back to the calendar day
      });
    return () => {
      live = false;
    };
  }, [token, localToday]);

  const { showPayments, categories, summary, daily, loading, error, reload } = useAccountantData(
    token,
    { range, sort, dir, page },
    !rangeInvalid && businessToday !== null,
  );

  // Re-read the stored count whenever fresh report data arrives (e.g. the owner changed it).
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [daily]);

  if ((error instanceof ApiError && error.code === "unauthorized") || initError) return <InvalidLinkPage />;

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

      {businessToday !== null && (
        <>
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

        <CarsRecorder key={today} token={token} today={today} preset={preset} refreshKey={refreshKey} onSaved={() => void reload()} />

        </>
      )}

      {error !== null && <ErrorBanner message={errorMessage(t, error)} onRetry={() => void reload()} />}
      {(businessToday === null || (loading && !summary)) && !error && <Spinner />}

      {summary && (
        <div className={loading ? "opacity-60 transition-opacity" : ""} aria-busy={loading}>
          <SummaryCards summary={summary} categories={categories} showPayments={showPayments} range={range} />
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
            <DailyTable token={token} rows={daily.rows} categories={categories} sort={sort} dir={dir} onSort={onSort} showPayments={showPayments} onEditTotal={(date) => { setPreset({ date, nonce: Date.now() }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          )}
          <Pagination page={page} pages={pages} onPage={setPage} />
        </section>
      )}
    </div>
  );
}
