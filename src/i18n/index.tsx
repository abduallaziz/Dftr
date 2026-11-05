import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang, Role } from "../types";
import ar from "./locales/ar.json";
import en from "./locales/en.json";
import bn from "./locales/bn.json";

export const LANGS: readonly Lang[] = ["ar", "en", "bn"];
export const LANG_NAMES: Record<Lang, string> = { ar: "العربية", en: "English", bn: "বাংলা" };
export const DIRECTION: Record<Lang, "rtl" | "ltr"> = { ar: "rtl", en: "ltr", bn: "ltr" };
export const DEFAULT_LANG: Record<Role, Lang> = { employee: "bn", accountant: "ar" };

const DICTS: Record<Lang, Record<string, string>> = { ar, en, bn };

const storageKey = (role: Role): string => `carwash.lang.${role}`;

export function isLang(v: unknown): v is Lang {
  return v === "ar" || v === "en" || v === "bn";
}

export function readStoredLang(role: Role): Lang {
  try {
    const v = localStorage.getItem(storageKey(role));
    if (isLang(v)) return v;
  } catch {
    // storage unavailable (private mode): fall back to default
  }
  return DEFAULT_LANG[role];
}

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const raw = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nValue | null>(null);

export function I18nProvider({ role, children }: { role: Role; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang(role));

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = DIRECTION[lang];
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(storageKey(role), l);
      } catch {
        // ignore: preference simply won't persist
      }
    },
    [role],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, dir: DIRECTION[lang], setLang, t: (k, p) => translate(lang, k, p) }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}

export function hasKey(key: string): boolean {
  return key in en;
}

/** Maps an API/network error to a translated message. */
export function errorMessage(t: I18nValue["t"], err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "server";
  const key = `errors.${code}`;
  return t(hasKey(key) ? key : "errors.server");
}
