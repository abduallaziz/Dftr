import { Languages } from "lucide-react";
import { LANGS, LANG_NAMES, useI18n } from "../i18n";

export default function LanguageSelector({ large = false }: { large?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label={t("app.language")}>
      <Languages className="mx-1 h-4 w-4 text-slate-400" aria-hidden />
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-lg px-3 ${large ? "py-2.5 text-base" : "py-1.5 text-sm"} font-medium ${
            lang === l ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {LANG_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
