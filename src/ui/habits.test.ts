import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: class {}, getLanguage: () => "en" }));

import type { Habit } from "../habits/types";
import { CAP, dayState, tapValue } from "./habits";

const yesNo: Habit = { name: "Read", goal: 1, unit: "", perWeek: null, days: null };
const water: Habit = { name: "Water", goal: 8, unit: "glasses", perWeek: null, days: null };
const monOnly: Habit = { name: "Gym", goal: 1, unit: "", perWeek: null, days: [1] };

describe("habit ui helpers", () => {
  it("toggles yes/no and counts amounts up to the cap", () => {
    expect(tapValue(yesNo, 0)).toBe(1);
    expect(tapValue(yesNo, 1)).toBe(0);
    expect(tapValue(water, 7)).toBe(8);
    expect(tapValue(water, CAP)).toBe(CAP);
  });

  it("classifies days", () => {
    const today = "2026-11-17"; // Tuesday
    const log = { "2026-11-16": { Water: 3, Gym: 1 }, "2026-11-17": { Water: 8 } };
    expect(dayState(water, log, "2026-11-18", today)).toBe("future");
    expect(dayState(water, log, "2026-11-17", today)).toBe("done");
    expect(dayState(water, log, "2026-11-16", today)).toBe("partial");
    expect(dayState(water, log, "2026-11-15", today)).toBe("missed");
    expect(dayState(monOnly, log, "2026-11-16", today)).toBe("done");
    expect(dayState(monOnly, log, "2026-11-17", today)).toBe("off");
  });
});
