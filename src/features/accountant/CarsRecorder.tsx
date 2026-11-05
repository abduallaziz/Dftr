import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { accountantApi } from "../../services/accountant";

interface Props {
  token: string;
  today: string;
  preset: { date: string; total: number | null; nonce: number } | null;
  onSaved: () => void;
}

export default function CarsRecorder({ token, today, preset, onSaved }: Props) {
  const { t } = useI18n();
  const [date, setDate] = useState(today);
  const [total, setTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preset) {
      setDate(preset.date);
      setTotal(preset.total === null ? "" : String(preset.total));
      setDone(false);
    }
  }, [preset]);

  async function save() {
    if (busy || total === "") return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await accountantApi.setTotalCars(token, date, Number(total));
      setDone(true);
      onSaved();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("accountant.recordTitle")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t("accountant.recordDate")}</span>
          <input type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value); setDone(false); }} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t("accountant.recordCount")}</span>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={total}
            onChange={(e) => { setTotal(e.target.value.replace(/\D/g, "").slice(0, 5)); setDone(false); }}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
          />
        </label>
        <button type="button" onClick={save} disabled={busy || total === "" || !date} className="flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2 font-medium text-white disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden /> {busy ? t("common.saving") : t("accountant.recordSave")}
        </button>
        {done && <span className="text-sm font-medium text-emerald-700" role="status">{t("accountant.recordSaved")}</span>}
      </div>
      <p className="text-xs text-slate-500">{t("accountant.recordHint")}</p>
      {error && <ErrorBanner message={error} />}
    </section>
  );
}
