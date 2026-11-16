import { AiError, type AiRequest, type AiResult, type Fetch } from "./types";

/**
 * Any server that speaks the OpenAI Chat Completions protocol (OpenAI, OpenRouter, Gemini's
 * compatibility endpoint, Ollama, LM Studio…). `baseUrl` ends before "/chat/completions".
 * ponytail: no web search here (the protocol has no standard for it); pick a model that
 * searches on its own if you need it.
 */
export async function completeOpenAI(
  req: AiRequest,
  opts: { apiKey: string; model: string; baseUrl: string; fetch: Fetch },
): Promise<AiResult> {
  let res: Response;
  try {
    res = await opts.fetch(`${opts.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Local servers such as Ollama take no key.
        ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      }),
    });
  } catch {
    throw new AiError("network");
  }

  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new AiError("auth");
    if (res.status === 429) throw new AiError("rate");
    throw new AiError("api", body?.error?.message ?? `HTTP ${res.status}`);
  }

  const choice = body?.choices?.[0];
  const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
  if (!text) throw new AiError(choice?.finish_reason === "length" ? "truncated" : "empty");
  return { text, sources: [] };
}
