import { I18nProvider } from "./i18n";
import AccountantPage from "./pages/AccountantPage";
import EmployeePage from "./pages/EmployeePage";
import NotFoundPage from "./pages/NotFoundPage";

const ROUTE_RE = /^\/(employee|accountant)\/([A-Za-z0-9_-]{16,256})\/?$/;

export default function App() {
  const match = ROUTE_RE.exec(window.location.pathname);
  const role = match?.[1];
  const token = match?.[2];

  if (role === "employee" && token) {
    return (
      <I18nProvider role="employee">
        <EmployeePage token={token} />
      </I18nProvider>
    );
  }
  if (role === "accountant" && token) {
    return (
      <I18nProvider role="accountant">
        <AccountantPage token={token} />
      </I18nProvider>
    );
  }
  return (
    <I18nProvider role="employee">
      <NotFoundPage />
    </I18nProvider>
  );
}
