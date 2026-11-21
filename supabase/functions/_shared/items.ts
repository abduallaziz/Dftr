import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { missingLangs, type Lang } from "./translate.ts";
import { translateWithClaude } from "./translate_claude.ts";

const LANGS: readonly Lang[] = ["ar", "en", "bn"];

/**
 * Fills in the missing translations of one expense. Only empty fields are written, so a text the owner
 * corrected by hand is never overwritten. Returns true when at least the missing texts could be produced.
 */
export async function completeTranslations(db: SupabaseClient, id: number, text: string, lang: Lang): Promise<boolean> {
  const t = await translateWithClaude(text, lang);
  if (!t) return false;
  for (const l of LANGS) {
    if (l === lang) continue;
    const { error } = await db.from("expenses").update({ [`note_${l}`]: t[l] }).eq("id", id).is(`note_${l}`, null);
    if (error) throw error;
  }
  return true;
}

/** Runs a task after the response was sent when the runtime supports it, otherwise waits for it. */
export async function inBackground(task: Promise<unknown>): Promise<void> {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  const safe = task.catch((e) => console.error("background task failed", e instanceof Error ? e.message : e));
  if (rt?.waitUntil) rt.waitUntil(safe);
  else await safe;
}

export interface ItemRow {
  id: number;
  note_src: Lang | null;
  note_ar: string | null;
  note_en: string | null;
  note_bn: string | null;
}

export function sourceText(r: ItemRow): string | null {
  return r.note_src ? (r[`note_${r.note_src}` as const] ?? null) : null;
}

export { missingLangs };
