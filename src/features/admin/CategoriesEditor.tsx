import { useState } from "react";
import { ErrorBanner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi, type CategoryPayload } from "../../services/admin";
import type { Category } from "../../types";
import { ICON_NAMES } from "../../utils/icons";

const blank: CategoryPayload = { id: "", name_ar: "", name_en: "", name_bn: "", icon: "Package", is_active: true, sort_order: 100, create: true };

function Row({ token, c, create, onSaved }: { token: string; c: CategoryPayload; create: boolean; onSaved: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState(c);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CategoryPayload>(k: K, val: CategoryPayload[K]) => setV((s) => ({ ...s, [k]: val }));
  const cls = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.saveCategory(token, { ...v, create });
      if (create) setV(blank);
      onSaved();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <input className={cls} dir="ltr" placeholder={t("admin.catId")} value={v.id} disabled={!create} onChange={(e) => set("id", e.target.value.toLowerCase())} />
        <input className={cls} placeholder={t("admin.nameAr")} value={v.name_ar} onChange={(e) => set("name_ar", e.target.value)} />
        <input className={cls} placeholder={t("admin.nameEn")} value={v.name_en} onChange={(e) => set("name_en", e.target.value)} />
        <input className={cls} placeholder={t("admin.nameBn")} value={v.name_bn} onChange={(e) => set("name_bn", e.target.value)} />
        <select className={cls} value={v.icon} aria-label={t("admin.icon")} onChange={(e) => set("icon", e.target.value)}>
          {ICON_NAMES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <input className={cls} dir="ltr" type="number" min={0} max={1000} aria-label={t("admin.order")} value={v.sort_order} onChange={(e) => set("sort_order", Math.trunc(Number(e.target.value)))} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_active} onChange={(e) => set("is_active", e.target.checked)} /> {t("admin.active")}</label>
        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-navy-800 px-4 py-1.5 text-sm font-medium text-white">{create ? t("admin.create") : t("admin.saveCategory")}</button>
      </div>
      {error && <ErrorBanner message={error} />}
    </div>
  );
}

export default function CategoriesEditor({ token, categories, onSaved }: { token: string; categories: Category[]; onSaved: () => void }) {
  const { t } = useI18n();
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.categoriesTitle")}</h2>
      {categories.map((c) => (
        <Row key={`${c.id}:${c.name_ar}:${c.name_en}:${c.name_bn}:${c.icon}:${c.sort_order}:${c.is_active}`} token={token} create={false} onSaved={onSaved}
          c={{ id: c.id, name_ar: c.name_ar, name_en: c.name_en, name_bn: c.name_bn, icon: c.icon, is_active: c.is_active ?? true, sort_order: c.sort_order, create: false }} />
      ))}
      <h3 className="pt-2 font-semibold">{t("admin.newCategory")}</h3>
      <Row token={token} c={blank} create onSaved={onSaved} />
    </section>
  );
}
