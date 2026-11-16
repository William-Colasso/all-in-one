import type { Habit, HabitDoc, Log, LogDoc } from "./types";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const FIELD = /\[(goal|unit|freq|days)::\s*([^\]]*)\]/gi;

export function newHabit(name: string, fields: Partial<Habit> = {}): Habit {
  return { name, goal: 1, unit: "", perWeek: null, days: null, ...fields };
}

export function cleanName(name: string): string {
  return name.replace(/::/g, "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
}

function parseHabit(rest: string): Habit | null {
  const f: Record<string, string> = {};
  const name = rest
    .replace(FIELD, (_m, k: string, v: string) => {
      f[k.toLowerCase()] ??= v.trim();
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return null;
  const goal = Number(f.goal);
  const codes = (f.days ?? "").split(",").map((s) => DAY_CODES.indexOf(s.trim().toLowerCase()));
  const days = [...new Set(codes.filter((n) => n >= 0))].sort((a, b) => a - b);
  const m = /^(\d+)\s*\/\s*week$/i.exec(f.freq ?? "");
  return {
    name,
    goal: f.goal !== undefined && f.goal !== "" && goal > 0 && Number.isFinite(goal) ? goal : 1,
    unit: f.unit ?? "",
    // ponytail: a valid `days` (even all seven) wins over `freq`; an invalid one falls back to freq.
    perWeek: days.length || !m ? null : Math.min(7, Math.max(1, parseInt(m[1], 10))),
    days: days.length && days.length < 7 ? days : null,
  };
}

export function parseHabits(md: string): HabitDoc {
  if (md === "") return [];
  const lines = md.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.map((raw): HabitDoc[number] => {
    const habit = /^- (?!\[[ xX]\](?:\s|$))(.*\S.*)$/.exec(raw);
    const h = habit && parseHabit(habit[1]);
    return h ? { kind: "habit", habit: h } : { kind: "other", raw };
  });
}

export function serializeHabits(doc: HabitDoc): string {
  if (!doc.length) return "";
  const out = doc.map((l) => {
    if (l.kind === "other") return l.raw;
    const h = l.habit;
    let s = `- ${h.name}`;
    if (h.goal !== 1) s += ` [goal:: ${h.goal}]`;
    if (h.unit) s += ` [unit:: ${h.unit}]`;
    if (h.days?.length) s += ` [days:: ${h.days.map((d) => DAY_CODES[d]).join(",")}]`;
    else if (h.perWeek) s += ` [freq:: ${h.perWeek}/week]`;
    return s;
  });
  return out.join("\n") + "\n";
}

export function habitsOf(doc: HabitDoc): Habit[] {
  return doc.flatMap((l) => (l.kind === "habit" ? [l.habit] : []));
}

export function addHabit(doc: HabitDoc, habit: Habit): HabitDoc {
  if (habitsOf(doc).some((h) => h.name === habit.name)) return doc;
  let at = doc.length;
  doc.forEach((l, i) => {
    if (l.kind === "habit") at = i + 1;
  });
  return [...doc.slice(0, at), { kind: "habit", habit }, ...doc.slice(at)];
}

export function updateHabit(doc: HabitDoc, name: string, habit: Habit): HabitDoc {
  const found = doc.some((l) => l.kind === "habit" && l.habit.name === name);
  const clash = habit.name !== name && doc.some((l) => l.kind === "habit" && l.habit.name === habit.name);
  if (!found || clash) return doc;
  return doc.map((l) => (l.kind === "habit" && l.habit.name === name ? { kind: "habit", habit } : l));
}

export function removeHabit(doc: HabitDoc, name: string): HabitDoc {
  return doc.filter((l) => !(l.kind === "habit" && l.habit.name === name));
}

// ---- monthly log ----

const DAY_LINE = /^- (\d{4}-\d{2}-\d{2})((?:\s+\[[^[\]]*::[^[\]]*\])*)\s*$/;

export function parseLog(md: string): LogDoc {
  if (md === "") return [];
  const lines = md.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.map((raw): LogDoc[number] => {
    const m = DAY_LINE.exec(raw);
    if (!m) return { kind: "other", raw };
    const values: Record<string, number> = {};
    for (const f of m[2].matchAll(/\[([^[\]]*?)::\s*([^[\]]*)\]/g)) {
      const name = f[1].trim();
      const v = f[2].trim() === "" ? NaN : Number(f[2]);
      if (name && v > 0 && Number.isFinite(v)) values[name] = v;
    }
    return { kind: "day", date: m[1], values };
  });
}

export function serializeLog(doc: LogDoc): string {
  if (!doc.length) return "";
  const out = doc.map((l) =>
    l.kind === "other"
      ? l.raw
      : `- ${l.date}` + Object.entries(l.values).map(([k, v]) => ` [${k}:: ${v}]`).join(""),
  );
  return out.join("\n") + "\n";
}

export function logOf(doc: LogDoc): Log {
  const log: Log = {};
  for (const l of doc) if (l.kind === "day") log[l.date] = { ...log[l.date], ...l.values };
  return log;
}

export function setValue(doc: LogDoc, date: string, name: string, value: number): LogDoc {
  if (!doc.some((l) => l.kind === "day" && l.date === date)) {
    if (!(value > 0)) return doc;
    let at = doc.length;
    const prev = doc.findLastIndex((l) => l.kind === "day" && l.date < date);
    if (prev >= 0) at = prev + 1;
    else {
      const next = doc.findIndex((l) => l.kind === "day" && l.date > date);
      if (next >= 0) at = next;
    }
    return [...doc.slice(0, at), { kind: "day", date, values: { [name]: value } }, ...doc.slice(at)];
  }
  return doc.flatMap((l): LogDoc => {
    if (l.kind !== "day" || l.date !== date) return [l];
    const values = { ...l.values };
    if (value > 0) values[name] = value;
    else delete values[name];
    return Object.keys(values).length ? [{ kind: "day", date, values }] : [];
  });
}

export function renameInLog(doc: LogDoc, from: string, to: string): LogDoc {
  if (from === to) return doc;
  return doc.map((l) => {
    if (l.kind !== "day" || !(from in l.values)) return l;
    const values: Record<string, number> = {};
    for (const [k, v] of Object.entries(l.values)) values[k === from ? to : k] = v;
    return { kind: "day", date: l.date, values };
  });
}

// ---- stats ----

export const isDone = (habit: Habit, value: number | undefined): boolean =>
  value !== undefined && value >= habit.goal;

const utc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const weekday = (date: string) => new Date(utc(date)).getUTCDay();

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isScheduled = (habit: Habit, date: string): boolean =>
  habit.days ? habit.days.includes(weekday(date)) : true;

export function weekOf(date: string): string[] {
  const monday = addDays(date, -((weekday(date) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const doneOn = (habit: Habit, log: Log, date: string) => isDone(habit, log[date]?.[habit.name]);

export function weekCount(habit: Habit, log: Log, date: string): number {
  return weekOf(date).filter((d) => doneOn(habit, log, d)).length;
}

export function streak(habit: Habit, log: Log, today: string): number {
  let s = 0;
  if (habit.perWeek) {
    for (let i = 0; i < 520; i++) {
      if (weekCount(habit, log, addDays(today, -7 * i)) >= habit.perWeek) s++;
      else if (i > 0) break;
    }
    return s;
  }
  for (let i = 0; i < 3650; i++) {
    const d = addDays(today, -i);
    if (!isScheduled(habit, d)) continue;
    if (doneOn(habit, log, d)) s++;
    else if (i > 0) break;
  }
  return s;
}

export function rate(habit: Habit, log: Log, from: string, to: string): number {
  let days = 0;
  let scheduled = 0;
  let done = 0; // done days; for fixed-days habits only scheduled ones
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days++;
    if (!isScheduled(habit, d)) continue;
    scheduled++;
    if (doneOn(habit, log, d)) done++;
  }
  if (habit.perWeek) return days ? Math.min(1, done / ((habit.perWeek * days) / 7)) : 0;
  return scheduled ? done / scheduled : 0;
}

export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const len = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array((weekday(first) + 6) % 7).fill(null);
  for (let d = 1; d <= len; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}
