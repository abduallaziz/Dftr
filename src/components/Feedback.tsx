import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n";

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
      <span className="flex-1 text-base">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-lg bg-red-700 px-4 py-2 font-medium text-white">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900" role="status" aria-live="polite">
      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
      <div className="text-base font-medium">{children}</div>
    </div>
  );
}
