import type { Bucket, Doc, Priority, Recurrence, Task, TaskRef } from "../types";

const PRIO_EMOJI = { high: "⏫", medium: "🔼", low: "🔽" } as const;
const PRIO_FROM: Record<string, Priority> = { "⏫": "high", "🔼": "medium", "🔽": "low" };
const REC_FROM: Record<string, Recurrence> = { day: "daily", week: "weekly", month: "monthly" };
const REC_TEXT = { daily: "day", weekly: "week", monthly: "month" } as const;
const PRIO_RANK = { high: 0, medium: 1, low: 2 } as const;

export function newTask(text: string, fields: Partial<Task> = {}): Task {
  return { text, done: false, due: null, priority: null, recurrence: null, doneDate: null, ...fields };
}

function parseTask(rest: string, done: boolean): Task {
  let body = rest;
  const take = (re: RegExp): string | null => {
    let v: string | null = null;
    body = body.replace(re, (_m, g: string) => {
      v ??= g;
      return " ";
    });
    return v;
  };
  const due = take(/📅️?\s*(\d{4}-\d{2}-\d{2})/gu);
  const doneDate = take(/✅️?\s*(\d{4}-\d{2}-\d{2})/gu);
  const p = take(/([⏫🔼🔽])️?/gu);
  // Only understood when it is the last thing left; anything else stays in text.
  const r = take(/🔁️?\s*every (day|week|month)(?=\s*$)/u);
  return {
    text: body.replace(/\s+/g, " ").trim(),
    done,
    due,
    priority: p ? PRIO_FROM[p] : null,
    recurrence: r ? REC_FROM[r] : null,
    doneDate,
  };
}

export function parseDoc(md: string): Doc {
  if (md === "") return [];
  const lines = md.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop(); // trailing newline is re-added on serialize
  return lines.map((raw): Doc[number] => {
    if (/^- \[ \] /.test(raw)) return { kind: "task", task: parseTask(raw.slice(6), false) };
    if (/^- \[[xX]\] /.test(raw)) return { kind: "task", task: parseTask(raw.slice(6), true) };
    if (/^## /.test(raw)) return { kind: "heading", name: raw.slice(3).trim() };
    return { kind: "other", raw };
  });
}

function serializeTask(t: Task): string {
  const parts = [t.text];
  if (t.recurrence) parts.push(`🔁 every ${REC_TEXT[t.recurrence]}`);
  if (t.priority) parts.push(PRIO_EMOJI[t.priority]);
  if (t.due) parts.push(`📅 ${t.due}`);
  if (t.doneDate) parts.push(`✅ ${t.doneDate}`);
  return `- [${t.done ? "x" : " "}] ${parts.filter(Boolean).join(" ")}`;
}

export function serializeDoc(doc: Doc): string {
  if (!doc.length) return "";
  const out = doc.map((l) =>
    l.kind === "task" ? serializeTask(l.task) : l.kind === "heading" ? `## ${l.name}` : l.raw,
  );
  return out.join("\n") + "\n";
}

export function listTasks(doc: Doc): TaskRef[] {
  const refs: TaskRef[] = [];
  let list = "";
  doc.forEach((l, index) => {
    if (l.kind === "heading") list = l.name;
    else if (l.kind === "task") refs.push({ index, list, task: l.task });
  });
  return refs;
}

export function listNames(doc: Doc): string[] {
  const names = doc.flatMap((l) => (l.kind === "heading" ? [l.name] : []));
  return [...new Set(names)];
}

const isBlank = (l: Doc[number]) => l.kind === "other" && l.raw.trim() === "";

export function addTask(doc: Doc, task: Task, list: string): Doc {
  const line = { kind: "task", task } as const;
  const h = list === "" ? -1 : doc.findIndex((l) => l.kind === "heading" && l.name === list);
  if (list !== "" && h < 0) {
    const out = [...doc];
    if (out.length && !isBlank(out[out.length - 1])) out.push({ kind: "other", raw: "" });
    out.push({ kind: "heading", name: list }, line);
    return out;
  }
  let end = doc.findIndex((l, i) => i > h && l.kind === "heading");
  if (end < 0) end = doc.length;
  // insert after the last task of the section, else after its last non-blank line, else right after the heading
  let at = h + 1;
  for (let i = h + 1; i < end; i++) if (doc[i].kind === "task") at = i + 1;
  if (at === h + 1) for (let i = h + 1; i < end; i++) if (!isBlank(doc[i])) at = i + 1;
  return [...doc.slice(0, at), line, ...doc.slice(at)];
}

const isTaskAt = (doc: Doc, i: number) => doc[i]?.kind === "task";

export function removeTask(doc: Doc, index: number): Doc {
  return isTaskAt(doc, index) ? doc.filter((_, i) => i !== index) : doc;
}

export function updateTask(doc: Doc, index: number, task: Task, list?: string): Doc {
  if (!isTaskAt(doc, index)) return doc;
  const cur = listTasks(doc).find((r) => r.index === index)!.list;
  if (list !== undefined && list !== cur) return addTask(removeTask(doc, index), task, list);
  return doc.map((l, i) => (i === index ? { kind: "task", task } : l));
}

export function toggleTask(doc: Doc, index: number, today: string): Doc {
  const l = doc[index];
  if (l?.kind !== "task") return doc;
  const t = l.task;
  if (t.done) {
    return doc.map((x, i) => (i === index ? { kind: "task", task: { ...t, done: false, doneDate: null } } : x));
  }
  const out = [...doc];
  out[index] = { kind: "task", task: { ...t, done: true, doneDate: today } };
  if (t.recurrence) {
    const copy = { ...t, done: false, doneDate: null, due: nextDue(t.due ?? today, t.recurrence) };
    out.splice(index, 0, { kind: "task", task: copy });
  }
  return out;
}

export function nextDue(due: string, rec: Exclude<Recurrence, null>): string {
  const [y, m, d] = due.split("-").map(Number);
  let t: number;
  if (rec === "monthly") {
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // last day of next month
    t = Date.UTC(y, m, Math.min(d, last));
  } else {
    t = Date.UTC(y, m - 1, d + (rec === "daily" ? 1 : 7));
  }
  return new Date(t).toISOString().slice(0, 10);
}

export function bucketOf(task: Task, today: string): Bucket {
  if (!task.due) return "nodate";
  return task.due < today ? "overdue" : task.due === today ? "today" : "upcoming";
}

export function todayISO(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pa = a.priority ? PRIO_RANK[a.priority] : 3;
  const pb = b.priority ? PRIO_RANK[b.priority] : 3;
  if (pa !== pb) return pa - pb;
  if (a.due !== b.due) return a.due === null ? 1 : b.due === null ? -1 : a.due < b.due ? -1 : 1;
  return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
}
