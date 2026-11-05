import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi } from "../../services/admin";
import type { AdminDay, AdminExpense } from "../../types";
import { categoryName } from "../../utils/category";
import { formatSar, formatTime, parseAmountInput } from "../../utils/format";

export default function ExpensesEditor({ token, date, day, onChanged }: { token: string; date: string; day: AdminDay; onChanged: () => void }) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState<AdminExpense | null>(null);
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [newCat, setNewCat] = useState(day.categories[0]?.id ?? "");
  const [newAmount, setNewAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string): string => {
    const c = day.categories.find((x) => x.id === id);
    return c ? categoryName(c, lang) : id;
  };

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(e: AdminExpense) {
    setEditing(e);
    setAmount(String(e.amount));
    setCat(e.category_id);
  }

  async function update() {
    if (!editing) return;
    const a = parseAmountInput(amount);
    if (a === null) return setError(t("errors.invalid_amount"));
    const patch: { amount?: number; category_id?: string } = {};
    if (a !== editing.amount) patch.amount = a;
    if (cat !== editing.category_id) patch.category_id = cat;
    if (Object.keys(patch).length === 0) return setEditing(null);
    await run(async () => {
      await adminApi.updateExpense(token, editing.id, patch);
      setEditing(null);
    });
  }

  async function add() {
    const a = parseAmountInput(newAmount);
    if (a === null) return setError(t("errors.invalid_amount"));
    await run(async () => {
      await adminApi.addExpense(token, date, newCat, a);
      setNewAmount("");
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.expensesTitle")}</h2>
      {error && <ErrorBanner message={error} />}
      {day.expenses.length === 0 ? (
        <p className="text-sm text-slate-500">{t("admin.noExpenses")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-start">{t("common.id")}</th>
                <th className="px-3 py-2 text-start">{t("common.category")}</th>
                <th className="px-3 py-2 text-start">{t("common.amount")}</th>
                <th className="px-3 py-2 text-start">{t("common.time")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {day.expenses.map((e) =>
                editing?.id === e.id ? (
                  <tr key={e.id} className="bg-brand-50">
                    <td className="px-3 py-2 tabular-nums">#{e.id}</td>
                    <td className="px-3 py-2">
                      <select value={cat} onChange={(ev) => setCat(ev.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5">
                        {day.categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c, lang)}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={amount} onChange={(ev) => setAmount(ev.target.value)} dir="ltr" inputMode="decimal" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 tabular-nums" />
                    </td>
                    <td className="px-3 py-2" />
                    <td className="space-x-2 px-3 py-2 text-end rtl:space-x-reverse">
                      <button type="button" disabled={busy} onClick={update} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white">{t("admin.update")}</button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-3 py-1.5">{t("admin.cancel")}</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id}>
                    <td className="px-3 py-2 tabular-nums">#{e.id}</td>
                    <td className="px-3 py-2">{nameOf(e.category_id)}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{formatSar(e.amount, lang)}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{formatTime(e.created_at, lang)}</td>
                    <td className="space-x-1 px-3 py-2 text-end rtl:space-x-reverse">
                      <button type="button" onClick={() => startEdit(e)} aria-label={t("admin.edit")} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                      <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("admin.confirmDeleteExpense"))) void run(() => adminApi.deleteExpense(token, e.id)); }} aria-label={t("admin.delete")} className="rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
        <span className="w-full text-sm font-semibold text-slate-700">{t("admin.addExpense")}</span>
        <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
          {day.categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{categoryName(c, lang)}</option>)}
        </select>
        <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" dir="ltr" inputMode="decimal" className="w-32 rounded-lg border border-slate-300 px-3 py-2 tabular-nums" />
        <button type="button" disabled={busy} onClick={add} className="flex items-center gap-1 rounded-lg bg-navy-800 px-4 py-2 font-medium text-white"><Plus className="h-4 w-4" /> {t("admin.add")}</button>
      </div>
    </section>
  );
}
