import { useState } from "react";
import { CheckCircle2, Hash, Lock, RefreshCw, Save, TriangleAlert } from "lucide-react";
import NumberStepper from "../../components/NumberStepper";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import type { DailyReport } from "../../types";
import { formatInt } from "../../utils/format";

interface Props {
  daily: DailyReport | null;
  accountantCount: number | null;
  onSave: (total: number) => Promise<void>;
  onRefresh: () => void;
}

export default function TotalCarsSection({ daily, accountantCount, onSave, onRefresh }: Props) {
  const { t, lang } = useI18n();
  const mine = daily?.employee_total_cars ?? null;
  const [value, setValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    if (!window.confirm(t("employee.confirmTotal", { count: formatInt(value, lang) }))) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(value);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  const title = (
    <h2 className="flex items-center gap-2 text-xl font-bold">
      <Hash className="h-6 w-6 text-brand-600" aria-hidden /> {t("employee.totalCarsTitle")}
    </h2>
  );

  // Already saved: read-only. The accountant's number appears only when both have recorded.
  if (mine !== null) {
    const diff = accountantCount === null ? null : accountantCount - mine;
    return (
      <section className="space-y-3">
        {title}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base text-slate-600">{t("employee.yourCount")}</div>
              <div className="text-4xl font-bold tabular-nums">{formatInt(mine, lang)}</div>
            </div>
            <span className="flex items-center gap-1 text-sm text-slate-500"><Lock className="h-4 w-4" aria-hidden /> {t("employee.totalLocked")}</span>
          </div>
          {accountantCount === null ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-base text-slate-600">
              <span>{t("employee.waitingAccountant")}</span>
              <button type="button" onClick={onRefresh} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
                <RefreshCw className="h-4 w-4" aria-hidden /> {t("employee.refresh")}
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="text-base text-slate-600">{t("employee.accountantCount")}</div>
                <div className="text-4xl font-bold tabular-nums">{formatInt(accountantCount, lang)}</div>
              </div>
              {diff === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-base font-medium text-emerald-800"><CheckCircle2 className="h-5 w-5" aria-hidden /> {t("employee.countsMatch")}</div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-base font-medium text-amber-900"><TriangleAlert className="h-5 w-5" aria-hidden /> {t("employee.countsDiffer", { diff: formatInt(Math.abs(diff ?? 0), lang) })}</div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {title}
      <NumberStepper label={t("employee.totalCarsLabel")} value={value} onChange={setValue} />
      <p className="text-sm text-slate-600">{t("employee.totalWarning")}</p>
      {error && <ErrorBanner message={error} />}
      <button type="button" onClick={save} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-800 py-4 text-lg font-bold text-white disabled:opacity-50">
        <Save className="h-5 w-5" aria-hidden /> {busy ? t("common.saving") : t("employee.saveTotal")}
      </button>
    </section>
  );
}
