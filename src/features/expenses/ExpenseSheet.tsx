import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import MoneyInput from "../../components/MoneyInput";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import type { Category, Expense } from "../../types";
import { categoryName } from "../../utils/category";
import { ApiError } from "../../services/api";
import { isUnknownOutcome, rememberAttempt, settleAttempt } from "../../services/pendingExpenses";
import { formatSar, parseAmountInput } from "../../utils/format";
import { iconFor } from "../../utils/icons";

/** The identity of this registration attempt. A retried attempt keeps its key (and amount) until its outcome is known. */
export interface Attempt {
  key: string;
  amount?: number;
  startedAt?: number;
}

interface Props {
  category: Category;
  attempt: Attempt;
  onClose: () => void;
  /** Called after a successful save with the confirmation text; the sheet then closes. */
  onSaved: (message: string) => void;
  onSubmit: (input: { category_id: string; amount: number; client_key: string }) => Promise<{ expense: Expense; duplicate: boolean }>;
}

export default function ExpenseSheet({ category, attempt, onClose, onSaved, onSubmit }: Props) {
  const { t, lang } = useI18n();
  const Icon = iconFor(category.icon);
  const [amount, setAmount] = useState(attempt.amount !== undefined ? String(attempt.amount) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The key identifies this ATTEMPT (not the amount or category): the server stores each key once, so a retry of an
  // attempt whose reply was lost can never create a second row, while a new genuine entry always gets a new key.
  const keyRef = useRef(attempt.key);
  const startedAt = useRef(attempt.startedAt ?? Date.now());
  const lockRef = useRef(false);

  async function register() {
    if (lockRef.current) return; // blocks rapid double taps before state updates
    const value = parseAmountInput(amount);
    if (value === null) {
      setError(t("errors.invalid_amount"));
      return;
    }
    lockRef.current = true;
    setBusy(true);
    setError(null);
    // Remember the attempt BEFORE sending, so its identity survives closing this sheet or reloading the page.
    rememberAttempt({ key: keyRef.current, category_id: category.id, amount: value, at: startedAt.current });
    try {
      const res = await onSubmit({ category_id: category.id, amount: value, client_key: keyRef.current });
      settleAttempt(keyRef.current);
      onSaved(
        res.duplicate
          ? t("employee.expenseDuplicate")
          : t("employee.expenseSaved", { category: categoryName(category, lang), amount: formatSar(res.expense.amount, lang) }),
      );
      onClose();
      return;
    } catch (e) {
      // A rejection from the server means nothing was saved: the attempt is settled. No answer at all means unknown: keep it.
      if (e instanceof ApiError && !isUnknownOutcome(e.status)) settleAttempt(keyRef.current);
      setError(errorMessage(t, e));
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <Icon className="h-8 w-8 text-brand-600" aria-hidden />
            </span>
            <div>
              <div className="text-sm text-slate-500">{t("employee.selected")}</div>
              <div className="text-2xl font-bold">{categoryName(category, lang)}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <MoneyInput id="expense-amount" label={t("employee.amountLabel")} value={amount} onChange={setAmount} large autoFocus />

        {error && <ErrorBanner message={error} />}
        <button
          type="button"
          onClick={register}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-5 text-xl font-bold text-white active:bg-brand-700 disabled:opacity-60"
        >
          <Check className="h-6 w-6" aria-hidden /> {busy ? t("employee.registering") : t("employee.register")}
        </button>
      </div>
    </div>
  );
}
