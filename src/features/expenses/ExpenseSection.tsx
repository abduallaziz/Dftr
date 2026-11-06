import { useEffect, useRef, useState } from "react";
import { SuccessBanner } from "../../components/Feedback";
import { Receipt } from "lucide-react";
import { useI18n } from "../../i18n";
import type { Category, Expense } from "../../types";
import { categoryName } from "../../utils/category";
import { iconFor } from "../../utils/icons";
import { pendingFor, reconcile, settleAttempt } from "../../services/pendingExpenses";
import { formatSar, newClientKey } from "../../utils/format";
import ExpenseSheet, { type Attempt } from "./ExpenseSheet";

interface Props {
  categories: Category[];
  /** Re-reads today's rows from the server (null when it cannot be reached) to verify an unresolved attempt. */
  onVerify: () => Promise<Expense[] | null>;
  onSubmit: (input: { category_id: string; amount: number; client_key: string }) => Promise<{ expense: Expense; duplicate: boolean }>;
}

export default function ExpenseSection({ categories, onVerify, onSubmit }: Props) {
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
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Receipt className="h-6 w-6 text-brand-600" aria-hidden /> {t("employee.expensesTitle")}
      </h2>
      {notice && <SuccessBanner>{notice}</SuccessBanner>}
      <p className="text-base text-slate-600">{t("employee.tapCategory")}</p>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((c) => {
          const Icon = iconFor(c.icon);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => void open(c)}
              className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3 text-center shadow-sm active:border-brand-500 active:bg-brand-50"
            >
              <Icon className="h-10 w-10 text-brand-600" aria-hidden />
              <span className="text-lg font-semibold leading-tight">{categoryName(c, lang)}</span>
            </button>
          );
        })}
      </div>
      {selected && <ExpenseSheet key={`${selected.category.id}:${selected.attempt.key}`} category={selected.category} attempt={selected.attempt} onClose={() => setSelected(null)} onSaved={setNotice} onSubmit={onSubmit} />}
    </section>
  );
}
