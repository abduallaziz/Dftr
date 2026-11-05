import { useEffect, useState } from "react";
import { ErrorBanner, Spinner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi } from "../../services/admin";

export default function SettingsPanel({ token }: { token: string }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSettings(token).then((s) => setVisible(s.show_payments_to_accountant)).catch((e: unknown) => setError(errorMessage(t, e)));
  }, [token, t]);

  async function toggle() {
    if (visible === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.setPaymentsVisible(token, !visible);
      setVisible(!visible);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  if (visible === null && !error) return <Spinner />;
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.settingsTitle")}</h2>
      {error && <ErrorBanner message={error} />}
      {visible !== null && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="font-semibold">{t("admin.paymentsToAccountant")}</div>
            <div className="text-sm text-slate-500">{t("admin.paymentsToAccountantHint")}</div>
          </div>
          <button type="button" role="switch" aria-checked={visible} disabled={busy} onClick={toggle}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${visible ? "bg-brand-600" : "bg-slate-300"}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${visible ? "start-7" : "start-1"}`} />
            <span className="sr-only">{visible ? t("admin.on") : t("admin.off")}</span>
          </button>
        </div>
      )}
      {visible !== null && <p className="text-sm font-medium">{visible ? t("admin.on") : t("admin.off")}</p>}
    </section>
  );
}
