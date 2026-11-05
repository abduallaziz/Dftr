import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi } from "../../services/admin";
import DeleteDayDialog from "./DeleteDayDialog";
import { PAYMENT_KEYS, type AdminDay } from "../../types";

type Fields = "employee_total_cars" | "total_cars" | "free_large" | "free_small" | "mada" | "visa" | "mastercard" | "cash";
const COUNTS: Fields[] = ["employee_total_cars", "total_cars", "free_large", "free_small"];
const NULLABLE: Fields[] = ["employee_total_cars", "total_cars"];

const initial = (d: AdminDay): Record<Fields, string> => {
  const s = (v: number | null | undefined): string => (v === null || v === undefined ? "" : String(v));
  return {
    employee_total_cars: s(d.daily?.employee_total_cars), total_cars: s(d.total?.total_cars),
    free_large: s(d.daily?.free_large), free_small: s(d.daily?.free_small),
    mada: s(d.daily?.mada), visa: s(d.daily?.visa), mastercard: s(d.daily?.mastercard), cash: s(d.daily?.cash),
  };
};

export default function DayEditor({ token, date, day, onChanged }: { token: string; date: string; day: AdminDay; onChanged: () => void }) {
  const { t } = useI18n();
  const start = initial(day);
  const [v, setV] = useState<Record<Fields, string>>(start);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const label: Record<Fields, string> = {
    employee_total_cars: t("admin.employeeCount"), total_cars: t("admin.accountantCount"),
    free_large: t("admin.freeLarge"), free_small: t("admin.freeSmall"),
    mada: t("employee.payments.mada"), visa: t("employee.payments.visa"),
    mastercard: t("employee.payments.mastercard"), cash: t("employee.payments.cash"),
  };

  async function save() {
    setError(null);
    setMsg(null);
    const daily: Record<string, number | null> = {};
    let total: number | null | undefined;
    for (const k of Object.keys(v) as Fields[]) {
      if (v[k] === start[k]) continue;
      const raw = v[k].trim().replace(",", ".");
      const isCount = COUNTS.includes(k);
      let val: number | null;
      if (raw === "") val = NULLABLE.includes(k) ? null : 0;
      else if (isCount ? /^\d+$/.test(raw) : /^\d+(\.\d{1,2})?$/.test(raw)) val = Number(raw);
      else {
        setError(t(isCount ? "errors.invalid_count" : "errors.invalid_payment"));
        return;
      }
      if (k === "total_cars") total = val;
      else daily[k] = val;
    }
    if (Object.keys(daily).length === 0 && total === undefined) {
      setMsg(t("admin.nothingChanged"));
      return;
    }
    setBusy(true);
    try {
      await adminApi.saveDay(token, { date, daily, ...(total !== undefined ? { total_cars: total } : {}) });
      setMsg(t("admin.saved"));
      onChanged();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteDay() {
    if (!window.confirm(t("admin.confirmDeleteDay"))) return;
    setBusy(true);
    try {
      await adminApi.deleteDayData(token, date);
      onChanged();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  const input = (k: Fields) => (
    <label key={k} className="text-sm">
      <span className="mb-1 block text-slate-600">{label[k]}</span>
      <input
        type="text" inputMode="decimal" dir="ltr" value={v[k]}
        onChange={(e) => { setV((s) => ({ ...s, [k]: e.target.value })); setMsg(null); }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
      />
    </label>
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.dayTitle")}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{COUNTS.map(input)}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{PAYMENT_KEYS.map((k) => input(k))}</div>
      <p className="text-xs text-slate-500">{t("admin.emptyRemoves")}</p>
      {error && <ErrorBanner message={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2 font-medium text-white disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden /> {t("admin.saveDay")}
        </button>
        <button type="button" onClick={deleteDay} disabled={busy || (!day.daily && !day.total)} className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 disabled:opacity-40">
          <Trash2 className="h-4 w-4" aria-hidden /> {t("admin.deleteDayData")}
        </button>
        <button type="button" onClick={() => setShowDelete(true)} disabled={busy} className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-40">
          <Trash2 className="h-4 w-4" aria-hidden /> {t("admin.deleteDayAll")}
        </button>
        {msg && <span className="text-sm text-emerald-700" role="status">{msg}</span>}
      </div>
      {showDelete && (
        <DeleteDayDialog token={token} initialDate={date} today={day.today} onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); onChanged(); }} />
      )}
    </section>
  );
}
