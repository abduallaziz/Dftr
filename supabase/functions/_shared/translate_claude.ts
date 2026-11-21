import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { translateItem, type Lang, type Triple } from "./translate.ts";

/**
 * Translates an item name with Claude. Returns null (never throws) when no API key is configured, the call fails,
 * times out, is refused, or the answer is unusable: the expense is then kept with its original text only and the
 * owner can retry from the owner panel.
 */
export async function translateWithClaude(text: string, from: Lang): Promise<Triple | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;
  const client = new Anthropic({
    apiKey,
    baseURL: Deno.env.get("ANTHROPIC_BASE_URL") ?? undefined, // only overridden in tests
    timeout: 25_000,
    maxRetries: 1,
  });
  return await translateItem(text, from, async (system, user) => {
    const res = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000, // thinking is always on for this model and shares this budget
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new Error("refused");
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  });
}
