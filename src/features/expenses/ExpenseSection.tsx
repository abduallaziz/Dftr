import { useEffect, useRef, useState } from "react";
import { SuccessBanner } from "../../components/Feedback";
import { Check } from "lucide-react";
import StepTitle from "../../components/StepTitle";
import { useI18n } from "../../i18n";
import type { Category, Expense } from "../../types";
import { categoryName } from "../../utils/category";
import { iconFor } from "../../utils/icons";
import { pendingFor, reconcile, settleAttempt } from "../../services/pendingExpenses";
import { formatSar, formatSarParts, newClientKey } from "../../utils/format";
import ExpenseSheet, { type Attempt } from "./ExpenseSheet";

interface Props {
  categories: Category[];
  /** Re-reads today's rows from the server (null when it cannot be reached) to verify an unresolved attempt. */
  onVerify: () => Promise<Expense[] | null>;
  /** Today's registered rows: each category card shows what has already been entered for it. */
  todayExpenses: Expense[];
  onSubmit: (input: { category_id: string; amount: number; client_key: string }) => Promise<{ expense: Expense; duplicate: boolean }>;
}

export default function ExpenseSection({ categories, onVerify, todayExpenses, onSubmit }: Props) {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<{ category: Category; attempt: Attempt } | null>(null);
  const opening = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // Opening a category: if an earlier attempt for it never got an answer, check with the server first.
  async function open(c: Category) {
    if (opening.current) return;
    opening.current = true;
    try {
      const pending = pendingFor(c.id);
      if (!pending) return setSelected({ category: c, attempt: { key: newClientKey() } });
      const r = reconcile(pending, await onVerify());
      if (r.action === "already-saved") {
        settleAttempt(pending.key);
        setNotice(t("employee.alreadySavedDetail", { category: categoryName(c, lang), amount: formatSar(r.expense.amount, lang) }));
        return setSelected({ category: c, attempt: { key: newClientKey() } });
      }
      if (r.action === "retry") return setSelected({ category: c, attempt: { key: r.attempt.key, amount: r.attempt.amount, startedAt: r.attempt.at } });
      settleAttempt(pending.key);
      setSelected({ category: c, attempt: { key: newClientKey() } });
    } finally {
      opening.current = false;
    }
  }

  return (
    <section className="space-y-3">
      <StepTitle step={3} tone="teal">{t("employee.expensesTitle")}</StepTitle>
      {notice && <SuccessBanner>{notice}</SuccessBanner>}
      <p className="text-base text-slate-600">{t("employee.tapCategory")}</p>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((c) => {
          const Icon = iconFor(c.icon);
          const done = todayExpenses.filter((e) => e.category_id === c.id);
          const sum = done.reduce((s, e) => s + e.amount, 0);
          const p = formatSarParts(sum, lang);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => void open(c)}
              className={`relative flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center shadow-sm active:border-brand-500 active:bg-brand-50 ${done.length > 0 ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white"}`}
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${done.length > 0 ? "bg-white" : "bg-brand-50"}`}>
                <Icon className="h-9 w-9 text-brand-600" aria-hidden />
              </span>
              <span className="text-lg font-semibold leading-tight">{categoryName(c, lang)}</span>
              {done.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-sm font-semibold text-white tabular-nums" data-testid="category-total">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  <span className="whitespace-nowrap">{p.amount}</span>
                  <span className="text-xs font-medium opacity-90">{p.unit}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selected && <ExpenseSheet key={`${selected.category.id}:${selected.attempt.key}`} category={selected.category} attempt={selected.attempt} onClose={() => setSelected(null)} onSaved={setNotice} onSubmit={onSubmit} />}
    </section>
  );
}
