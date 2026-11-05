import { useCallback, useEffect, useState } from "react";
import { Lock, Save } from "lucide-react";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { formatInt } from "../../utils/format";
import { accountantApi } from "../../services/accountant";

interface Props {
  token: string;
  today: string;
  preset: { date: string; nonce: number } | null;
  /** Bumps when data elsewhere on the page was reloaded (e.g. the owner edited the count). */
  refreshKey: number;
  onSaved: () => void;
}

export default function CarsRecorder({ token, today, preset, refreshKey, onSaved }: Props) {
  const { t, lang } = useI18n();
  const [date, setDate] = useState(today);
  const [total, setTotal] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preset) setDate(preset.date);
  }, [preset]);

  // Always show the number that is actually stored for this day (including values corrected by the owner).
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await accountantApi.myTotal(token, date);
      setSaved(r.total_cars);
      setLocked(r.locked);
      setEmployeeCount(r.employee_total_cars);
      setTotal(r.total_cars === null ? "" : String(r.total_cars));
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setLoading(false);
    }
  }, [token, date, t]);

  useEffect(() => {
    setDone(false);
    setError(null);
    void load();
  }, [load, refreshKey]);

  async function save() {
    if (busy || total === "" || locked) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await accountantApi.setTotalCars(token, date, Number(total));
      setDone(true);
      await load();
      onSaved();
    } catch (e) {
      setError(errorMessage(t, e));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const unchanged = saved !== null && String(saved) === total;

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("accountant.recordTitle")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t("accountant.recordDate")}</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t("accountant.recordCount")}</span>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={loading ? "" : total}
            disabled={locked || loading}
            onChange={(e) => { setTotal(e.target.value.replace(/\D/g, "").slice(0, 5)); setDone(false); }}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-100 disabled:font-semibold disabled:text-slate-900"
          />
        </label>
        <button type="button" onClick={save} disabled={busy || loading || locked || total === "" || unchanged || !date} className="flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2 font-medium text-white disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden /> {busy ? t("common.saving") : t("accountant.recordSave")}
        </button>
        {locked && (
          <span className="flex items-center gap-1 text-sm font-medium text-slate-600" role="status">
            <Lock className="h-4 w-4" aria-hidden /> {t("accountant.recordLocked")}
          </span>
        )}
        {done && !locked && <span className="text-sm font-medium text-emerald-700" role="status">{t("accountant.recordSaved")}</span>}
      </div>
      {saved !== null && !loading && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">{t("accountant.colTotalCars")}</div>
            <div className="text-2xl font-bold tabular-nums">{formatInt(saved, lang)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">{t("accountant.colEmployeeCars")}</div>
            <div className="text-2xl font-bold tabular-nums">{employeeCount === null ? "—" : formatInt(employeeCount, lang)}</div>
          </div>
          <div className={`flex items-center rounded-lg p-3 text-sm font-medium ${
            employeeCount === null ? "bg-amber-50 text-amber-800" : employeeCount === saved ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {employeeCount === null
              ? t("accountant.statusEmployeeMissing")
              : employeeCount === saved
                ? t("accountant.statusMatch")
                : t("accountant.statusMismatch", { diff: formatInt(saved - employeeCount, lang) })}
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">{t("accountant.recordHint")}</p>
      {error && <ErrorBanner message={error} />}
    </section>
  );
}
