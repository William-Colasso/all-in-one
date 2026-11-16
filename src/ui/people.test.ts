import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: class {}, getLanguage: () => "en" }));

import { joinDay, splitDay, splitGift, whenText, without } from "./people";

describe("people ui helpers", () => {
  it("validates days per month, allowing 29 Feb only without a year or in a leap year", () => {
    expect(joinDay(12, 3)).toBe("03-12");
    expect(joinDay(29, 2)).toBe("02-29");
    expect(joinDay(29, 2, 2023)).toBeNull();
    expect(joinDay(29, 2, 2024)).toBe("2024-02-29");
    expect(joinDay(31, 4)).toBeNull();
    expect(joinDay(5, 1, 1990)).toBe("1990-01-05");
  });

  it("splits stored days back into fields", () => {
    expect(splitDay("1990-03-12")).toEqual({ day: 12, month: 3, year: 1990 });
    expect(splitDay("12-25")).toEqual({ day: 25, month: 12, year: null });
    expect(splitDay(null)).toEqual({ day: null, month: null, year: null });
  });

  it("formats days left", () => {
    expect([0, 1, 5].map(whenText)).toEqual(["Today", "Tomorrow", "in 5 days"]);
  });

  it("splits gift entries and removes one occurrence", () => {
    expect(splitGift("2025-12-25 Headphones")).toEqual({ date: "2025-12-25", text: "Headphones" });
    expect(splitGift("Book")).toEqual({ date: "", text: "Book" });
    expect(without(["a", "b", "a"], "a")).toEqual(["b", "a"]);
  });
});
