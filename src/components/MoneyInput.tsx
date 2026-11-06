interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  large?: boolean;
  autoFocus?: boolean;
  /** Optional colour dot before the label (e.g. "bg-blue-500"). */
  dot?: string;
}

/** SAR amount input: digits with an optional decimal point, max 2 decimals. */
export default function MoneyInput({ id, label, value, onChange, large = false, autoFocus = false, dot }: Props) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-2 text-base font-medium text-slate-700">
        {dot && <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} aria-hidden />}
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0.00"
        dir="ltr"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(",", ".");
          if (v === "" || /^\d{0,8}(\.\d{0,2})?$/.test(v)) onChange(v);
        }}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 text-start font-semibold tabular-nums ${
          large ? "py-4 text-4xl" : "py-3 text-xl"
        }`}
      />
    </div>
  );
}
