import { useEffect, useState } from "react";
import { ErrorBanner, Spinner } from "../../components/Feedback";
import { errorMessage, useI18n } from "../../i18n";
import { adminApi } from "../../services/admin";
import type { AuditEntry } from "../../types";
import { formatDate, formatTime } from "../../utils/format";

export default function AuditLog({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.audit(token).then((r) => setRows(r.entries)).catch((e: unknown) => setError(errorMessage(t, e)));
  }, [token, t]);

  if (error) return <ErrorBanner message={error} />;
  if (!rows) return <Spinner />;
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">{t("admin.auditTitle")}</h2>
      {rows.length === 0 && <p className="text-sm text-slate-500">{t("admin.noAudit")}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-xs">
            <div className="mb-1 flex flex-wrap gap-x-3 text-sm">
              <b>{t(`admin.action${r.action[0]?.toUpperCase()}${r.action.slice(1)}`)}</b>
              <span>{r.table_name} #{r.record_key}</span>
              <span className="text-slate-500" dir="ltr">{formatDate(r.at.slice(0, 10), lang)} {formatTime(r.at, lang)}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2" dir="ltr">
              <pre className="overflow-x-auto rounded bg-red-50 p-2"><b>{t("admin.before")}</b>{"\n"}{r.before ? JSON.stringify(r.before, null, 1) : "—"}</pre>
              <pre className="overflow-x-auto rounded bg-emerald-50 p-2"><b>{t("admin.after")}</b>{"\n"}{r.after ? JSON.stringify(r.after, null, 1) : "—"}</pre>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
