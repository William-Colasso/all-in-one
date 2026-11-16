import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: class {}, getLanguage: () => "en" }));

import type { AgendaDoc, AgendaEvent } from "../agenda/types";
import type { TaskRef } from "../types";
import { newTask } from "../tasks/parse";
import { agendaGroups, nextHour, onEvent } from "./agenda";

const ev = (date: string, time: string | null, title: string, repeat: AgendaEvent["repeat"] = null): AgendaEvent => ({
  date,
  time,
  title,
  repeat,
});
const task = (index: number, text: string, due: string | null, done = false): TaskRef => ({
  index,
  list: "",
  task: newTask(text, { due, done }),
});

describe("agenda ui helpers", () => {
  // 2026-11-18 is a Wednesday: Thu..Sun are "week", the next Monday is "later".
  const today = "2026-11-18";

  it("merges appointments and open tasks into groups, events before tasks within a day", () => {
    const events = [
      { index: 0, event: ev("2026-11-18", "15:00", "Dentist") },
      { index: 1, event: ev("2026-11-18", null, "Holiday") },
      { index: 2, event: ev("2026-11-20", "09:00", "Gym", "weekly") },
      { index: 3, event: ev("2026-11-01", null, "Past") },
    ];
    const tasks = [
      task(10, "Pay rent", "2026-11-18"),
      task(11, "Old", "2026-11-10"), // overdue: not in the window
      task(12, "Done", "2026-11-19", true),
      task(13, "Call mom", "2026-11-19"),
      task(14, "Far", "2027-03-01"), // past 60 days
      task(15, "Someday", null),
    ];
    const days = [
      { date: "2026-11-18", kind: "birthday" as const, title: "Ana", people: ["Ana"], turning: 36 },
      { date: "2027-05-01", kind: "date" as const, title: "Far", people: [], turning: null }, // past 60 days
    ];
    const groups = agendaGroups(events, tasks, today, days).map(([g, items]) => [
      g,
      items
        .slice(0, 4)
        .map((i) => ("day" in i ? i.day.title : "event" in i ? i.event.event.title : i.task.task.text) + " " + i.date),
    ]);
    expect(groups).toEqual([
      ["today", ["Ana 2026-11-18", "Holiday 2026-11-18", "Dentist 2026-11-18", "Pay rent 2026-11-18"]],
      ["tomorrow", ["Call mom 2026-11-19"]],
      ["week", ["Gym 2026-11-20"]],
      ["later", ["Gym 2026-11-27", "Gym 2026-12-04", "Gym 2026-12-11", "Gym 2026-12-18"]],
    ]);
  });

  it("aborts an edit when the line is no longer that event", () => {
    const e = ev("2026-11-18", null, "A");
    const doc: AgendaDoc = [{ kind: "event", event: e }];
    expect(onEvent({ index: 0, event: e }, () => [])(doc)).toEqual([]);
    expect(() => onEvent({ index: 0, event: { ...e, title: "B" } }, () => [])(doc)).toThrow();
  });

  it("defaults to the next full hour", () => {
    expect(nextHour(new Date(2026, 10, 18, 9, 30))).toEqual({ date: "2026-11-18", time: "10:00" });
    expect(nextHour(new Date(2026, 10, 18, 23, 5))).toEqual({ date: "2026-11-19", time: "00:00" });
  });
});
