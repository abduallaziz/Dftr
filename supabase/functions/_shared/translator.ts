import { translateFree, type Lang, type Triple } from "./translate.ts";

type Partial3 = Partial<Triple>;
import { translateWithClaude } from "./translate_claude.ts";

export type Provider = "claude" | "free";

/** Claude only when the owner added an API key (optional, paid). Otherwise the free service, which needs nothing. */
export function activeProvider(): Provider {
  return Deno.env.get("ANTHROPIC_API_KEY") ? "claude" : "free";
}

async function translateWithMyMemory(text: string, from: Lang): Promise<Partial3 | null> {
  const base = Deno.env.get("MYMEMORY_BASE_URL") ?? "https://api.mymemory.translated.net"; // only overridden in tests
  return await translateFree(text, from, async (f, to, q) => {
    // No e-mail parameter is sent: nothing about the owner leaves the system, only the short item name.
    const url = `${base}/get?q=${encodeURIComponent(q)}&langpair=${f}|${to}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return await res.json();
  });
}

/** Never throws: null means "could not translate now" and the item stays pending (retried later, or typed by the owner). */
export async function translateItemName(text: string, from: Lang): Promise<Partial3 | null> {
  if (activeProvider() === "claude") {
    const r = await translateWithClaude(text, from);
    if (r) return r;
  }
  return await translateWithMyMemory(text, from);
}
