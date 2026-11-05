import { Banknote, CreditCard, Wallet, Car, type LucideIcon } from "lucide-react";
import { useI18n } from "../../i18n";
import { PAYMENT_KEYS, type Category, type DateRange, type Summary } from "../../types";
import { categoryName } from "../../utils/category";
import { formatDate, formatInt, formatSar } from "../../utils/format";
import { iconFor } from "../../utils/icons";

function Card({ icon: Icon, label, value, accent, wide }: { icon: LucideIcon; label: string; value: string; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 sm:p-4 ${wide ? "col-span-2 lg:col-span-1" : ""} ${accent ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-white"}`}>
      <div className={`mb-2 flex min-w-0 items-center gap-2 text-sm ${accent ? "text-white/80" : "text-slate-600"}`}>
        <Icon className="h-4 w-4" aria-hidden /> {label}
      </div>
      <div className="break-words text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
    </div>
  );
}

export default function SummaryCards({ summary, categories, showPayments, range }: { summary: Summary; categories: Category[]; showPayments: boolean; range: DateRange }) {
  const { t, lang } = useI18n();
  // One card per expense category (active ones, plus any inactive category that still has recorded expenses).
  const shown = categories.filter((c) => c.is_active !== false || (summary.by_category[c.id] ?? 0) > 0);
  const knownIds = new Set(categories.map((c) => c.id));
  const orphans = Object.keys(summary.by_category).filter((id) => !knownIds.has(id));
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-600">
        {t("accountant.summaryPeriod", {
          range: range.from === range.to ? formatDate(range.from, lang) : `${formatDate(range.from, lang)} - ${formatDate(range.to, lang)}`,
        })}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card accent wide icon={Wallet} label={t("accountant.cardTotal")} value={formatSar(summary.total_expenses, lang)} />
        {shown.map((c) => (
          <Card key={c.id} icon={iconFor(c.icon)} label={categoryName(c, lang)} value={formatSar(summary.by_category[c.id] ?? 0, lang)} />
        ))}
        {orphans.map((id) => (
          <Card key={id} icon={Wallet} label={id} value={formatSar(summary.by_category[id] ?? 0, lang)} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Car} label={t("accountant.cardFreeLarge")} value={formatInt(summary.free_large, lang)} />
        <Card icon={Car} label={t("accountant.cardFreeSmall")} value={formatInt(summary.free_small, lang)} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Car} label={t("accountant.cardTotalCars")} value={formatInt(summary.total_cars, lang)} />
        <Card accent icon={Car} label={t("accountant.cardActualCars")} value={formatInt(summary.total_cars - summary.free_cars_on_total_days, lang)} />
        <Card icon={Car} label={t("accountant.cardMatch")} value={formatInt(summary.days_match, lang)} />
        <Card icon={Car} label={t("accountant.cardMismatch")} value={formatInt(summary.days_mismatch, lang)} />
      </div>
      {showPayments && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CreditCard className="h-4 w-4" aria-hidden /> {t("accountant.paymentsTitle")}
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PAYMENT_KEYS.map((k) => (
              <Card key={k} icon={k === "cash" ? Banknote : CreditCard} label={t(`employee.payments.${k}`)} value={formatSar(summary[k] ?? 0, lang)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
