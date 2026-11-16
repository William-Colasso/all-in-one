import { describe, it, expect } from "vitest";
import {
  addDays, addHabit, cleanName, habitsOf, isDone, isScheduled, logOf, monthGrid, newHabit,
  parseHabits, parseLog, rate, removeHabit, renameInLog, serializeHabits, serializeLog,
  setValue, streak, updateHabit, weekCount, weekOf,
} from "./parse";

const one = (md: string) => habitsOf(parseHabits(md))[0];

describe("habit definitions", () => {
  it("reads plain, goal/unit, freq, days in any order", () => {
    expect(one("- Meditate")).toEqual(newHabit("Meditate"));
    expect(one("- Water [goal:: 8] [unit:: glasses]")).toEqual(newHabit("Water", { goal: 8, unit: "glasses" }));
    expect(one("- [unit:: min] Reading [goal:: 0.5]")).toEqual(newHabit("Reading", { goal: 0.5, unit: "min" }));
    expect(one("- Gym [freq:: 3/week]")).toMatchObject({ perWeek: 3, days: null });
    expect(one("- English [days:: Wed,mon,fri,mon]")).toMatchObject({ days: [1, 3, 5], perWeek: null });
    expect(one("- R [goal:: 30] [unit:: min] [days:: sat,sun]")).toMatchObject({ goal: 30, days: [0, 6] });
  });
  it("handles invalid values", () => {
    expect(one("- A [goal:: 0]").goal).toBe(1);
    expect(one("- A [goal:: -2]").goal).toBe(1);
    expect(one("- A [goal:: abc]").goal).toBe(1);
    expect(one("- A [goal:: ]").goal).toBe(1);
    expect(one("- A [freq:: 12/week]").perWeek).toBe(7);
    expect(one("- A [freq:: 0/week]").perWeek).toBe(1);
    expect(one("- A [freq:: often]").perWeek).toBeNull();
    expect(one("- A [days:: xyz,foo]").days).toBeNull();
    expect(one("- A [days:: ]").days).toBeNull();
  });
  it("days wins over freq; all seven days is daily", () => {
    expect(one("- A [freq:: 3/week] [days:: mon,tue]")).toMatchObject({ perWeek: null, days: [1, 2] });
    expect(one("- A [days:: sun,mon,tue,wed,thu,fri,sat]")).toMatchObject({ perWeek: null, days: null });
  });
  it("keeps unknown fields in the name and collapses whitespace", () => {
    expect(one("- Read   [color:: red]  daily [goal:: 2]").name).toBe("Read [color:: red] daily");
  });
  it("keeps other lines verbatim", () => {
    const md = "# Habits\n\n- [ ] task\n- [x] done\n  - Nested\n* Star\n-\n- \nprose\n- Real\n";
    const d = parseHabits(md);
    expect(d.map((l) => l.kind)).toEqual(["other", "other", "other", "other", "other", "other", "other", "other", "other", "habit"]);
    expect(serializeHabits(d)).toBe(md);
  });
  it("round-trips canonical files, CRLF and empty", () => {
    const md = "- Meditate\n- Water [goal:: 8] [unit:: glasses]\n- Gym [freq:: 3/week]\n- English [days:: mon,wed,fri]\n- Reading [goal:: 0.5] [unit:: min] [days:: sun,sat]\n";
    expect(serializeHabits(parseHabits(md))).toBe(md);
    expect(serializeHabits(parseHabits(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeHabits(parseHabits("- A"))).toBe("- A\n");
    expect(serializeHabits(parseHabits(""))).toBe("");
  });
  it("cleanName", () => {
    expect(cleanName("  a [b]   c::d  ")).toBe("a b cd");
  });
  it("add / update / remove", () => {
    const d = parseHabits("# H\n- A\n- B\n\nnote\n");
    const added = addHabit(d, newHabit("C"));
    expect(serializeHabits(added)).toBe("# H\n- A\n- B\n- C\n\nnote\n");
    expect(addHabit(d, newHabit("A", { goal: 5 }))).toBe(d);
    expect(serializeHabits(addHabit([], newHabit("X")))).toBe("- X\n");
    expect(serializeHabits(addHabit(parseHabits("intro\n"), newHabit("X")))).toBe("intro\n- X\n");
    expect(serializeHabits(updateHabit(d, "A", newHabit("A2", { goal: 3 })))).toBe("# H\n- A2 [goal:: 3]\n- B\n\nnote\n");
    expect(updateHabit(d, "A", newHabit("B"))).toBe(d);
    expect(updateHabit(d, "Z", newHabit("Z"))).toBe(d);
    expect(serializeHabits(updateHabit(d, "A", newHabit("A", { unit: "x" })))).toContain("- A [unit:: x]");
    expect(serializeHabits(removeHabit(d, "A"))).toBe("# H\n- B\n\nnote\n");
    expect(removeHabit(d, "Z")).toEqual(d);
  });
});

describe("log", () => {
  it("parses day lines and drops bad values", () => {
    const d = parseLog("# Nov\n- 2026-11-15 [Water:: 6] [Meditate:: 1] [Bad:: x] [Zero:: 0] [Neg:: -1]\n- 2026-11-16\n- note 2026-11-17\n");
    expect(d[0]).toEqual({ kind: "other", raw: "# Nov" });
    expect(d[1]).toEqual({ kind: "day", date: "2026-11-15", values: { Water: 6, Meditate: 1 } });
    expect(d[2]).toEqual({ kind: "day", date: "2026-11-16", values: {} });
    expect(d[3].kind).toBe("other");
  });
  it("round-trips", () => {
    const md = "# Nov\n- 2026-11-01 [Water:: 0.5]\n\n- 2026-11-15 [Water:: 6] [Meditate:: 1]\n";
    expect(serializeLog(parseLog(md))).toBe(md);
    expect(serializeLog(parseLog(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeLog(parseLog(""))).toBe("");
  });
  it("logOf merges duplicate dates, later wins", () => {
    const log = logOf(parseLog("- 2026-11-15 [A:: 1] [B:: 2]\n- 2026-11-15 [B:: 5] [C:: 1]\n"));
    expect(log).toEqual({ "2026-11-15": { A: 1, B: 5, C: 1 } });
  });
  it("setValue into empty doc, insert in order, update, clear", () => {
    let d = setValue([], "2026-11-15", "A", 2);
    expect(serializeLog(d)).toBe("- 2026-11-15 [A:: 2]\n");
    d = setValue(d, "2026-11-20", "A", 1);
    d = setValue(d, "2026-11-01", "A", 1);
    d = setValue(d, "2026-11-17", "B", 3);
    expect(serializeLog(d)).toBe("- 2026-11-01 [A:: 1]\n- 2026-11-15 [A:: 2]\n- 2026-11-17 [B:: 3]\n- 2026-11-20 [A:: 1]\n");
    d = setValue(d, "2026-11-15", "A", 4);
    d = setValue(d, "2026-11-15", "B", 1);
    expect(serializeLog(d)).toContain("- 2026-11-15 [A:: 4] [B:: 1]\n");
    d = setValue(d, "2026-11-15", "A", 0);
    expect(serializeLog(d)).toContain("- 2026-11-15 [B:: 1]\n");
    d = setValue(d, "2026-11-15", "B", 0);
    expect(serializeLog(d)).not.toContain("2026-11-15");
  });
  it("setValue keeps other lines in place and ignores clearing a missing day", () => {
    const d = parseLog("# Nov\n- 2026-11-02 [A:: 1]\nnote\n- 2026-11-10 [A:: 1]\n");
    expect(serializeLog(setValue(d, "2026-11-05", "A", 1))).toBe("# Nov\n- 2026-11-02 [A:: 1]\n- 2026-11-05 [A:: 1]\nnote\n- 2026-11-10 [A:: 1]\n");
    expect(setValue(d, "2026-11-05", "A", 0)).toBe(d);
    expect(setValue([], "2026-11-05", "A", 0)).toEqual([]);
  });
  it("renameInLog", () => {
    const d = parseLog("- 2026-11-01 [A:: 1] [B:: 2]\n- 2026-11-02 [B:: 3]\n");
    expect(serializeLog(renameInLog(d, "A", "Z"))).toBe("- 2026-11-01 [Z:: 1] [B:: 2]\n- 2026-11-02 [B:: 3]\n");
    expect(renameInLog(d, "A", "A")).toBe(d);
  });
  it("does not mutate inputs", () => {
    const d = parseLog("- 2026-11-01 [A:: 1]\n");
    const snap = JSON.stringify(d);
    setValue(d, "2026-11-01", "A", 0);
    setValue(d, "2026-11-01", "B", 2);
    renameInLog(d, "A", "Z");
    expect(JSON.stringify(d)).toBe(snap);
    const h = parseHabits("- A\n");
    const hs = JSON.stringify(h);
    addHabit(h, newHabit("B"));
    updateHabit(h, "A", newHabit("C"));
    removeHabit(h, "A");
    expect(JSON.stringify(h)).toBe(hs);
  });
});

describe("dates and stats", () => {
  it("addDays crosses boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-15", 0)).toBe("2026-11-15");
  });
  it("isDone with numeric goals", () => {
    const w = newHabit("W", { goal: 8 });
    expect(isDone(w, 8)).toBe(true);
    expect(isDone(w, 7.5)).toBe(false);
    expect(isDone(w, undefined)).toBe(false);
    expect(isDone(newHabit("Y"), 1)).toBe(true);
  });
  it("isScheduled", () => {
    const h = newHabit("E", { days: [0, 1] });
    expect(isScheduled(h, "2026-11-15")).toBe(true); // Sunday
    expect(isScheduled(h, "2026-11-09")).toBe(true); // Monday
    expect(isScheduled(h, "2026-11-10")).toBe(false);
    expect(isScheduled(newHabit("D"), "2026-11-10")).toBe(true);
    expect(isScheduled(newHabit("G", { perWeek: 2 }), "2026-11-10")).toBe(true);
  });
  it("weekOf", () => {
    expect(weekOf("2026-11-15")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(weekOf("2026-11-09")[0]).toBe("2026-11-09");
    const w = weekOf("2026-12-31"); // Thursday
    expect(w[0]).toBe("2026-12-28");
    expect(w[6]).toBe("2027-01-03");
    expect(weekOf("2026-12-01")[0]).toBe("2026-11-30");
  });
  it("weekCount", () => {
    const h = newHabit("A");
    const log = { "2026-11-09": { A: 1 }, "2026-11-11": { A: 1 }, "2026-11-15": { A: 1 }, "2026-11-16": { A: 1 }, "2026-11-10": { B: 1 } };
    expect(weekCount(h, log, "2026-11-12")).toBe(3);
  });
  it("streak daily", () => {
    const h = newHabit("A");
    const mk = (...ds: string[]) => Object.fromEntries(ds.map((d) => [d, { A: 1 }]));
    expect(streak(h, mk("2026-11-15", "2026-11-14", "2026-11-13"), "2026-11-15")).toBe(3);
    expect(streak(h, mk("2026-11-14", "2026-11-13"), "2026-11-15")).toBe(2); // today not done yet
    expect(streak(h, mk("2026-11-15", "2026-11-14", "2026-11-12"), "2026-11-15")).toBe(2); // gap
    expect(streak(h, {}, "2026-11-15")).toBe(0);
    expect(streak(newHabit("A", { goal: 3 }), { "2026-11-15": { A: 2 } }, "2026-11-15")).toBe(0);
  });
  it("streak fixed days skips unscheduled", () => {
    const h = newHabit("A", { days: [1, 3, 5] }); // Mon Wed Fri
    const log = { "2026-11-13": { A: 1 }, "2026-11-11": { A: 1 }, "2026-11-09": { A: 1 } };
    expect(streak(h, log, "2026-11-15")).toBe(3); // Sun, Sat, Thu... skipped
    expect(streak(h, { "2026-11-11": { A: 1 }, "2026-11-09": { A: 1 } }, "2026-11-15")).toBe(0); // Fri 13 missed
    expect(streak(h, log, "2026-11-13")).toBe(3);
    expect(streak(h, {}, "2026-11-14")).toBe(0);
  });
  it("streak perWeek", () => {
    const h = newHabit("A", { perWeek: 2 });
    const mk = (...ds: string[]) => Object.fromEntries(ds.map((d) => [d, { A: 1 }]));
    // weeks: 11-02, 11-09 met; current week (11-16) not yet met
    const log = mk("2026-11-02", "2026-11-04", "2026-11-09", "2026-11-10", "2026-11-16");
    expect(streak(h, log, "2026-11-18")).toBe(2);
    expect(streak(h, { ...log, ...mk("2026-11-17") }, "2026-11-18")).toBe(3);
    expect(streak(h, mk("2026-11-02", "2026-11-09", "2026-11-10"), "2026-11-18")).toBe(1); // week 11-02 has only 1 -> breaks after 11-09
    expect(streak(h, {}, "2026-11-18")).toBe(0);
  });
  it("rate", () => {
    const mk = (...ds: string[]) => Object.fromEntries(ds.map((d) => [d, { A: 1 }]));
    const daily = newHabit("A");
    expect(rate(daily, mk("2026-11-09", "2026-11-10"), "2026-11-09", "2026-11-12")).toBe(0.5);
    const fixed = newHabit("A", { days: [1, 3] }); // Mon, Wed in 11-09..11-15
    expect(rate(fixed, mk("2026-11-09", "2026-11-10"), "2026-11-09", "2026-11-15")).toBe(0.5);
    expect(rate(newHabit("A", { days: [2] }), {}, "2026-11-15", "2026-11-15")).toBe(0);
    const pw = newHabit("A", { perWeek: 2 });
    expect(rate(pw, mk("2026-11-09"), "2026-11-09", "2026-11-15")).toBe(0.5);
    expect(rate(pw, mk("2026-11-09", "2026-11-10", "2026-11-11"), "2026-11-09", "2026-11-15")).toBe(1);
  });
  it("monthGrid", () => {
    const g = monthGrid("2026-11"); // 1st is a Sunday
    expect(g.every((r) => r.length === 7)).toBe(true);
    expect(g[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(g[g.length - 1].filter(Boolean).pop()).toBe("2026-11-30");
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    const j = monthGrid("2026-06"); // 1st is a Monday
    expect(j[0][0]).toBe("2026-06-01");
    expect(j).toHaveLength(5);
    expect(j[4]).toEqual(["2026-06-29", "2026-06-30", null, null, null, null, null]);
  });
});
