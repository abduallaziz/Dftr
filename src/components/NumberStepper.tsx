import { Minus, Plus } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}

/** Large touch-friendly integer stepper: no negatives, no decimals, zero allowed. */
export default function NumberStepper({ label, value, onChange, max = 10000 }: Props) {
  const { t } = useI18n();
  const clamp = (n: number): number => Math.min(max, Math.max(0, Math.trunc(n)));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-semibold">{label}</div>
      <div className="flex items-center justify-between gap-3" dir="ltr">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 0}
          aria-label={`${t("employee.decrease")} - ${label}`}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-navy-800 active:bg-slate-200 disabled:opacity-40"
        >
          <Minus className="h-8 w-8" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
            onChange(clamp(digits === "" ? 0 : Number(digits)));
          }}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 rounded-xl border-0 bg-transparent text-center text-5xl font-bold tabular-nums"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`${t("employee.increase")} - ${label}`}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white active:bg-brand-700"
        >
          <Plus className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
