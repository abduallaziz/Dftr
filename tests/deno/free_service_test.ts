// Run with Deno (not part of `npm test`):  deno run -A tests/deno/free_service_test.ts
import { activeProvider, translateItemName } from "../../supabase/functions/_shared/translator.ts";
import { completeTranslations } from "../../supabase/functions/_shared/items.ts";
let mode = "ok"; const reqs: string[] = []; let claudeCalls = 0;
const mm = (t: string, s = 200) => new Response(JSON.stringify({ responseStatus: s, responseData: { translatedText: t, match: 0.85 } }), { headers: { "content-type": "application/json" } });
const server = Deno.serve({ port: 0, onListen: () => {} }, async (req) => {
  const u = new URL(req.url);
  if (u.pathname === "/v1/messages") { claudeCalls++; await req.text(); return new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "down" } }), { status: 500, headers: { "content-type": "application/json" } }); }
  reqs.push(u.search);
  const [f, to] = (u.searchParams.get("langpair") ?? "").split("|");
  if (mode === "ok") return mm(to === "ar" ? "فرشاة الإطارات" : "Tire brush");
  if (mode === "quota") return mm("MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY. NEXT AVAILABLE IN  09 HOURS", 429);
  if (mode === "entities") return mm(to === "ar" ? "ا&quot;ب" : "Tom &amp; Jerry");
  if (mode === "noisy-ar") return f === "en" && to === "ar" ? mm("RC تركيب الأنابيب") : to === "ar" ? mm("تركيب الأنابيب") : mm("পাইপ বসানো");
  return new Response("not json", { status: 502 });
});
const base = `http://localhost:${(server.addr as Deno.NetAddr).port}`;
Deno.env.set("MYMEMORY_BASE_URL", base); Deno.env.set("ANTHROPIC_BASE_URL", base); Deno.env.delete("ANTHROPIC_API_KEY");
const check = (n: string, c: boolean, d?: unknown) => { console.log((c ? "  PASS " : "  FAIL ") + n + (c ? "" : "   <-- " + JSON.stringify(d))); if (!c) Deno.exitCode = 1; };
const BN = "টায়ার ব্রাশ";
check("no key -> the FREE provider is used", activeProvider() === "free");
let r = await translateItemName(BN, "bn");
check("free service: Arabic + English added, original kept", JSON.stringify(r) === JSON.stringify({ bn: BN, ar: "فرشاة الإطارات", en: "Tire brush" }), r);
check("exactly two requests, only the item text and the language pair (no e-mail or other parameter)", reqs.length === 2 && reqs.every((q) => /^\?q=[^&]+&langpair=bn(%7C|\|)(ar|en)$/.test(q)), reqs);
mode = "quota"; r = await translateItemName(BN, "bn"); check("daily limit reached -> null (item stays pending)", r === null, r);
mode = "bad"; r = await translateItemName(BN, "bn"); check("service returns garbage -> null, no crash", r === null, r);
mode = "entities"; r = await translateItemName(BN, "bn"); check("HTML entities are decoded", r?.ar === 'ا"ب' && r?.en === "Tom & Jerry", r);
mode = "noisy-ar"; r = await translateItemName("Pipe installation", "en"); check("a noisy answer ('RC ...') is dropped and the language is rebuilt through another one", r?.ar === "تركيب الأنابيب" && r?.bn === "পাইপ বসানো", r);
mode = "ok"; Deno.env.set("ANTHROPIC_API_KEY", "k");
check("with an Anthropic key the provider is Claude", activeProvider() === "claude");
r = await translateItemName(BN, "bn"); check("Claude failing (500) falls back to the free service", r?.en === "Tire brush" && claudeCalls >= 1, { r, claudeCalls });
Deno.env.delete("ANTHROPIC_API_KEY");
const calls: Array<{ patch: Record<string, unknown>; id: unknown; isCol: string; isVal: unknown }> = [];
const fakeDb = { from: () => ({ update: (patch: Record<string, unknown>) => ({ eq: (_c: string, id: unknown) => ({ is: (isCol: string, isVal: unknown) => { calls.push({ patch, id, isCol, isVal }); return Promise.resolve({ error: null }); } }) }) }) };
const done = await completeTranslations(fakeDb as never, 42, BN, "bn");
check("only EMPTY fields are written (.is(col, null)) and never the source language: an owner's correction is safe", done && calls.length === 2 && calls.every((c) => c.isVal === null && c.id === 42) && calls.map((c) => c.isCol).sort().join() === "note_ar,note_en" && !calls.some((c) => "note_bn" in c.patch), calls);
await server.shutdown();
