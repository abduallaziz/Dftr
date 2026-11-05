import { ClipboardList } from "lucide-react";
import { useI18n } from "../../i18n";
import type { Category, DailyReport, Expense } from "../../types";
import { categoryName } from "../../utils/category";
import { formatInt, formatSar, formatTime } from "../../utils/format";

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
  const nameOf = (id: string): string => {
    const c = categories.find((x) => x.id === id);
    return c ? categoryName(c, lang) : id;
  };

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <ClipboardList className="h-6 w-6 text-brand-600" aria-hidden /> {t("employee.summaryTitle")}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-base text-slate-600">{t("employee.largeCars")}</div>
          <div className="text-3xl font-bold tabular-nums">{formatInt(daily?.free_large ?? 0, lang)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-base text-slate-600">{t("employee.smallCars")}</div>
          <div className="text-3xl font-bold tabular-nums">{formatInt(daily?.free_small ?? 0, lang)}</div>
        </div>
      </div>
      <div className="rounded-2xl bg-navy-800 p-4 text-white">
        <div className="text-base opacity-80">{t("employee.todayExpenses")}</div>
        <div className="text-4xl font-bold tabular-nums">{formatSar(total, lang)}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">{t("employee.byCategory")}</h3>
        {byCat.size === 0 ? (
          <p className="text-slate-500">{t("employee.noEntries")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...byCat.entries()].map(([id, sum]) => (
              <li key={id} className="flex justify-between py-2 text-lg">
                <span>{nameOf(id)}</span>
                <span className="font-semibold tabular-nums">{formatSar(sum, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {expenses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">{t("employee.todayEntries")}</h3>
          <ul className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-medium">{nameOf(e.category_id)}</div>
                  <div className="text-sm text-slate-500">{formatTime(e.created_at, lang)}</div>
                </div>
                <span className="font-semibold tabular-nums">{formatSar(e.amount, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
