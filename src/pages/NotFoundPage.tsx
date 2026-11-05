import { FileQuestion } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import { useI18n } from "../i18n";

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <FileQuestion className="h-16 w-16 text-slate-400" aria-hidden />
      <h1 className="text-2xl font-bold">{t("app.notFoundTitle")}</h1>
      <p className="text-lg text-slate-600">{t("app.notFoundText")}</p>
      <LanguageSelector />
    </div>
  );
}
