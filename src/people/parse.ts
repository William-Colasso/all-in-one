import type { DatesDoc, DayEvent, Person, Reminder, SpecialDate } from "./types";

// ---- person <-> frontmatter ----

const strs = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => String(x ?? "").trim()).filter(Boolean)
    : typeof v === "string"
      ? v.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const isLeap = (y: number) => lastDay(y, 2) === 29;
const validMD = (m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= lastDay(2000, m);
const validDate = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= lastDay(y, m);

function birthdayFrom(v: unknown): string | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v !== "string") return null;
  const s = v.trim();
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (full) return validDate(+full[1], +full[2], +full[3]) ? s : null;
  const md = /^(?:--)?(\d{2})-(\d{2})$/.exec(s);
  return md && validMD(+md[1], +md[2]) ? `${md[1]}-${md[2]}` : null;
}

export function personFrom(name: string, fm: unknown): Person {
  const f = (fm && typeof fm === "object" ? fm : {}) as Record<string, unknown>;
  return {
    name,
    birthday: birthdayFrom(f.birthday),
    relation: typeof f.relation === "string" ? f.relation.trim() : "",
    likes: strs(f.likes),
    sizes: strs(f.sizes),
    ideas: strs(f["gift-ideas"]),
    given: strs(f["gifts-given"]),
  };
}

/** The one mutating function: `fm` is the object Obsidian's processFrontMatter hands out. */
export function applyPerson(fm: Record<string, unknown>, person: Person): void {
  const set = (key: string, v: string | string[] | null) => {
    if (v === null || v === "" || (Array.isArray(v) && !v.length)) delete fm[key];
    else fm[key] = Array.isArray(v) ? [...v] : v;
  };
  set("birthday", person.birthday);
  set("relation", person.relation);
  set("likes", person.likes);
  set("sizes", person.sizes);
  set("gift-ideas", person.ideas);
  set("gifts-given", person.given);
}

export function cleanName(name: string): string {
  return name
    .replace(/::/g, "")
    .replace(/[\\/:*?"<>|#^[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
}

export function cleanEntry(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// ---- dates file ----

const lines = (md: string) => {
  const ls = md.split(/\r?\n/);
  if (ls[ls.length - 1] === "") ls.pop();
  return ls;
};
const join = (ls: string[]) => (ls.length ? ls.join("\n") + "\n" : "");

const LINE = /^- (\d{2})-(\d{2})(?:\s+(.*))?$/;
const FIELD = /\[(people|lead)::\s*([^\]]*)\]/gi;

function parseLine(raw: string): DatesDoc[number] {
  const m = LINE.exec(raw);
  if (!m || !validMD(+m[1], +m[2])) return { kind: "other", raw };
  let people: string[] | null = null;
  let lead: number | null = null;
  const name = (m[3] ?? "")
    .replace(FIELD, (all, k: string, v: string) => {
      if (k.toLowerCase() === "people") {
        people ??= strs(v);
        return " ";
      }
      const n = /^\d+$/.test(v.trim()) ? Number(v) : -1;
      if (n < 0 || n > 365) return all; // invalid lead stays in the name
      lead ??= n;
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return { kind: "other", raw };
  return { kind: "date", date: { name, day: `${m[1]}-${m[2]}`, people: people ?? [], lead } };
}

export function parseDates(md: string): DatesDoc {
  return md === "" ? [] : lines(md).map(parseLine);
}

export function serializeDates(doc: DatesDoc): string {
  return join(
    doc.map((l) => {
      if (l.kind === "other") return l.raw;
      const d = l.date;
      return `- ${d.day} ${d.name}` + (d.people.length ? ` [people:: ${d.people.join(", ")}]` : "") + (d.lead !== null ? ` [lead:: ${d.lead}]` : "");
    }),
  );
}

export function datesOf(doc: DatesDoc): SpecialDate[] {
  return doc.flatMap((l) => (l.kind === "date" ? [l.date] : []));
}

const nameIdx = (doc: DatesDoc, name: string) => doc.findIndex((l) => l.kind === "date" && l.date.name === name);

export function upsertDate(doc: DatesDoc, date: SpecialDate, oldName?: string): DatesDoc {
  const key = oldName ?? date.name;
  if (date.name !== key && nameIdx(doc, date.name) >= 0) return doc;
  const line: DatesDoc[number] = { kind: "date", date };
  const i = nameIdx(doc, key);
  if (i >= 0) return doc.map((l, j) => (j === i ? line : l));
  const at = doc.findLastIndex((l) => l.kind === "date") + 1 || doc.length;
  return [...doc.slice(0, at), line, ...doc.slice(at)];
}

export function removeDate(doc: DatesDoc, name: string): DatesDoc {
  return doc.filter((l) => !(l.kind === "date" && l.date.name === name));
}

const mapPeople = (doc: DatesDoc, fn: (people: string[]) => string[]): DatesDoc =>
  doc.map((l) => (l.kind === "date" ? { kind: "date", date: { ...l.date, people: fn(l.date.people) } } : l));

export function renamePersonInDates(doc: DatesDoc, from: string, to: string): DatesDoc {
  return mapPeople(doc, (p) => [...new Set(p.map((n) => (n === from ? to : n)))]);
}

export function removePersonFromDates(doc: DatesDoc, name: string): DatesDoc {
  return mapPeople(doc, (p) => p.filter((n) => n !== name));
}

// ---- dates & occurrences ----

const pad = (n: number) => String(n).padStart(2, "0");
const dayNum = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};

export function daysBetween(from: string, to: string): number {
  return dayNum(to) - dayNum(from);
}

/** The month-day `md` ("MM-DD" or "YYYY-MM-DD") in year `y`; 02-29 becomes 02-28 in non-leap years. */
const occurrenceIn = (md: string, y: number) => {
  const [m, d] = md.slice(-5).split("-").map(Number);
  return `${y}-${pad(m)}-${pad(m === 2 && d === 29 && !isLeap(y) ? 28 : d)}`;
};

export function nextOccurrence(day: string, today: string): string {
  const y = Number(today.slice(0, 4));
  const here = occurrenceIn(day, y);
  return here >= today ? here : occurrenceIn(day, y + 1);
}

const birthdayOn = (p: Person, date: string): DayEvent => {
  const turning = p.birthday?.length === 10 ? Number(date.slice(0, 4)) - Number(p.birthday.slice(0, 4)) : -1;
  return { date, kind: "birthday", title: p.name, people: [p.name], turning: turning >= 0 ? turning : null };
};
const dateOn = (d: SpecialDate, date: string): DayEvent => ({ date, kind: "date", title: d.name, people: [...d.people], turning: null });

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byEvent = (a: DayEvent, b: DayEvent) => cmp(a.date, b.date) || cmp(a.kind, b.kind) || cmp(a.title, b.title); // "birthday" < "date"

export function dayEvents(people: Person[], dates: SpecialDate[], from: string, to: string): DayEvent[] {
  const out: DayEvent[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    const inRange = (d: string) => d >= from && d <= to;
    for (const p of people) if (p.birthday && inRange(occurrenceIn(p.birthday, y))) out.push(birthdayOn(p, occurrenceIn(p.birthday, y)));
    for (const d of dates) if (inRange(occurrenceIn(d.day, y))) out.push(dateOn(d, occurrenceIn(d.day, y)));
  }
  return out.sort(byEvent);
}

export function reminders(people: Person[], dates: SpecialDate[], today: string, defaultLead: number): Reminder[] {
  const out: Reminder[] = [];
  const add = (e: DayEvent, lead: number) => {
    const daysLeft = daysBetween(today, e.date);
    if (daysLeft <= lead) out.push({ ...e, daysLeft });
  };
  for (const p of people) if (p.birthday) add(birthdayOn(p, nextOccurrence(p.birthday, today)), defaultLead);
  for (const d of dates) add(dateOn(d, nextOccurrence(d.day, today)), d.lead ?? defaultLead);
  return out.sort((a, b) => a.daysLeft - b.daysLeft || byEvent(a, b));
}

export function giftLine(date: string, text: string): string {
  return `${date} ${text}`;
}
