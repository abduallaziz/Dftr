import type { Lang } from "../types";

export interface ItemNotes {
  note_ar?: string | null;
  note_en?: string | null;
  note_bn?: string | null;
  note_src?: Lang | null;
}

export interface ItemText {
  text: string;
  /** Language the text is in. Differs from the reader's language while the translation is still missing. */
  lang: Lang;
}

/** The free-text item name ("Other" expenses) in the reader's language, falling back to what the employee wrote. */
export function itemText(e: ItemNotes, lang: Lang): ItemText | null {
  const own = e[`note_${lang}` as const];
  if (own) return { text: own, lang };
  if (e.note_src) {
    const src = e[`note_${e.note_src}` as const];
    if (src) return { text: src, lang: e.note_src };
  }
  for (const l of ["en", "ar", "bn"] as const) {
    const v = e[`note_${l}` as const];
    if (v) return { text: v, lang: l };
  }
  return null;
}

export function lacksTranslation(e: ItemNotes): boolean {
  return !!e.note_src && !(e.note_ar && e.note_en && e.note_bn);
}

/** The employee's own words, when the reader sees a translation of them (so the translation can be checked). */
export function itemOriginal(e: ItemNotes, lang: Lang): ItemText | null {
  if (!e.note_src || e.note_src === lang) return null;
  const v = e[`note_${e.note_src}` as const];
  return v ? { text: v, lang: e.note_src } : null;
}
