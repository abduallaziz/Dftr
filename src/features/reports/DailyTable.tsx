import { Fragment, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useI18n } from "../../i18n";
import type { Category, DailyRow } from "../../types";
import { categoryName } from "../../utils/category";
import { formatDate, formatInt, formatSar } from "../../utils/format";
import { actualCars, countStatus } from "../../utils/cars";
import DayDetails from "./DayDetails";

interface Props {
  token: string;
  rows: DailyRow[];
  categories: Category[];
  sort: "date" | "amount";
  dir: "asc" | "desc";
  onSort: (s: "date" | "amount") => void;
  onEditTotal: (date: string) => void;
  showPayments: boolean;
}

function ActualCell({ row }: { row: DailyRow }) {
  const { t, lang } = useI18n();
  const a = actualCars(row.total_cars, row.free_large, row.free_small);
  if (a === null) return <td className="px-3 py-3 text-slate-400" title={t("accountant.notRecorded")}>—</td>;
  return (
    <td className={`px-3 py-3 font-semibold tabular-nums ${a < 0 ? "text-red-700" : ""}`} title={a < 0 ? t("accountant.freeExceedsTotal") : undefined}>
      {formatInt(a, lang)}
    </td>
  );
}

function CheckCell({ row }: { row: DailyRow }) {
  const { t, lang } = useI18n();
  const { status, diff } = countStatus(row.total_cars, row.employee_total_cars);
  const cls = {
    match: "bg-emerald-50 text-emerald-800",
    mismatch: "bg-red-50 text-red-800",
    pending: "bg-slate-100 text-slate-600",
    employee_missing: "bg-amber-50 text-amber-800",
  }[status];
  const label = {
    match: t("accountant.statusMatch"),
    mismatch: t("accountant.statusMismatch", { diff: diff > 0 ? `+${formatInt(diff, lang)}` : formatInt(diff, lang) }),
    pending: t("accountant.statusPending"),
    employee_missing: t("accountant.statusEmployeeMissing"),
  }[status];
  return (
    <td className="px-3 py-3">
      <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${cls}`}>{label}</span>
    </td>
  );
}

export default function DailyTable({ token, rows, categories, sort, dir, onSort, onEditTotal, showPayments }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const colCount = 9 + categories.length;
  const Arrow = dir === "asc" ? ArrowUp : ArrowDown;

  const SortHead = ({ field, label }: { field: "date" | "amount"; label: string }) => (
    <th className="px-3 py-3 text-start font-semibold" aria-sort={sort === field ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 whitespace-nowrap">
        {label} {sort === field && <Arrow className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <SortHead field="date" label={t("accountant.colDate")} />
            <th className="px-3 py-3 text-start font-semibold">{t("accountant.colTotalCars")}</th>
            <th className="px-3 py-3 text-start font-semibold">{t("accountant.colEmployeeCars")}</th>
            <th className="px-3 py-3 text-start font-semibold">{t("accountant.colCheck")}</th>
            <th className="px-3 py-3 text-start font-semibold">{t("accountant.colFreeLarge")}</th>
            <th className="px-3 py-3 text-start font-semibold">{t("accountant.colFreeSmall")}</th>
            <th className="px-3 py-3 text-start font-semibold">{t("accountant.colActual")}</th>
            <SortHead field="amount" label={t("accountant.colTotal")} />
            {categories.map((c) => (
              <th key={c.id} className="whitespace-nowrap px-3 py-3 text-start font-semibold">{categoryName(c, lang)}</th>
            ))}
            <th className="w-10 px-3 py-3"><span className="sr-only">{t("accountant.expand")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const isOpen = open === r.report_date;
            return (
              <Fragment key={r.report_date}>
                <tr className={isOpen ? "bg-brand-50" : "hover:bg-slate-50"}>
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{formatDate(r.report_date, lang, { weekday: true })}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      {r.total_cars === null ? "—" : formatInt(r.total_cars, lang)}
                      <button type="button" onClick={() => onEditTotal(r.report_date)} aria-label={t("accountant.editTotal")} className="rounded p-1 text-slate-400 hover:bg-white hover:text-brand-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{r.employee_total_cars === null ? "—" : formatInt(r.employee_total_cars, lang)}</td>
                  <CheckCell row={r} />
                  <td className="px-3 py-3 tabular-nums">{r.has_report ? formatInt(r.free_large ?? 0, lang) : "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{r.has_report ? formatInt(r.free_small ?? 0, lang) : "—"}</td>
                  <ActualCell row={r} />
                  <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{formatSar(r.total_expenses, lang)}</td>
                  {categories.map((c) => {
                    const v = r.by_category[c.id];
                    return (
                      <td key={c.id} className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">
                        {v === undefined ? "—" : formatSar(v, lang)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : r.report_date)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? t("accountant.collapse") : t("accountant.expand")}
                      className="rounded-lg border border-slate-200 p-1.5 hover:bg-white"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={colCount} className="p-0">
                      <DayDetails token={token} row={r} categories={categories} showPayments={showPayments} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
