import { CalendarDays, WashingMachine } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import { ErrorBanner, Spinner } from "../components/Feedback";
import DailySummary from "../features/employee/DailySummary";
import FreeCarsSection from "../features/employee/FreeCarsSection";
import PaymentsSection from "../features/employee/PaymentsSection";
import ExpenseSection from "../features/expenses/ExpenseSection";
import { useEmployeeData } from "../hooks/useEmployeeData";
import { errorMessage, useI18n } from "../i18n";
import { employeeApi } from "../services/employee";
import { ApiError } from "../services/api";
import { formatDate } from "../utils/format";
import InvalidLinkPage from "./InvalidLinkPage";

export default function EmployeePage({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const { data, error, loading, reload, setDaily, addExpense } = useEmployeeData(token);

  if (error instanceof ApiError && error.code === "unauthorized") return <InvalidLinkPage />;

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-16 pt-4">
      <header className="mb-5 space-y-3">
        <div className="flex justify-center"><LanguageSelector large /></div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <WashingMachine className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t("app.employeeTitle")}</h1>
            {data && (
              <p className="flex items-center gap-1 text-slate-600">
                <CalendarDays className="h-4 w-4" aria-hidden /> {formatDate(data.date, lang, { weekday: true })}
              </p>
            )}
          </div>
        </div>
      </header>

      {loading && !data && <Spinner />}
      {error !== null && <ErrorBanner message={errorMessage(t, error)} onRetry={() => void reload()} />}

      {data && (
        <main className="space-y-8">
          <FreeCarsSection
            daily={data.daily}
            onSave={async (f) => setDaily((await employeeApi.saveDaily(token, f)).daily)}
          />
          <ExpenseSection
            categories={data.categories}
            onSubmit={async (input) => {
              const res = await employeeApi.submitExpense(token, input);
              addExpense(res.expense);
              return res;
            }}
          />
          <PaymentsSection
            daily={data.daily}
            onSave={async (f) => setDaily((await employeeApi.saveDaily(token, f)).daily)}
          />
          <DailySummary categories={data.categories} daily={data.daily} expenses={data.expenses} />
        </main>
      )}
    </div>
  );
}
