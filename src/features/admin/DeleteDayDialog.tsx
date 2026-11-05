import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { ErrorBanner, Spinner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi } from "../../services/admin";
import type { AdminDay } from "../../types";
import { formatDate, formatInt, formatSar } from "../../utils/format";

interface Props {
  token: string;
  initialDate: string;
  today: string;
  onClose: () => void;
  onDeleted: (date: string) => void;
}

/** Pick any day, see exactly what is recorded on it, then delete everything for that day. */
export default function DeleteDayDialog({ token, initialDate, today, onClose, onDeleted }: Props) {
  const { t, lang } = useI18n();
  const [date, setDate] = useState(initialDate);
  const [preview, setPreview] = useState<AdminDay | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setPreview(null);
    setUnderstood(false);
    setError(null);
    adminApi.day(token, date).then((d) => live && setPreview(d)).catch((e: unknown) => live && setError(errorMessage(t, e)));
    return () => {
      live = false;
    };
  }, [token, date, t]);

  const total = preview?.expenses.reduce((s, e) => s + e.amount, 0) ?? 0;
  const hasData = !!preview && (preview.expenses.length > 0 || !!preview.daily || !!preview.total);

  async function remove() {
    if (!hasData || !understood || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteDayAll(token, date);
      onDeleted(date);
    } catch (e) {
      setError(errorMessage(t, e));
      setBusy(false);
    }
  }

  const row = (label: string, value: string) => (
    <li className="flex justify-between gap-3 py-1.5 text-sm"><span className="text-slate-600">{label}</span><span className="font-semibold tabular-nums">{value}</span></li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t("admin.deleteDialogTitle")}>
      <div className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-red-700"><Trash2 className="h-5 w-5" aria-hidden /> {t("admin.deleteDialogTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="rounded-lg bg-slate-100 p-2"><X className="h-5 w-5" /></button>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">{t("admin.pickDate")}</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
        </label>
        <p className="text-sm font-semibold">{formatDate(date, lang, { weekday: true })}</p>

        {error && <ErrorBanner message={error} />}
        {!preview && !error && <Spinner />}
        {preview && !hasData && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{t("admin.previewNone")}</p>}
        {preview && hasData && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="mb-1 text-sm font-semibold text-red-800">{t("admin.willDelete")}</div>
            <ul className="divide-y divide-red-100">
              {row(t("admin.previewExpenses"), `${formatInt(preview.expenses.length, lang)} · ${formatSar(total, lang)}`)}
              {row(t("admin.employeeCount"), preview.daily?.employee_total_cars == null ? "—" : formatInt(preview.daily.employee_total_cars, lang))}
              {row(t("admin.accountantCount"), preview.total ? formatInt(preview.total.total_cars, lang) : "—")}
              {row(`${t("admin.freeLarge")} / ${t("admin.freeSmall")}`, preview.daily ? `${formatInt(preview.daily.free_large, lang)} / ${formatInt(preview.daily.free_small, lang)}` : "—")}
              {row(t("admin.previewPayments"), preview.daily ? formatSar(preview.daily.mada + preview.daily.visa + preview.daily.mastercard + preview.daily.cash, lang) : "—")}
            </ul>
          </div>
        )}

        {hasData && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1 h-4 w-4" />
            <span>{t("admin.understand")}</span>
          </label>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 font-medium">{t("admin.cancel")}</button>
          <button type="button" onClick={remove} disabled={!hasData || !understood || busy} className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-40">
            <Trash2 className="h-4 w-4" aria-hidden /> {busy ? t("common.saving") : t("admin.deleteNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
