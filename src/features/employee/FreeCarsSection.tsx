import { useState } from "react";
import { Car, Save } from "lucide-react";
import NumberStepper from "../../components/NumberStepper";
import { ErrorBanner, SuccessBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import type { DailyReport } from "../../types";

interface Props {
  daily: DailyReport | null;
  onSave: (fields: { free_large: number; free_small: number }) => Promise<void>;
}

export default function FreeCarsSection({ daily, onSave }: Props) {
  const { t } = useI18n();
  const [large, setLarge] = useState(daily?.free_large ?? 0);
  const [small, setSmall] = useState(daily?.free_small ?? 0);
  const [saved, setSaved] = useState({ large: daily?.free_large ?? 0, small: daily?.free_small ?? 0 });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = large !== saved.large || small !== saved.small;

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await onSave({ free_large: large, free_small: small });
      setSaved({ large, small });
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
        <Car className="h-6 w-6 text-brand-600" aria-hidden /> {t("employee.freeTitle")}
      </h2>
      <NumberStepper label={t("employee.largeCars")} value={large} onChange={(v) => { setLarge(v); setDone(false); }} />
      <NumberStepper label={t("employee.smallCars")} value={small} onChange={(v) => { setSmall(v); setDone(false); }} />
      {error && <ErrorBanner message={error} />}
      {done && !dirty && <SuccessBanner>{t("employee.freeSaved")}</SuccessBanner>}
      <button
        type="button"
        onClick={save}
        disabled={busy || (!dirty && daily !== null)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-800 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        <Save className="h-5 w-5" aria-hidden /> {busy ? t("common.saving") : t("employee.saveFree")}
      </button>
    </section>
  );
}
