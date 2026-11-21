import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { missingLangs, type Lang } from "./translate.ts";
import { translateItemName } from "./translator.ts";

const LANGS: readonly Lang[] = ["ar", "en", "bn"];

/**
 * Fills in the missing translations of one expense. Only empty fields are written, so a text the owner
 * corrected by hand is never overwritten. Returns true when at least the missing texts could be produced.
 */
export async function completeTranslations(db: SupabaseClient, id: number, text: string, lang: Lang): Promise<boolean> {
  const t = await translateItemName(text, lang);
  if (!t) return false;
  let wrote = false;
  for (const l of LANGS) {
    const v = t[l];
    if (l === lang || !v) continue; // a language the service could not produce stays empty (retried later or typed by the owner)
    const { error } = await db.from("expenses").update({ [`note_${l}`]: v }).eq("id", id).is(`note_${l}`, null);
    if (error) throw error;
    wrote = true;
  }
  return wrote;
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

/**
 * Retries a few older items that still lack a language (for example when the free service's daily limit was hit),
 * so translations catch up by themselves without anyone pressing a button.
 */
export async function retryPending(db: SupabaseClient, limit = 3): Promise<number> {
  const { data, error } = await db.from("expenses").select("id, note_src, note_ar, note_en, note_bn")
    .not("note_src", "is", null).or("note_ar.is.null,note_en.is.null,note_bn.is.null").order("id", { ascending: true }).limit(limit);
  if (error) throw error;
  let done = 0;
  for (const r of (data ?? []) as ItemRow[]) {
    const text = sourceText(r);
    if (text && r.note_src && (await completeTranslations(db, r.id, text, r.note_src))) done++;
  }
  return done;
}

export { missingLangs };
