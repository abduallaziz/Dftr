import { useState } from "react";
import { Save } from "lucide-react";
import StepTitle from "../../components/StepTitle";
import MoneyInput from "../../components/MoneyInput";
import { ErrorBanner, SuccessBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { PAYMENT_KEYS, type DailyReport, type PaymentKey } from "../../types";
import { parsePaymentInput } from "../../utils/format";

interface Props {
  daily: DailyReport | null;
  onSave: (fields: Record<PaymentKey, number>) => Promise<void>;
}

const DOT: Record<PaymentKey, string> = { mada: "bg-blue-500", visa: "bg-navy-700", mastercard: "bg-amber-500", cash: "bg-emerald-500" };

const initial = (daily: DailyReport | null, k: PaymentKey): string => {
  const v = daily?.[k];
  return v ? String(v) : "";
};

export default function PaymentsSection({ daily, onSave }: Props) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<PaymentKey, string>>({
    mada: initial(daily, "mada"),
    visa: initial(daily, "visa"),
    mastercard: initial(daily, "mastercard"),
    cash: initial(daily, "cash"),
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setError(null);
    setDone(false);
    const parsed = {} as Record<PaymentKey, number>;
    for (const k of PAYMENT_KEYS) {
      const n = parsePaymentInput(values[k]);
      if (n === null) {
        setError(t("errors.invalid_payment"));
        return;
      }
      parsed[k] = n;
    }
    setBusy(true);
    try {
      await onSave(parsed);
      setDone(true);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <StepTitle step={4} tone="amber">{t("employee.paymentsTitle")}</StepTitle>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-s-4 border-slate-200 border-s-amber-500 bg-white p-4 shadow-sm">
        {PAYMENT_KEYS.map((k) => (
          <MoneyInput
            key={k}
            id={`pay-${k}`}
            dot={DOT[k]}
            label={t(`employee.payments.${k}`)}
            value={values[k]}
            onChange={(v) => { setValues((s) => ({ ...s, [k]: v })); setDone(false); }}
          />
        ))}
      </div>
      {error && <ErrorBanner message={error} />}
      {done && <SuccessBanner>{t("employee.paymentsSaved")}</SuccessBanner>}
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-800 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        <Save className="h-5 w-5" aria-hidden /> {busy ? t("common.saving") : t("employee.savePayments")}
      </button>
    </section>
  );
}
