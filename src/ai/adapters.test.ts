import { describe, expect, it } from "vitest";
import { completeAnthropic } from "./anthropic";
import { completeOpenAI } from "./openai";
import { AiError, type AiRequest } from "./types";

type Rec = { url: string; method?: string; headers: Headers; body: any };
type Reply = { status?: number; body?: unknown; throws?: unknown };

function fake(...queue: Reply[]) {
  const calls: Rec[] = [];
  const fetch: typeof globalThis.fetch = (async (url: any, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method,
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(init.body) : undefined,
    });
    const r = queue.length > 1 ? queue.shift()! : queue[0];
    if (r.throws) throw r.throws;
    return new Response(JSON.stringify(r.body), {
      status: r.status ?? 200,
      // retry-after-ms keeps the SDK's retry backoff near zero
      headers: { "content-type": "application/json", "retry-after-ms": "1" },
    });
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

const req: AiRequest = { system: "SYS", prompt: "USER" };
const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AiError);
    return e as AiError;
  }
  throw new Error("did not throw");
};

describe("completeOpenAI", () => {
  const ok = (content: string, finish = "stop") => ({ body: { choices: [{ message: { content }, finish_reason: finish }] } });
  const run = (f: ReturnType<typeof fake>, o: Partial<Parameters<typeof completeOpenAI>[1]> = {}) =>
    completeOpenAI(req, { apiKey: "k", model: "m", baseUrl: "http://h/v1", fetch: f.fetch, ...o });

  it("builds the request and returns trimmed text", async () => {
    const f = fake(ok("  hi \n"));
    expect(await run(f, { baseUrl: "http://h/v1///" })).toEqual({ text: "hi", sources: [] });
    const c = f.calls[0];
    expect(c.url).toBe("http://h/v1/chat/completions");
    expect(c.method).toBe("POST");
    expect(c.headers.get("authorization")).toBe("Bearer k");
    expect(c.body).toEqual({
      model: "m",
      messages: [
        { role: "system", content: "SYS" },
        { role: "user", content: "USER" },
      ],
    });
  });
  it("omits Authorization with an empty key", async () => {
    const f = fake(ok("hi"));
    await run(f, { apiKey: "" });
    expect(f.calls[0].headers.has("authorization")).toBe(false);
  });
  it("maps errors", async () => {
    expect((await code(run(fake({ status: 401, body: {} })))).code).toBe("auth");
    expect((await code(run(fake({ status: 429, body: {} })))).code).toBe("rate");
    const e = await code(run(fake({ status: 500, body: { error: { message: "boom" } } })));
    expect(e.code).toBe("api");
    expect(e.message).toContain("boom");
    expect((await code(run(fake(ok("", "length"))))).code).toBe("truncated");
    expect((await code(run(fake(ok("")))) ).code).toBe("empty");
    expect((await code(run(fake({ throws: new TypeError("fail") })))).code).toBe("network");
  });
});

describe("completeAnthropic", () => {
  const msg = (content: unknown[], stop = "end_turn", model = "claude-haiku-5-5") => ({
    body: { id: "msg_1", type: "message", role: "assistant", model, content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } },
  });
  const text = (t: string, citations?: unknown[]) => ({ type: "text", text: t, citations: citations ?? null });
  const run = (f: ReturnType<typeof fake>, r: AiRequest = req, model = "claude-haiku-5-5") =>
    completeAnthropic(r, { apiKey: "sk-test", model, fetch: f.fetch });
  const cite = (url: string, title: string | null) => ({ type: "web_search_result_location", url, title, cited_text: "x", encrypted_index: "y" });

  it("sends the expected request", async () => {
    const f = fake(msg([text(" hello ")]));
    expect(await run(f)).toEqual({ text: "hello", sources: [] });
    const c = f.calls[0];
    expect(c.url).toMatch(/\/v1\/messages/);
    // SDK 1.8.0 sends the key as a Bearer token; older versions used x-api-key
    expect(c.headers.get("x-api-key") ?? c.headers.get("authorization")).toMatch(/sk-test$/);
    expect(c.body.model).toBe("claude-haiku-5-5");
    expect(c.body.system).toBe("SYS");
    expect(c.body.messages).toEqual([{ role: "user", content: "USER" }]);
    expect(c.body.max_tokens).toBeGreaterThan(0);
    expect(c.body.output_config.effort).toBe("medium");
    expect(c.body).not.toHaveProperty("tools");
  });
  it("honours effort", async () => {
    const f = fake(msg([text("a")]));
    await run(f, { ...req, effort: "low" });
    expect(f.calls[0].body.output_config.effort).toBe("low");
  });
  it("adds the web search tool only when asked", async () => {
    const f = fake(msg([text("a")]));
    await run(f, { ...req, webSearch: true });
    expect(f.calls[0].body.tools).toEqual([expect.objectContaining({ type: "web_search_20260209", name: "web_search", max_uses: expect.any(Number) })]);
  });
  it("sends the fallback only to models that accept it", async () => {
    const a = fake(msg([text("a")]));
    await run(a, req, "claude-opus-5-5");
    expect(a.calls[0].body.fallbacks).toBe("default");
    expect(a.calls[0].headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    const b = fake(msg([text("a")]));
    await run(b);
    expect(b.calls[0].body).not.toHaveProperty("fallbacks");
    expect(b.calls[0].headers.get("anthropic-beta") ?? "").not.toContain("server-side-fallback");
  });
  it("collects de-duplicated sources and ignores non-text blocks", async () => {
    const f = fake(
      msg([
        { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "q" } },
        text("A", [cite("https://a.test", "Title A"), cite("https://b.test", null)]),
        text("B", [cite("https://a.test", "Title A")]),
      ]),
    );
    expect(await run(f)).toEqual({
      text: "AB",
      sources: [
        { url: "https://a.test", title: "Title A" },
        { url: "https://b.test", title: "https://b.test" },
      ],
    });
  });
  it("resumes pause_turn", async () => {
    const paused = [{ type: "server_tool_use", id: "s1", name: "web_search", input: { query: "q" } }];
    const f = fake(msg(paused, "pause_turn"), msg([text("done")]));
    expect((await run(f)).text).toBe("done");
    expect(f.calls).toHaveLength(2);
    const last = f.calls[1].body.messages.at(-1);
    expect(last.role).toBe("assistant");
    expect(last.content).toEqual(paused);
  });
  it("gives up after five pause_turn responses", async () => {
    const f = fake(msg([], "pause_turn"));
    expect((await code(run(f))).code).toBe("empty");
    expect(f.calls).toHaveLength(5);
  });
  it("maps stop reasons", async () => {
    expect((await code(run(fake(msg([], "refusal"))))).code).toBe("refusal");
    expect((await code(run(fake(msg([], "max_tokens"))))).code).toBe("truncated");
  });
  it("maps HTTP and network errors", async () => {
    const err = (type: string, message: string) => ({ type: "error", error: { type, message } });
    expect((await code(run(fake({ status: 401, body: err("authentication_error", "bad key") })))).code).toBe("auth");
    expect((await code(run(fake({ status: 429, body: err("rate_limit_error", "slow") })))).code).toBe("rate");
    const e = await code(run(fake({ status: 400, body: err("invalid_request_error", "bad field") })));
    expect(e.code).toBe("api");
    expect(e.message).toContain("bad field");
    const n = fake({ throws: new TypeError("fetch failed") });
    expect((await code(run(n))).code).toBe("network");
    expect(n.calls).toHaveLength(2);
  }, 10000);
});
