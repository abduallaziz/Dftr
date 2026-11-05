import { ShieldAlert } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import { errorMessage, useI18n } from "../i18n";

export default function InvalidLinkPage({ code }: { code?: string }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldAlert className="h-16 w-16 text-red-600" aria-hidden />
      <h1 className="text-2xl font-bold">{t("app.invalidLinkTitle")}</h1>
      <p className="text-lg text-slate-600">{code ? errorMessage(t, { code }) : t("app.invalidLinkText")}</p>
      <LanguageSelector />
    </div>
  );
}
