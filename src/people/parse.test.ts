import { describe, it, expect } from "vitest";
import {
  applyPerson, cleanEntry, cleanName, datesOf, dayEvents, daysBetween, giftLine, nextOccurrence, parseDates, personFrom,
  reminders, removeDate, removePersonFromDates, renamePersonInDates, serializeDates, upsertDate,
} from "./parse";
import type { Person, SpecialDate } from "./types";

const person = (name: string, birthday: string | null = null): Person => ({
  name, birthday, relation: "", likes: [], sizes: [], ideas: [], given: [],
});
const sd = (name: string, day: string, people: string[] = [], lead: number | null = null): SpecialDate => ({ name, day, people, lead });
const bday = (v: unknown) => personFrom("x", { birthday: v }).birthday;

describe("personFrom", () => {
  it("tolerates anything", () => {
    const empty = person("A");
    for (const fm of [undefined, null, "str", 5, [], {}]) expect(personFrom("A", fm)).toEqual(empty);
    expect(personFrom("A", { relation: 5, likes: 5, sizes: {}, birthday: 5 })).toEqual(empty);
  });
  it("reads fields", () => {
    expect(
      personFrom("Ana", {
        birthday: "1990-03-12", relation: " Sister ", likes: ["coffee", 7, null, "  ", " hiking "],
        sizes: "shirt M, shoe 38,, ", "gift-ideas": ["Shoes"], "gifts-given": ["2025-12-25 Headphones"],
      }),
    ).toEqual({
      name: "Ana", birthday: "1990-03-12", relation: "Sister", likes: ["coffee", "7", "hiking"],
      sizes: ["shirt M", "shoe 38"], ideas: ["Shoes"], given: ["2025-12-25 Headphones"],
    });
  });
  it("normalizes birthdays", () => {
    expect(bday("03-12")).toBe("03-12");
    expect(bday("--03-12")).toBe("03-12");
    expect(bday("02-29")).toBe("02-29");
    expect(bday("2000-02-29")).toBe("2000-02-29");
    expect(bday(new Date(Date.UTC(1990, 2, 12)))).toBe("1990-03-12");
    for (const bad of ["2023-02-29", "02-30", "13-01", "1990-3-1", "x", "", null, 5, new Date("nope")]) expect(bday(bad)).toBeNull();
  });
});

describe("applyPerson", () => {
  it("writes, deletes empties and leaves foreign keys", () => {
    const fm: Record<string, unknown> = { tags: ["a"], birthday: "01-01", likes: ["x"], relation: "old" };
    applyPerson(fm, { ...person("A", "03-12"), relation: "", ideas: ["Book"] });
    expect(fm).toEqual({ tags: ["a"], birthday: "03-12", "gift-ideas": ["Book"] });
  });
  it("round-trips through personFrom", () => {
    const p: Person = { name: "Ana", birthday: "1990-03-12", relation: "Sis", likes: ["a"], sizes: ["M"], ideas: ["i"], given: ["2025-01-01 g"] };
    const fm = {};
    applyPerson(fm, p);
    expect(personFrom("Ana", fm)).toEqual(p);
    const q = person("B");
    const fm2 = {};
    applyPerson(fm2, q);
    expect(fm2).toEqual({});
    expect(personFrom("B", fm2)).toEqual(q);
  });
});

describe("cleaning", () => {
  it("cleanName", () => {
    expect(cleanName(' ..Ana: "Maria" / J#o^ão [x]::y? ')).toBe("Ana Maria João xy");
    expect(cleanName("a   b")).toBe("a b");
    expect(cleanName("...")).toBe("");
  });
  it("cleanEntry", () => {
    expect(cleanEntry("  a,  b \n c ")).toBe("a, b c");
  });
});

describe("dates file", () => {
  const one = (md: string) => datesOf(parseDates(md))[0];
  it("parses fields in any order", () => {
    expect(one("- 12-25 Christmas [people:: Ana, João] [lead:: 21]")).toEqual(sd("Christmas", "12-25", ["Ana", "João"], 21));
    expect(one("- 12-25 [lead:: 0] Christmas [people:: ,Ana,, ]")).toEqual(sd("Christmas", "12-25", ["Ana"], 0));
    expect(one("- 02-29 Leap")).toEqual(sd("Leap", "02-29"));
  });
  it("applies lead bounds, keeps unknown and invalid fields in the name", () => {
    expect(one("- 12-25 X [lead:: 365]")?.lead).toBe(365);
    expect(one("- 12-25 X [lead:: 366]")).toEqual(sd("X [lead:: 366]", "12-25"));
    expect(one("- 12-25 X [lead:: 1.5]")).toEqual(sd("X [lead:: 1.5]", "12-25"));
    expect(one("- 12-25 X [color:: red]")).toEqual(sd("X [color:: red]", "12-25"));
  });
  it("treats invalid lines as other", () => {
    const md = "# T\n- 02-30 x\n- 13-01 x\n- 12-25\n- 12-25 [lead:: 3]\n- [ ] 12-25 x\n  - 12-25 x\nprose\n\n";
    expect(parseDates(md).every((l) => l.kind === "other")).toBe(true);
    expect(serializeDates(parseDates(md))).toBe(md);
  });
  it("round-trips canonical files and normalizes newlines", () => {
    const md = "# Dates\n- 12-25 Christmas [people:: Ana, João] [lead:: 21]\n- 05-01 Labour\n\nnotes\n";
    expect(serializeDates(parseDates(md))).toBe(md);
    expect(serializeDates(parseDates(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeDates(parseDates(""))).toBe("");
    expect(serializeDates(parseDates("- 12-25 A"))).toBe("- 12-25 A\n");
  });
  it("upsertDate adds after the last date, replaces, renames and guards", () => {
    const doc = parseDates("# h\n- 12-25 A\nprose\n- 05-01 B\nend\n");
    expect(serializeDates(upsertDate(doc, sd("C", "01-01")))).toBe("# h\n- 12-25 A\nprose\n- 05-01 B\n- 01-01 C\nend\n");
    expect(serializeDates(upsertDate([], sd("C", "01-01")))).toBe("- 01-01 C\n");
    expect(serializeDates(upsertDate(parseDates("prose\n"), sd("C", "01-01")))).toBe("prose\n- 01-01 C\n");
    expect(serializeDates(upsertDate(doc, sd("A", "12-24", ["x"])))).toBe("# h\n- 12-24 A [people:: x]\nprose\n- 05-01 B\nend\n");
    expect(serializeDates(upsertDate(doc, sd("A2", "12-25"), "A"))).toBe("# h\n- 12-25 A2\nprose\n- 05-01 B\nend\n");
    expect(upsertDate(doc, sd("B", "12-25"), "A")).toBe(doc);
  });
  it("removeDate", () => {
    const doc = parseDates("- 12-25 A\n- 05-01 B\n");
    expect(serializeDates(removeDate(doc, "A"))).toBe("- 05-01 B\n");
    expect(serializeDates(removeDate(doc, "Z"))).toBe(serializeDates(doc));
  });
  it("renames and removes people, never mutating", () => {
    const doc = parseDates("- 12-25 A [people:: Ana, Bo]\n- 05-01 B [people:: Bo]\nx\n");
    const before = serializeDates(doc);
    expect(serializeDates(renamePersonInDates(doc, "Bo", "Bob"))).toBe("- 12-25 A [people:: Ana, Bob]\n- 05-01 B [people:: Bob]\nx\n");
    expect(serializeDates(renamePersonInDates(doc, "Bo", "Ana"))).toBe("- 12-25 A [people:: Ana]\n- 05-01 B [people:: Ana]\nx\n");
    expect(serializeDates(removePersonFromDates(doc, "Bo"))).toBe("- 12-25 A [people:: Ana]\n- 05-01 B\nx\n");
    expect(serializeDates(doc)).toBe(before);
  });
});

describe("nextOccurrence", () => {
  it("finds the first date >= today", () => {
    expect(nextOccurrence("11-16", "2026-11-16")).toBe("2026-11-16");
    expect(nextOccurrence("12-25", "2026-11-16")).toBe("2026-12-25");
    expect(nextOccurrence("03-12", "2026-11-16")).toBe("2027-03-12");
    expect(nextOccurrence("1990-03-12", "2026-11-16")).toBe("2027-03-12");
  });
  it("handles 02-29", () => {
    expect(nextOccurrence("02-29", "2027-01-01")).toBe("2027-02-28");
    expect(nextOccurrence("02-29", "2027-03-01")).toBe("2028-02-29");
    expect(nextOccurrence("02-29", "2028-02-29")).toBe("2028-02-29");
    expect(nextOccurrence("02-29", "2028-03-01")).toBe("2029-02-28");
  });
});

describe("dayEvents", () => {
  const people = [person("Zed", "1990-03-12"), person("Ana", "03-12"), person("Bo", "2030-03-12")];
  const dates = [sd("Party", "03-12", ["Ana"]), sd("Xmas", "12-25")];
  it("sorts by date, birthdays first, then title; computes turning", () => {
    const ev = dayEvents(people, dates, "2026-03-01", "2026-03-31");
    expect(ev.map((e) => [e.date, e.kind, e.title, e.turning])).toEqual([
      ["2026-03-12", "birthday", "Ana", null],
      ["2026-03-12", "birthday", "Bo", null],
      ["2026-03-12", "birthday", "Zed", 36],
      ["2026-03-12", "date", "Party", null],
    ]);
    expect(ev[0].people).toEqual(["Ana"]);
    expect(ev[3].people).toEqual(["Ana"]);
  });
  it("spans several years with inclusive bounds", () => {
    const ev = dayEvents([person("Zed", "1990-03-12")], [sd("X", "12-31")], "2026-12-31", "2028-03-12");
    expect(ev.map((e) => [e.date, e.turning])).toEqual([["2026-12-31", null], ["2027-03-12", 37], ["2027-12-31", null], ["2028-03-12", 38]]);
  });
  it("puts 02-29 on 02-28 in non-leap years", () => {
    expect(dayEvents([person("L", "02-29")], [], "2027-02-01", "2027-02-28").map((e) => e.date)).toEqual(["2027-02-28"]);
  });
});

describe("reminders", () => {
  const people = [person("Ana", "1990-11-20"), person("Bo", "11-16"), person("Far", "06-01")];
  const dates = [sd("Short", "11-18", [], 1), sd("Long", "12-25", ["Ana"], 60), sd("Def", "11-30")];
  it("uses default and per-date leads, daysLeft 0 and sorting", () => {
    const r = reminders(people, dates, "2026-11-16", 14);
    expect(r.map((x) => [x.daysLeft, x.kind, x.title])).toEqual([
      [0, "birthday", "Bo"],
      [4, "birthday", "Ana"],
      [14, "date", "Def"],
      [39, "date", "Long"],
    ]);
    expect(r[1].turning).toBe(36);
    expect(r[3].people).toEqual(["Ana"]);
  });
  it("sorts birthdays before dates on the same day, then by title", () => {
    const r = reminders([person("Z", "11-16"), person("A", "11-16")], [sd("B", "11-16")], "2026-11-16", 0);
    expect(r.map((x) => x.title)).toEqual(["A", "Z", "B"]);
  });
  it("wraps into next year", () => {
    expect(reminders([person("N", "01-02")], [], "2026-12-30", 5).map((x) => [x.date, x.daysLeft])).toEqual([["2027-01-02", 3]]);
  });
});

describe("misc", () => {
  it("daysBetween", () => {
    expect(daysBetween("2026-11-16", "2026-11-16")).toBe(0);
    expect(daysBetween("2026-11-16", "2026-12-25")).toBe(39);
    expect(daysBetween("2026-12-25", "2026-11-16")).toBe(-39);
    expect(daysBetween("2027-12-31", "2028-03-01")).toBe(61);
  });
  it("giftLine", () => {
    expect(giftLine("2025-12-25", "Headphones")).toBe("2025-12-25 Headphones");
  });
  it("does not mutate inputs", () => {
    const p = person("Ana", "03-12");
    const ds = [sd("A", "12-25", ["x"])];
    const snap = JSON.stringify([p, ds]);
    dayEvents([p], ds, "2026-01-01", "2027-12-31");
    reminders([p], ds, "2026-01-01", 30);
    const doc = parseDates("- 12-25 A [people:: x]\n");
    const s = JSON.stringify(doc);
    upsertDate(doc, sd("B", "01-01"));
    removeDate(doc, "A");
    renamePersonInDates(doc, "x", "y");
    removePersonFromDates(doc, "x");
    expect(JSON.stringify([p, ds])).toBe(snap);
    expect(JSON.stringify(doc)).toBe(s);
  });
});
