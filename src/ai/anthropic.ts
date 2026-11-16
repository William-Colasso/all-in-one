import Anthropic from "@anthropic-ai/sdk";
import { AiError, type AiRequest, type AiResult, type AiSource, type Fetch } from "./types";

/** Models that accept the server-side refusal fallback; others reject the parameter. */
const HAS_FALLBACK = /^claude-(fable-5-[12]|opus-5(-5)?|sonnet-5-5)$/;

/** A web-search turn can pause server-side; it is resumed by sending it back. Cap the resumes. */
const MAX_RESUMES = 4;

export async function completeAnthropic(
  req: AiRequest,
  opts: { apiKey: string; model: string; fetch: Fetch },
): Promise<AiResult> {
  // The key is the user's own, typed into this app on their device; there is no server to keep it on.
  const client = new Anthropic({ apiKey: opts.apiKey, fetch: opts.fetch, dangerouslyAllowBrowser: true, maxRetries: 1 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: req.prompt }];

  try {
    for (let resumes = 0; ; resumes++) {
      const res = await client.beta.messages.create({
        model: opts.model,
        // Non-streaming (Obsidian's requestUrl cannot stream), so stay well under HTTP timeouts.
        max_tokens: 16000,
        system: req.system,
        messages,
        output_config: { effort: req.effort ?? "medium" },
        ...(req.webSearch ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 5 }] } : {}),
        ...(HAS_FALLBACK.test(opts.model)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      });

      if (res.stop_reason === "pause_turn" && resumes < MAX_RESUMES) {
        messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
        continue;
      }
      if (res.stop_reason === "refusal") throw new AiError("refusal");

      let text = "";
      const sources = new Map<string, AiSource>();
      for (const block of res.content) {
        if (block.type !== "text") continue;
        text += block.text;
        for (const c of block.citations ?? []) {
          if (c.type === "web_search_result_location") sources.set(c.url, { url: c.url, title: c.title ?? c.url });
        }
      }
      text = text.trim();
      if (!text) throw new AiError(res.stop_reason === "max_tokens" ? "truncated" : "empty");
      return { text, sources: [...sources.values()] };
    }
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError("auth");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("rate");
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("network");
    if (e instanceof Anthropic.APIError) throw new AiError("api", e.message);
    throw e;
  }
}
