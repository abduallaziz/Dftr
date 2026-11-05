import type { Category, Lang } from "../types";

export function categoryName(c: Category, lang: Lang): string {
  return lang === "ar" ? c.name_ar : lang === "bn" ? c.name_bn : c.name_en;
}
