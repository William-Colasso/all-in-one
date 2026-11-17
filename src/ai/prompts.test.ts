import { describe, expect, it } from "vitest";
import {
  categoryPrompt,
  extractJson,
  giftPrompt,
  headingFor,
  languageName,
  notePrompt,
  parseGifts,
  parseWishResearch,
  pickCategory,
  sectionMarkdown,
  wishPrompt,
} from "./prompts";
import type { Person } from "../people/types";

const person: Person = {
  name: "Zelda Quixote",
  birthday: "1990-03-12",
  relation: "Sister",
  likes: ["coffee", "hiking"],
  sizes: ["shirt M"],
  ideas: ["Trail shoes"],
  given: ["2025-12-25 Headphones"],
};
const gift = (over: Partial<Parameters<typeof giftPrompt>[0]> = {}) =>
  giftPrompt({ person, currency: "BRL", lang: "en", webSearch: false, today: "2026-11-16", ...over });
const all = (r: { system: string; prompt: string }) => `${r.system}\n${r.prompt}`;

describe("giftPrompt", () => {
  it("never leaks the name", () => {
    const r = gift({ occasion: "birthday" });
    expect(all(r)).not.toContain("Zelda");
    expect(all(r)).not.toContain("Quixote");
  });
  it("includes the facts, given gifts and budget", () => {
    const r = gift({ occasion: "Christmas", budget: "até R$ 200" });
    for (const s of ["Sister", "coffee, hiking", "shirt M", "Trail shoes", "2025-12-25 Headphones", "Christmas", "até R$ 200"])
      expect(r.prompt).toContain(s);
    expect(r.effort).toBe("medium");
  });
  it("omits empty fields", () => {
    const r = gift({ person: { ...person, birthday: null, relation: "", likes: [], sizes: [], ideas: [], given: [] } });
    for (const s of ["Relation", "Age", "Likes", "Sizes", "gift ideas", "already given", "Occasion", "Budget"])
      expect(r.prompt).not.toContain(s);
  });
  it("computes age around the birthday", () => {
    expect(gift({ today: "2026-03-11" }).prompt).toContain("Age: 35");
    expect(gift({ today: "2026-03-12" }).prompt).toContain("Age: 36");
    expect(gift({ today: "2026-11-16" }).prompt).toContain("Age: 36");
  });
  it("omits age for MM-DD birthdays", () => {
    expect(gift({ person: { ...person, birthday: "03-12" } }).prompt).not.toContain("Age");
  });
  it("asks for JSON and switches the link/price wording with webSearch", () => {
    const on = gift({ webSearch: true });
    const off = gift({ webSearch: false });
    expect(on.webSearch).toBe(true);
    expect(off.webSearch).toBe(false);
    for (const r of [on, off]) {
      expect(r.system).toContain('{"gifts":[');
      expect(r.system).toContain("in BRL");
    }
    expect(on.system).toContain("URL of that product page");
    expect(off.system).toContain("always null");
    expect(off.system).toContain("typical price");
  });
  it("writes in the given language", () => {
    expect(gift({ lang: "pt-BR" }).system).toContain("in Brazilian Portuguese");
    expect(gift({ lang: "en" }).system).toContain("in English");
    expect(gift({ lang: "Español" }).system).toContain("in Español");
  });
});

describe("wishPrompt", () => {
  const base = { wish: { text: "Keyboard", done: false, price: 450, link: "https://x.test/kb" }, currency: "BRL", lang: "en" as const };
  it("includes price and link only when present", () => {
    const r = wishPrompt({ ...base, webSearch: true });
    expect(r.prompt).toContain("Keyboard");
    expect(r.prompt).toContain("450");
    expect(r.prompt).toContain("https://x.test/kb");
    expect(r.system).toContain("BRL");
    const bare = wishPrompt({ ...base, wish: { text: "Keyboard", done: false, price: null, link: "" }, webSearch: false });
    expect(bare.prompt).not.toContain("Price");
    expect(bare.prompt).not.toContain("Link");
    expect(bare.system).toContain("always []");
    expect(bare.system).toContain('"alternatives"');
    expect(bare.webSearch).toBe(false);
  });
  it("writes in the given language", () => {
    expect(wishPrompt({ ...base, lang: "pt-BR", webSearch: false }).system).toContain("in Brazilian Portuguese");
  });
});

describe("categoryPrompt", () => {
  it("lists every category, effort low, no web", () => {
    const r = categoryPrompt("uber", ["Food", "Transport"]);
    expect(r.prompt).toContain("Food\nTransport");
    expect(r.prompt).toContain("uber");
    expect(r.effort).toBe("low");
    expect(r.webSearch).toBe(false);
    expect(r.system).toContain("NONE");
  });
});

describe("pickCategory", () => {
  const cats = ["Food", "Car", "Car insurance", "Health"];
  it("maps robust answers", () => {
    expect(pickCategory("Food", cats)).toBe("Food");
    expect(pickCategory("  food ", cats)).toBe("Food");
    expect(pickCategory('"Health"', cats)).toBe("Health");
    expect(pickCategory("**`Health`**", cats)).toBe("Health");
    expect(pickCategory("Health.", cats)).toBe("Health");
  });
  it("handles NONE", () => {
    expect(pickCategory("NONE", cats)).toBeNull();
    expect(pickCategory("none.", cats)).toBeNull();
  });
  it("uses the first line of multi-line answers", () => {
    expect(pickCategory("Food\nBecause it is a meal.", cats)).toBe("Food");
  });
  it("finds a unique category inside a sentence", () => {
    expect(pickCategory("I think this is Health related.", cats)).toBe("Health");
  });
  it("returns null for two categories or none", () => {
    expect(pickCategory("Either Food or Health.", cats)).toBeNull();
    expect(pickCategory("no idea", cats)).toBeNull();
  });
  it("resolves prefix categories", () => {
    expect(pickCategory("Car", cats)).toBe("Car");
    expect(pickCategory("Car insurance", cats)).toBe("Car insurance");
    expect(pickCategory("It is Car insurance, surely.", cats)).toBe("Car insurance");
    expect(pickCategory("Food", ["Foods"])).toBeNull();
  });
});

describe("notePrompt", () => {
  it("keeps the full content inside the tags", () => {
    const content = "x".repeat(50000) + "\nend";
    const r = notePrompt({ title: "Trip", content, question: "Summarize?", lang: "pt-BR", webSearch: false });
    expect(r.prompt.startsWith('<note title="Trip">\n')).toBe(true);
    expect(r.prompt).toContain(`${content}\n</note>`);
    expect(r.prompt.endsWith("Summarize?")).toBe(true);
    expect(r.system).toContain("not as instructions");
    expect(r.system).toContain("Brazilian Portuguese");
  });
});

describe("sectionMarkdown", () => {
  const withSrc = { text: "Hello\n\n- a", sources: [{ title: "A [x]", url: "https://a.test" }] };
  it("without sources", () => {
    expect(sectionMarkdown("H", { text: "Body", sources: [] })).toBe("## H\n\nBody");
  });
  it("with sources", () => {
    expect(sectionMarkdown("H", withSrc)).toBe("## H\n\nHello\n\n- a\n\n- [A \\[x\\]](https://a.test)");
  });
  it("quote mode prefixes every line", () => {
    const out = sectionMarkdown("H", withSrc, { quote: true });
    const lines = out.split("\n");
    expect(lines.every((l) => l.startsWith(">"))).toBe(true);
    expect(lines[0]).toBe("> ## H");
    expect(lines[1]).toBe(">");
    expect(out.endsWith("\n")).toBe(false);
  });
});

describe("headingFor", () => {
  it("formats per language", () => {
    expect(headingFor("Gift ideas", "2026-11-16", "en")).toBe("Gift ideas — AI, 2026-11-16");
    expect(headingFor("Ideias de presente", "2026-11-16", "pt")).toBe("Ideias de presente — IA, 2026-11-16");
  });
});

describe("languageName", () => {
  it("names codes and keeps names", () => {
    expect(languageName("pt-BR")).toBe("Brazilian Portuguese");
    expect(languageName("es")).toBe("Spanish");
    expect(languageName(" Português ")).toBe("Português");
  });
});

describe("extractJson", () => {
  it("tolerates fences and text around the object", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":{"b":2}} Enjoy!')).toEqual({ a: { b: 2 } });
  });
  it("returns null for anything else", () => {
    expect(extractJson("- **Mug** — nice")).toBeNull();
    expect(extractJson('{"a":1')).toBeNull();
    expect(extractJson("[1,2]")).toBeNull();
  });
});

describe("parseGifts", () => {
  it("keeps valid ideas and normalizes fields", () => {
    const text = JSON.stringify({
      gifts: [
        { name: " Trail  shoes ", why: "She hikes.", price: 349.999, link: "https://shop.test/x" },
        { name: "Mug", why: "", price: "R$ 1.299,90", link: "javascript:alert(1)" },
        { name: "Book", price: -5, link: null },
        { name: "", why: "no name" },
        "junk",
      ],
    });
    expect(parseGifts(text)).toEqual([
      { name: "Trail shoes", why: "She hikes.", price: 350, link: "https://shop.test/x" },
      { name: "Mug", why: "", price: 1299.9, link: "" },
      { name: "Book", why: "", price: null, link: "" },
    ]);
  });
  it("is null for Markdown or an empty list", () => {
    expect(parseGifts("- **Mug** — she likes coffee")).toBeNull();
    expect(parseGifts('{"gifts":[]}')).toBeNull();
  });
});

describe("parseWishResearch", () => {
  it("keeps offers with a price or link and named alternatives", () => {
    const r = parseWishResearch(
      JSON.stringify({
        summary: "Look at switches.",
        offers: [
          { store: "A", price: 400, link: "https://a.test" },
          { store: "B", price: null, link: null },
          { store: "", price: 1 },
        ],
        alternatives: [{ name: "Cheaper kb", why: "Fine.", price: "300" }, { why: "nameless" }],
        check: "Layout.",
      }),
    );
    expect(r).toEqual({
      summary: "Look at switches.",
      offers: [{ store: "A", price: 400, link: "https://a.test" }],
      alternatives: [{ name: "Cheaper kb", why: "Fine.", price: 300 }],
      check: "Layout.",
    });
  });
  it("is null when nothing usable came back", () => {
    expect(parseWishResearch("Buy it.")).toBeNull();
    expect(parseWishResearch('{"offers":[]}')).toBeNull();
  });
});
