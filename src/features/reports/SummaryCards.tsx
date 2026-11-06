import { Banknote, Car, CheckCircle2, CreditCard, Gauge, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../../i18n";
import { PAYMENT_KEYS, type Category, type DateRange, type Summary } from "../../types";
import { categoryName } from "../../utils/category";
import { formatDate, formatInt, formatSarParts } from "../../utils/format";
import { iconFor } from "../../utils/icons";

// One colour per meaning, used the same way everywhere:
// teal = expenses, navy/blue = cars, green = matched/cash, red = needs attention, amber = card payments.
type Tone = "teal" | "navy" | "blue" | "green" | "red" | "amber" | "slate";
const TONE: Record<Tone, { chip: string; bar: string; edge: string }> = {
  teal: { chip: "bg-brand-50 text-brand-600", bar: "bg-brand-500", edge: "border-s-brand-500" },
  navy: { chip: "bg-slate-100 text-navy-800", bar: "bg-navy-700", edge: "border-s-navy-700" },
  blue: { chip: "bg-blue-50 text-blue-600", bar: "bg-blue-500", edge: "border-s-blue-500" },
  green: { chip: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500", edge: "border-s-emerald-500" },
  red: { chip: "bg-red-50 text-red-600", bar: "bg-red-500", edge: "border-s-red-500" },
  amber: { chip: "bg-amber-50 text-amber-600", bar: "bg-amber-500", edge: "border-s-amber-500" },
  slate: { chip: "bg-slate-100 text-slate-500", bar: "bg-slate-300", edge: "border-s-slate-300" },
};

function Section({ title, dot, children }: { title: string; dot: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden /> {title}
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
      </h3>
      {children}
    </section>
  );
}

interface CardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string; // currency symbol, shown small next to the number
  tone: Tone;
  muted?: boolean; // nothing recorded: keep the card but make it recede
  hint?: string;
  share?: number; // 0..1, draws a thin bar showing the share of the total
  strong?: boolean; // the headline number of a section
}

function Card({ icon: Icon, label, value, unit, tone, muted, hint, share, strong }: CardProps) {
  const c = TONE[tone];
  return (
    <div
      className={`min-w-0 rounded-xl border border-s-4 bg-white p-3 sm:p-4 ${c.edge} ${strong ? "border-slate-300 shadow-sm" : "border-slate-200"} ${muted ? "opacity-60" : ""}`}
    >
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.chip}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 text-sm font-medium leading-tight text-slate-600">{label}</span>
      </div>
      <div className={`flex flex-wrap items-baseline gap-x-1.5 font-bold tabular-nums ${strong ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} ${muted ? "text-slate-400" : "text-navy-900"}`}>
        <span className="whitespace-nowrap">{value}</span>
        {unit && <span className={`whitespace-nowrap text-xs font-semibold sm:text-sm ${muted ? "text-slate-400" : "text-slate-500"}`}>{unit}</span>}
      </div>
      {share !== undefined && (
        <div className="mt-2 flex items-center gap-2" aria-hidden>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.round(share * 100)}%` }} />
          </div>
          <span className="w-9 text-end text-xs tabular-nums text-slate-500">{Math.round(share * 100)}%</span>
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default function SummaryCards({ summary, categories, showPayments, range }: { summary: Summary; categories: Category[]; showPayments: boolean; range: DateRange }) {
  const { t, lang } = useI18n();
  // One card per expense category (active ones, plus any inactive category that still has recorded expenses).
  const shown = categories.filter((c) => c.is_active !== false || (summary.by_category[c.id] ?? 0) > 0);
  const knownIds = new Set(categories.map((c) => c.id));
  const orphans = Object.keys(summary.by_category).filter((id) => !knownIds.has(id));
  const total = summary.total_expenses;
  const share = (v: number): number => (total > 0 ? Math.min(1, v / total) : 0);
  const money = (v: number): { value: string; unit: string } => {
    const p = formatSarParts(v, lang);
    return { value: p.amount, unit: p.unit };
  };
  const actual = summary.total_cars - summary.free_cars_on_total_days;
  const mismatch = summary.days_mismatch;

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-slate-500">
        {t("accountant.summaryPeriod", {
          range: range.from === range.to ? formatDate(range.from, lang) : `${formatDate(range.from, lang)} - ${formatDate(range.to, lang)}`,
        })}
      </p>

      <Section title={t("accountant.secExpenses")} dot="bg-brand-500">
        <div className="rounded-xl bg-navy-800 p-4 text-white sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-white/75"><Wallet className="h-4 w-4" aria-hidden /> {t("accountant.cardTotal")}</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 font-bold tabular-nums"><span className="whitespace-nowrap text-3xl sm:text-4xl">{money(total).value}</span><span className="text-base font-semibold text-white/75 sm:text-lg">{money(total).unit}</span></div>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white/90">{t("common.entries", { count: formatInt(summary.entries_count, lang) })}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((c) => {
            const v = summary.by_category[c.id] ?? 0;
            return <Card key={c.id} tone={v > 0 ? "teal" : "slate"} muted={v === 0} icon={iconFor(c.icon)} label={categoryName(c, lang)} {...money(v)} share={v > 0 ? share(v) : undefined} />;
          })}
          {orphans.map((id) => {
            const v = summary.by_category[id] ?? 0;
            return <Card key={id} tone="teal" icon={Wallet} label={id} {...money(v)} share={share(v)} />;
          })}
        </div>
      </Section>

      <Section title={t("accountant.secCars")} dot="bg-navy-700">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card tone="navy" icon={Car} label={t("accountant.cardTotalCars")} value={formatInt(summary.total_cars, lang)} />
          <Card tone="blue" icon={Car} label={t("accountant.cardFreeLarge")} value={formatInt(summary.free_large, lang)} />
          <Card tone="blue" icon={Car} label={t("accountant.cardFreeSmall")} value={formatInt(summary.free_small, lang)} />
          <Card strong tone="navy" icon={Gauge} label={t("accountant.cardActualCars")} value={formatInt(actual, lang)} />
          <Card tone="green" icon={CheckCircle2} label={t("accountant.cardMatch")} value={formatInt(summary.days_match, lang)} />
          <Card tone={mismatch > 0 ? "red" : "slate"} muted={mismatch === 0} icon={TriangleAlert} label={t("accountant.cardMismatch")} value={formatInt(mismatch, lang)} />
        </div>
      </Section>

      {showPayments && (
        <Section title={t("accountant.paymentsTitle")} dot="bg-amber-500">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PAYMENT_KEYS.map((k) => (
              <Card key={k} tone={k === "cash" ? "green" : k === "mada" ? "blue" : k === "visa" ? "navy" : "amber"} icon={k === "cash" ? Banknote : CreditCard} label={t(`employee.payments.${k}`)} {...money(summary[k] ?? 0)} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
