import { type App, requestUrl } from "obsidian";
import { completeAnthropic } from "./anthropic";
import { completeOpenAI } from "./openai";
import { AiError, type AiRequest, type AiResult, type Fetch, type Provider } from "./types";

export interface AiSettings {
  provider: Provider;
  /** Model id as the provider names it. */
  model: string;
  /** OpenAI-compatible only: URL up to and excluding "/chat/completions". */
  baseUrl: string;
  /** Id of the API key in Obsidian's secret storage ("" = none). The key itself is never in data.json. */
  secret: string;
}

export const AI_DEFAULTS: Record<Provider, { model: string; baseUrl: string }> = {
  anthropic: { model: "claude-opus-5-5", baseUrl: "" },
  openai: { model: "", baseUrl: "https://api.openai.com/v1" },
};

/**
 * fetch() on top of Obsidian's requestUrl, which is not subject to CORS and works on mobile.
 * ponytail: no streaming and no abort signal (requestUrl has neither); answers arrive whole.
 */
export const obsidianFetch: Fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const headers: Record<string, string> = {};
  new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
  const r = await requestUrl({
    url,
    method: init?.method ?? "GET",
    headers,
    body: typeof init?.body === "string" ? init.body : undefined,
    throw: false,
  });
  const noBody = r.status === 204 || r.status === 304;
  return new Response(noBody ? null : r.arrayBuffer, { status: r.status, headers: r.headers });
};

/** The plugin's single entry point to a language model. Nothing is sent unless a UI action calls complete(). */
export class Ai {
  constructor(private app: App, private settings: () => AiSettings) {}

  private key(): string {
    const id = this.settings().secret;
    return (id && this.app.secretStorage.getSecret(id)) || "";
  }

  /** True when a provider is configured well enough to try a request. */
  get enabled(): boolean {
    const s = this.settings();
    return s.provider === "anthropic" ? !!this.key() && !!s.model : !!s.baseUrl && !!s.model;
  }

  get supportsWeb(): boolean {
    return this.settings().provider === "anthropic";
  }

  /** @throws AiError */
  async complete(req: AiRequest): Promise<AiResult> {
    if (!this.enabled) throw new AiError("disabled");
    const s = this.settings();
    const apiKey = this.key();
    return s.provider === "anthropic"
      ? completeAnthropic({ ...req, webSearch: req.webSearch }, { apiKey, model: s.model, fetch: obsidianFetch })
      : completeOpenAI(req, { apiKey, model: s.model, baseUrl: s.baseUrl, fetch: obsidianFetch });
  }
}
