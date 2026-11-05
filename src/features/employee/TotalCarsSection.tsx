import { useState } from "react";
import { Hash, Save } from "lucide-react";
import NumberStepper from "../../components/NumberStepper";
import { ErrorBanner, SuccessBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import type { DailyReport } from "../../types";

interface Props {
  daily: DailyReport | null;
  onSave: (total: number) => Promise<void>;
}

export default function TotalCarsSection({ daily, onSave }: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState(daily?.employee_total_cars ?? 0);
  const [saved, setSaved] = useState<number | null>(daily?.employee_total_cars ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(value);
      setSaved(value);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Hash className="h-6 w-6 text-brand-600" aria-hidden /> {t("employee.totalCarsTitle")}
      </h2>
      <NumberStepper label={t("employee.totalCarsLabel")} value={value} onChange={setValue} />
      {error && <ErrorBanner message={error} />}
      {saved === value && <SuccessBanner>{t("employee.totalSaved")}</SuccessBanner>}
      <button type="button" onClick={save} disabled={busy || saved === value}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-800 py-4 text-lg font-bold text-white disabled:opacity-50">
        <Save className="h-5 w-5" aria-hidden /> {busy ? t("common.saving") : t("employee.saveTotal")}
      </button>
    </section>
  );
}
