import { Banknote, CreditCard, Droplets, Package, Truck, Wallet, Car, type LucideIcon } from "lucide-react";
import { useI18n } from "../../i18n";
import { PAYMENT_KEYS, type Summary } from "../../types";
import { formatInt, formatSar } from "../../utils/format";

function Card({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-white"}`}>
      <div className={`mb-2 flex items-center gap-2 text-sm ${accent ? "text-white/80" : "text-slate-600"}`}>
        <Icon className="h-4 w-4" aria-hidden /> {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default function SummaryCards({ summary }: { summary: Summary }) {
  const { t, lang } = useI18n();
  const cat = (id: string): number => summary.by_category[id] ?? 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card accent icon={Wallet} label={t("accountant.cardTotal")} value={formatSar(summary.total_expenses, lang)} />
        <Card icon={Truck} label={t("accountant.cardWater")} value={formatSar(cat("water_truck"), lang)} />
        <Card icon={Droplets} label={t("accountant.cardSoap")} value={formatSar(cat("soap"), lang)} />
        <Card icon={Package} label={t("accountant.cardShipping")} value={formatSar(cat("order_shipping"), lang)} />
        <Card icon={Car} label={t("accountant.cardFreeLarge")} value={formatInt(summary.free_large, lang)} />
        <Card icon={Car} label={t("accountant.cardFreeSmall")} value={formatInt(summary.free_small, lang)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card icon={Car} label={t("accountant.cardTotalCars")} value={formatInt(summary.total_cars, lang)} />
        <Card accent icon={Car} label={t("accountant.cardActualCars")} value={formatInt(summary.total_cars - summary.free_cars_on_total_days, lang)} />
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CreditCard className="h-4 w-4" aria-hidden /> {t("accountant.paymentsTitle")}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PAYMENT_KEYS.map((k) => (
            <Card key={k} icon={k === "cash" ? Banknote : CreditCard} label={t(`employee.payments.${k}`)} value={formatSar(summary[k], lang)} />
          ))}
        </div>
      </div>
    </div>
  );
}
