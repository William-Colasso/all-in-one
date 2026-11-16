import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: class {}, getLanguage: () => "en" }));

import { AiError } from "../ai/types";
import { aiMessage, shorten } from "./ai";

describe("ai ui helpers", () => {
  it("maps error codes to inline messages", () => {
    expect(aiMessage(new AiError("auth"))).toMatch(/API key/);
    expect(aiMessage(new AiError("api", "overloaded"))).toMatch(/overloaded/);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(aiMessage(new Error("boom"))).toBe("Something went wrong. Try again.");
  });

  it("shortens to one line on a word boundary", () => {
    expect(shorten("  short\nquestion ")).toBe("short question");
    const s = shorten("What are the main arguments of this note and how do they relate to the previous chapter?");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s).toBe("What are the main arguments of this note and how do they…");
  });
});
