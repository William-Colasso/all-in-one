export type Provider = "anthropic" | "openai";

/** One single-turn request. There is no conversation: every action is one question, one answer. */
export interface AiRequest {
  system: string;
  prompt: string;
  /** Let the model search the web. Only honoured by providers that support it (see Ai.supportsWeb). */
  webSearch?: boolean;
  /** How hard the model should work; "low" for trivial classification. Default "medium". */
  effort?: "low" | "medium" | "high";
}

export interface AiSource {
  title: string;
  url: string;
}

export interface AiResult {
  text: string;
  /** Web pages the answer cites (empty without web search). */
  sources: AiSource[];
}

export type AiErrorCode =
  | "disabled" // no provider configured
  | "auth" // missing, wrong or unauthorized key
  | "rate" // rate limited or out of credit
  | "network" // could not reach the provider
  | "refusal" // the model declined
  | "truncated" // answer cut off by the output limit
  | "empty" // the provider answered with no text
  | "api"; // any other provider error; `message` carries its text

export class AiError extends Error {
  constructor(public code: AiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AiError";
  }
}

export type Fetch = typeof fetch;
