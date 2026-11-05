import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import MoneyInput from "../../components/MoneyInput";
import { ErrorBanner, SuccessBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import type { Category, Expense } from "../../types";
import { categoryName } from "../../utils/category";
import { formatSar, newClientKey, parseAmountInput } from "../../utils/format";
import { iconFor } from "../../utils/icons";

interface Props {
  category: Category;
  onClose: () => void;
  onSubmit: (input: { category_id: string; amount: number; client_key: string }) => Promise<{ expense: Expense; duplicate: boolean }>;
}

export default function ExpenseSheet({ category, onClose, onSubmit }: Props) {
  const { t, lang } = useI18n();
  const Icon = iconFor(category.icon);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // One key per intended entry: retries of the same entry are idempotent on the server.
  const keyRef = useRef(newClientKey());
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
    setSuccess(null);
    try {
      const res = await onSubmit({ category_id: category.id, amount: value, client_key: keyRef.current });
      setSuccess(
        res.duplicate
          ? t("employee.expenseDuplicate")
          : t("employee.expenseSaved", { category: categoryName(category, lang), amount: formatSar(res.expense.amount, lang) }),
      );
      setAmount("");
      keyRef.current = newClientKey();
    } catch (e) {
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

        <MoneyInput id="expense-amount" label={t("employee.amountLabel")} value={amount} onChange={(v) => { setAmount(v); setSuccess(null); }} large autoFocus />

        {error && <ErrorBanner message={error} />}
        {success && (
          <SuccessBanner>
            <div>{success}</div>
            <div className="mt-1 text-sm font-normal">{t("employee.anotherExpense")}</div>
          </SuccessBanner>
        )}

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
