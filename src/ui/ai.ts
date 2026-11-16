import { AiError, type AiErrorCode } from "../ai/types";
import { isPt, type Key, t } from "../i18n";

/** Language the prompts should answer in. */
export const aiLang = (): "pt" | "en" => (isPt() ? "pt" : "en");

const ERRORS: Record<AiErrorCode, Key> = {
  disabled: "ai.err.disabled",
  auth: "ai.err.auth",
  rate: "ai.err.rate",
  network: "ai.err.network",
  refusal: "ai.err.refusal",
  truncated: "ai.err.truncated",
  empty: "ai.err.empty",
  api: "ai.err.api",
};

/** The inline, actionable sentence shown next to the button when an AI action fails. */
export function aiMessage(e: unknown): string {
  if (e instanceof AiError) return t(ERRORS[e.code] ?? "ai.err.generic", { message: e.message });
  console.error(e);
  return t("ai.err.generic");
}

/** One line of at most `n` characters, cut on the last word with an ellipsis. */
export function shorten(s: string, n = 60): string {
  const line = s.replace(/\s+/g, " ").trim();
  if (line.length <= n) return line;
  const cut = line.slice(0, n - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > n / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
