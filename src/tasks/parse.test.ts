import { describe, it, expect } from "vitest";
import {
  addTask, bucketOf, compareTasks, listNames, listTasks, newTask, nextDue,
  parseDoc, removeTask, serializeDoc, toggleTask, todayISO, updateTask,
} from "./parse";

const task = (d: ReturnType<typeof parseDoc>, i: number) => {
  const l = d[i];
  if (l.kind !== "task") throw new Error("not a task");
  return l.task;
};

describe("parse", () => {
  it("reads all fields", () => {
    const t = task(parseDoc("- [ ] Buy milk 🔁 every week ⏫ 📅 2026-11-20"), 0);
    expect(t).toEqual({ text: "Buy milk", done: false, due: "2026-11-20", priority: "high", recurrence: "weekly", doneDate: null });
    const d = task(parseDoc("- [X] Pay rent 📅 2026-11-10 ✅ 2026-11-09"), 0);
    expect(d).toMatchObject({ text: "Pay rent", done: true, due: "2026-11-10", doneDate: "2026-11-09" });
  });
  it("maps priorities and recurrences", () => {
    expect(task(parseDoc("- [ ] a 🔼"), 0).priority).toBe("medium");
    expect(task(parseDoc("- [ ] a 🔽"), 0).priority).toBe("low");
    expect(task(parseDoc("- [ ] a 🔁 every day"), 0).recurrence).toBe("daily");
    expect(task(parseDoc("- [ ] a 🔁 every month"), 0).recurrence).toBe("monthly");
  });
  it("tolerates FE0F", () => {
    const t = task(parseDoc("- [ ] a 🔁️ every week ⏫️ 📅️ 2026-01-02 ✅️ 2026-01-03"), 0);
    expect(t).toEqual({ text: "a", done: false, due: "2026-01-02", priority: "high", recurrence: "weekly", doneDate: "2026-01-03" });
  });
  it("keeps unknown recurrence in text", () => {
    const t = task(parseDoc("- [ ] a 🔁 every 2 weeks 📅 2026-01-02"), 0);
    expect(t.recurrence).toBeNull();
    expect(t.text).toBe("a 🔁 every 2 weeks");
    expect(task(parseDoc("- [ ] a 🔁 every week on Monday"), 0).recurrence).toBeNull();
  });
  it("keeps other lines and headings", () => {
    const d = parseDoc("intro\n## Home \n  - [ ] sub\n* [ ] star\n### h3\n\n-[ ] x");
    expect(d.map((l) => l.kind)).toEqual(["other", "heading", "other", "other", "other", "other", "other"]);
    expect(listNames(d)).toEqual(["Home"]);
  });
  it("round-trips canonical input incl. CRLF", () => {
    const s = "intro\n- [ ] a 🔁 every day ⏫ 📅 2026-01-01\n\n## Work\nprose\n- [x] b 📅 2026-01-01 ✅ 2026-01-02\n\n## Home\n- [ ] c\n";
    expect(serializeDoc(parseDoc(s))).toBe(s);
    expect(serializeDoc(parseDoc(s.replace(/\n/g, "\r\n")))).toBe(s);
    expect(serializeDoc(parseDoc(""))).toBe("");
  });
});

const base = "- [ ] top\n\n## A\n- [ ] a1\n- [ ] a2\n\n## B\n- [ ] b1\n";
describe("edit", () => {
  it("addTask existing list, unnamed list, new list, empty doc", () => {
    const d = parseDoc(base);
    expect(serializeDoc(addTask(d, newTask("x"), "A"))).toBe("- [ ] top\n\n## A\n- [ ] a1\n- [ ] a2\n- [ ] x\n\n## B\n- [ ] b1\n");
    expect(serializeDoc(addTask(d, newTask("x"), ""))).toBe("- [ ] top\n- [ ] x\n\n## A\n- [ ] a1\n- [ ] a2\n\n## B\n- [ ] b1\n");
    expect(serializeDoc(addTask(d, newTask("x"), "C"))).toBe(base + "\n## C\n- [ ] x\n");
    expect(serializeDoc(addTask(parseDoc("- [ ] t\n\n"), newTask("x"), "C"))).toBe("- [ ] t\n\n## C\n- [ ] x\n");
    expect(serializeDoc(addTask([], newTask("x"), "C"))).toBe("## C\n- [ ] x\n");
    expect(serializeDoc(addTask([], newTask("x"), ""))).toBe("- [ ] x\n");
  });
  it("updateTask in place and with move", () => {
    const d = parseDoc(base);
    const idx = listTasks(d).find((r) => r.task.text === "a1")!.index;
    expect(serializeDoc(updateTask(d, idx, newTask("z", { priority: "low" }))).includes("- [ ] z 🔽\n")).toBe(true);
    const moved = updateTask(d, idx, newTask("a1"), "B");
    expect(listTasks(moved).map((r) => [r.list, r.task.text])).toEqual([["", "top"], ["A", "a2"], ["B", "b1"], ["B", "a1"]]);
  });
  it("removeTask", () => {
    const d = parseDoc(base);
    expect(listTasks(removeTask(d, 0)).map((r) => r.task.text)).toEqual(["a1", "a2", "b1"]);
    expect(removeTask(d, 1)).toBe(d); // blank line
    expect(removeTask(d, 99)).toBe(d);
  });
  it("toggleTask plain, recurring, un-toggle", () => {
    const d = parseDoc("- [ ] a\n- [ ] r 🔁 every week 📅 2026-11-10\n");
    const t1 = toggleTask(d, 0, "2026-11-15");
    expect(serializeDoc(t1)).toBe("- [x] a ✅ 2026-11-15\n- [ ] r 🔁 every week 📅 2026-11-10\n");
    const t2 = toggleTask(d, 1, "2026-11-15");
    expect(serializeDoc(t2)).toBe("- [ ] a\n- [ ] r 🔁 every week 📅 2026-11-17\n- [x] r 🔁 every week 📅 2026-11-10 ✅ 2026-11-15\n");
    expect(serializeDoc(toggleTask(t1, 0, "x"))).toBe("- [ ] a\n- [ ] r 🔁 every week 📅 2026-11-10\n");
    expect(task(toggleTask(parseDoc("- [ ] r 🔁 every day"), 0, "2026-11-15"), 0).due).toBe("2026-11-16");
    expect(toggleTask(d, 9, "x")).toBe(d);
  });
  it("does not mutate inputs", () => {
    const d = parseDoc(base);
    const snap = JSON.stringify(d);
    const t = newTask("n");
    addTask(d, t, "A"); updateTask(d, 0, t, "B"); removeTask(d, 0); toggleTask(d, 0, "2026-01-01");
    expect(JSON.stringify(d)).toBe(snap);
    expect(t).toEqual(newTask("n"));
  });
});

describe("dates and ordering", () => {
  it("nextDue", () => {
    expect(nextDue("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextDue("2024-01-31", "monthly")).toBe("2024-02-29");
    expect(nextDue("2026-12-31", "monthly")).toBe("2027-01-31");
    expect(nextDue("2026-12-31", "daily")).toBe("2027-01-01");
    expect(nextDue("2026-12-28", "weekly")).toBe("2027-01-04");
  });
  it("bucketOf", () => {
    expect(bucketOf(newTask("a"), "2026-11-15")).toBe("nodate");
    expect(bucketOf(newTask("a", { due: "2026-11-14" }), "2026-11-15")).toBe("overdue");
    expect(bucketOf(newTask("a", { due: "2026-11-15" }), "2026-11-15")).toBe("today");
    expect(bucketOf(newTask("a", { due: "2026-11-16" }), "2026-11-15")).toBe("upcoming");
  });
  it("todayISO uses local date", () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
  it("compareTasks", () => {
    const ts = [
      newTask("done", { done: true, priority: "high" }),
      newTask("nodue"),
      newTask("late", { due: "2026-02-01" }),
      newTask("early", { due: "2026-01-01" }),
      newTask("low", { priority: "low" }),
      newTask("high", { priority: "high", due: "2026-09-09" }),
      newTask("med", { priority: "medium" }),
    ];
    expect([...ts].sort(compareTasks).map((t) => t.text)).toEqual(["high", "med", "low", "early", "late", "nodue", "done"]);
  });
});
