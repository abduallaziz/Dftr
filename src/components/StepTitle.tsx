import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { formatInt } from "../utils/format";

export type StepTone = "navy" | "blue" | "teal" | "amber";
// Same meaning as on the accountant dashboard: navy = cars total/summary, blue = free cars, teal = expenses, amber = payments.
const CHIP: Record<StepTone, string> = {
  navy: "bg-navy-800 text-white",
  blue: "bg-blue-600 text-white",
  teal: "bg-brand-600 text-white",
  amber: "bg-amber-500 text-white",
};

/** Numbered section title: the employee follows the steps 1, 2, 3... in order. */
export default function StepTitle({ step, tone, children }: { step: number; tone: StepTone; children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <h2 className="flex items-center gap-3 text-xl font-bold">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${CHIP[tone]}`} aria-hidden>
        {formatInt(step, lang)}
      </span>
      <span>{children}</span>
    </h2>
  );
}
