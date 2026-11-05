import { useEffect, useState } from "react";
import { I18nProvider } from "./i18n";
import { resolveRole } from "./services/role";
import type { Role } from "./types";
import { tokenFromPath } from "./utils/route";
import AccountantPage from "./pages/AccountantPage";
import EmployeePage from "./pages/EmployeePage";
import InvalidLinkPage from "./pages/InvalidLinkPage";
import NotFoundPage from "./pages/NotFoundPage";

type State = { kind: "loading" } | { kind: "role"; role: Role } | { kind: "invalid" } | { kind: "error"; code: string };

export default function App() {
  const token = tokenFromPath(window.location.pathname);
  const [state, setState] = useState<State>({ kind: token ? "loading" : "invalid" });

  useEffect(() => {
    if (!token) return;
    let live = true;
    resolveRole(token)
      .then((role) => live && setState(role ? { kind: "role", role } : { kind: "invalid" }))
      .catch((e: unknown) => live && setState({ kind: "error", code: e instanceof Error ? e.message : "server" }));
    return () => {
      live = false;
    };
  }, [token]);

  // Anything that is not a valid token path looks like an empty site.
  if (!token) return <NotFoundPage />;
  if (state.kind === "loading") return null;

  if (state.kind === "role") {
    return (
      <I18nProvider role={state.role}>
        {state.role === "employee" ? <EmployeePage token={token} /> : <AccountantPage token={token} />}
      </I18nProvider>
    );
  }
  return (
    <I18nProvider role="employee">
      <InvalidLinkPage code={state.kind === "error" ? state.code : undefined} />
    </I18nProvider>
  );
}
