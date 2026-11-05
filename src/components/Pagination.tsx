import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n";
import { formatInt } from "../utils/format";

interface Props {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, pages, onPage }: Props) {
  const { t, lang, dir } = useI18n();
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      <button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label={t("accountant.previous")} className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-40">
        <Prev className="h-5 w-5" />
      </button>
      <span className="text-sm text-slate-600">{t("accountant.pageOf", { page: formatInt(page + 1, lang), pages: formatInt(pages, lang) })}</span>
      <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label={t("accountant.next")} className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-40">
        <Next className="h-5 w-5" />
      </button>
    </div>
  );
}
