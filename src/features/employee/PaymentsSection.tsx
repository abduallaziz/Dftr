import { useState } from "react";
import { CreditCard, Save } from "lucide-react";
import MoneyInput from "../../components/MoneyInput";
import { ErrorBanner, SuccessBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { PAYMENT_KEYS, type DailyReport, type PaymentKey } from "../../types";
import { parsePaymentInput } from "../../utils/format";

interface Props {
  daily: DailyReport | null;
  onSave: (fields: Record<PaymentKey, number>) => Promise<void>;
}

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
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <CreditCard className="h-6 w-6 text-brand-600" aria-hidden /> {t("employee.paymentsTitle")}
      </h2>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {PAYMENT_KEYS.map((k) => (
          <MoneyInput
            key={k}
            id={`pay-${k}`}
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
