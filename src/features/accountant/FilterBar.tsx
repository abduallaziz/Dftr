import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../i18n";
import type { DateRange, Period } from "../../types";
import { formatDate, formatMonth } from "../../utils/format";

const PERIODS: readonly Period[] = ["daily", "weekly", "monthly", "yearly", "custom"];
const LABEL: Record<Period, string> = {
  daily: "accountant.filterDaily",
  weekly: "accountant.filterWeekly",
  monthly: "accountant.filterMonthly",
  yearly: "accountant.filterYearly",
  custom: "accountant.filterCustom",
};

interface Props {
  period: Period;
  range: DateRange;
  anchor: string;
  onPeriod: (p: Period) => void;
  onShift: (d: -1 | 1) => void;
  onToday: () => void;
  onCustom: (r: DateRange) => void;
  rangeInvalid: boolean;
}

export default function FilterBar({ period, range, anchor, onPeriod, onShift, onToday, onCustom, rangeInvalid }: Props) {
  const { t, lang, dir } = useI18n();
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;

  const label =
    period === "daily"
      ? formatDate(anchor, lang, { weekday: true })
      : period === "monthly"
        ? formatMonth(anchor, lang)
        : period === "yearly"
          ? anchor.slice(0, 4)
          : `${formatDate(range.from, lang)} - ${formatDate(range.to, lang)}`;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => onPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              period === p ? "bg-navy-800 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t(LABEL[p])}
          </button>
        ))}
      </div>

      {period === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">{t("accountant.from")}</span>
            <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && onCustom({ from: e.target.value, to: range.to })} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">{t("accountant.to")}</span>
            <input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && onCustom({ from: range.from, to: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {rangeInvalid && <p className="text-sm text-red-700" role="alert">{t("accountant.invalidRange")}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onShift(-1)} aria-label={t("accountant.previous")} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
            <Prev className="h-5 w-5" />
          </button>
          <div className="min-w-[12rem] text-center">
            <div className="font-semibold">{label}</div>
            {(period === "weekly") && (
              <div className="text-xs text-slate-500">{formatDate(range.from, lang)} - {formatDate(range.to, lang)}</div>
            )}
          </div>
          <button type="button" onClick={() => onShift(1)} aria-label={t("accountant.next")} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
            <Next className="h-5 w-5" />
          </button>
          <button type="button" onClick={onToday} className="rounded-lg border border-brand-500 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
            {t("accountant.today")}
          </button>
        </div>
      )}
    </div>
  );
}
