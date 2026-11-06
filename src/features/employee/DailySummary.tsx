import StepTitle from "../../components/StepTitle";
import { useI18n } from "../../i18n";
import type { Category, DailyReport, Expense } from "../../types";
import { categoryName } from "../../utils/category";
import { formatInt, formatSarParts, formatTime } from "../../utils/format";
import { iconFor } from "../../utils/icons";

interface Props {
  categories: Category[];
  daily: DailyReport | null;
  expenses: Expense[];
}

export default function DailySummary({ categories, daily, expenses }: Props) {
  const { t, lang } = useI18n();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category_id, (byCat.get(e.category_id) ?? 0) + e.amount);
  const find = (id: string): Category | undefined => categories.find((x) => x.id === id);
  const nameOf = (id: string): string => {
    const c = find(id);
    return c ? categoryName(c, lang) : id;
  };
  const money = (v: number) => formatSarParts(v, lang);
  const totalParts = money(total);

  return (
    <section className="space-y-3">
      <StepTitle step={5} tone="navy">{t("employee.summaryTitle")}</StepTitle>

      <div className="rounded-2xl bg-navy-800 p-4 text-white">
        <div className="text-base text-white/80">{t("employee.todayExpenses")}</div>
        <div className="flex flex-wrap items-baseline gap-x-2 font-bold tabular-nums">
          <span className="whitespace-nowrap text-4xl">{totalParts.amount}</span>
          <span className="text-lg font-semibold text-white/75">{totalParts.unit}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-s-4 border-slate-200 border-s-blue-500 bg-white p-4">
          <div className="text-base text-slate-600">{t("employee.largeCars")}</div>
          <div className="text-3xl font-bold tabular-nums text-navy-900">{formatInt(daily?.free_large ?? 0, lang)}</div>
        </div>
        <div className="rounded-2xl border border-s-4 border-slate-200 border-s-blue-500 bg-white p-4">
          <div className="text-base text-slate-600">{t("employee.smallCars")}</div>
          <div className="text-3xl font-bold tabular-nums text-navy-900">{formatInt(daily?.free_small ?? 0, lang)}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-s-4 border-slate-200 border-s-brand-500 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">{t("employee.byCategory")}</h3>
        {byCat.size === 0 ? (
          <p className="text-slate-500">{t("employee.noEntries")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...byCat.entries()].map(([id, sum]) => {
              const p = money(sum);
              const pct = total > 0 ? Math.round((sum / total) * 100) : 0;
              return (
                <li key={id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3 text-lg">
                    <span>{nameOf(id)}</span>
                    <span className="flex items-baseline gap-1.5 font-bold tabular-nums">
                      <span className="whitespace-nowrap">{p.amount}</span>
                      <span className="text-xs font-semibold text-slate-500">{p.unit}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {expenses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">{t("employee.todayEntries")}</h3>
          <ul className="divide-y divide-slate-100">
            {expenses.map((e) => {
              const c = find(e.category_id);
              const Icon = iconFor(c?.icon ?? "");
              const p = money(e.amount);
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                      <Icon className="h-5 w-5 text-brand-600" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{nameOf(e.category_id)}</div>
                      <div className="text-sm text-slate-500">{formatTime(e.created_at, lang)}</div>
                    </div>
                  </div>
                  <span className="flex items-baseline gap-1.5 font-bold tabular-nums">
                    <span className="whitespace-nowrap">{p.amount}</span>
                    <span className="text-xs font-semibold text-slate-500">{p.unit}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
