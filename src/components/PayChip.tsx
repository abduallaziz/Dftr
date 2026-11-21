import { Banknote, CreditCard } from "lucide-react";
import { useI18n } from "../i18n";
import type { PaymentMethod } from "../types";

/** Small badge showing how an expense was paid. Rows without the field are cash (the default). */
export default function PayChip({ method }: { method?: PaymentMethod }) {
  const { t } = useI18n();
  const m: PaymentMethod = method ?? "cash";
  const Icon = m === "cash" ? Banknote : CreditCard;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ${m === "cash" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
      <Icon className="h-3 w-3" aria-hidden /> {t(m === "cash" ? "pay.cash" : "pay.card")}
    </span>
  );
}
