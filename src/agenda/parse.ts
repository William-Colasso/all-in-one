import type { AgendaDoc, AgendaEvent, AgendaGroup, EventRef, Occurrence, Repeat } from "./types";

export function cleanTitle(title: string): string {
  return title.replace(/::/g, "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
}

const lines = (md: string) => {
  const ls = md.split(/\r?\n/);
  if (ls[ls.length - 1] === "") ls.pop();
  return ls;
};
const join = (ls: string[]) => (ls.length ? ls.join("\n") + "\n" : "");

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (date: string) => date.split("-").map(Number) as [number, number, number];
const dayNum = (date: string) => {
  const [y, m, d] = ymd(date);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const isLeap = (y: number) => lastDay(y, 2) === 29;
const validDate = (date: string) => {
  const [y, m, d] = ymd(date);
  return m >= 1 && m <= 12 && d >= 1 && d <= lastDay(y, m);
};

// ---- parsing ----

const LINE = /^- (\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/;
const TIME = /^(\d{1,2}):(\d{2})(?=\s|$)/;
const REPEAT_FIELD = /\[repeat::\s*([^\]]*)\]/gi;
const REPEATS = ["daily", "weekly", "monthly", "yearly"];

function parseLine(raw: string): AgendaDoc[number] {
  const m = LINE.exec(raw);
  if (!m || !validDate(m[1])) return { kind: "other", raw };
  let rest = m[2] ?? "";
  let time: string | null = null;
  const t = TIME.exec(rest);
  if (t && Number(t[1]) <= 23 && Number(t[2]) <= 59) {
    time = `${pad(Number(t[1]))}:${t[2]}`;
    rest = rest.slice(t[0].length);
  }
  let repeat: Repeat = null;
  const title = rest
    .replace(REPEAT_FIELD, (all, v: string) => {
      const r = v.trim().toLowerCase();
      if (!REPEATS.includes(r)) return all;
      repeat ??= r as Repeat;
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return { kind: "other", raw };
  return { kind: "event", event: { date: m[1], time, title, repeat } };
}

export function parseAgenda(md: string): AgendaDoc {
  return md === "" ? [] : lines(md).map(parseLine);
}

export function serializeAgenda(doc: AgendaDoc): string {
  return join(
    doc.map((l) => {
      if (l.kind === "other") return l.raw;
      const e = l.event;
      return `- ${e.date}` + (e.time ? ` ${e.time}` : "") + ` ${e.title}` + (e.repeat ? ` [repeat:: ${e.repeat}]` : "");
    }),
  );
}

export function eventsOf(doc: AgendaDoc): EventRef[] {
  return doc.flatMap((l, index) => (l.kind === "event" ? [{ index, event: l.event }] : []));
}

export function sameEvent(a: AgendaEvent, b: AgendaEvent): boolean {
  return a.date === b.date && a.time === b.time && a.title === b.title && a.repeat === b.repeat;
}

// ---- editing ----

const key = (e: AgendaEvent) => `${e.date} ${e.time ?? ""}`; // all-day ("") sorts before any time

export function addEvent(doc: AgendaDoc, event: AgendaEvent): AgendaDoc {
  const k = key(event);
  let at = doc.length;
  const prev = doc.findLastIndex((l) => l.kind === "event" && key(l.event) <= k);
  if (prev >= 0) at = prev + 1;
  else {
    const next = doc.findIndex((l) => l.kind === "event" && key(l.event) > k);
    if (next >= 0) at = next;
  }
  return [...doc.slice(0, at), { kind: "event", event }, ...doc.slice(at)];
}

export function updateEventAt(doc: AgendaDoc, index: number, event: AgendaEvent): AgendaDoc {
  const l = doc[index];
  if (l?.kind !== "event") return doc;
  if (key(l.event) === key(event)) return doc.map((x, i) => (i === index ? { kind: "event", event } : x));
  return addEvent(removeEventAt(doc, index), event);
}

export function removeEventAt(doc: AgendaDoc, index: number): AgendaDoc {
  return doc[index]?.kind === "event" ? doc.filter((_, i) => i !== index) : doc;
}

// ---- dates & recurrence ----

export function addDays(date: string, n: number): string {
  const [y, m, d] = ymd(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function occursOn(event: AgendaEvent, date: string): boolean {
  if (!event.repeat) return date === event.date;
  if (date < event.date) return false;
  const [, em, ed] = ymd(event.date);
  const [y, m, d] = ymd(date);
  switch (event.repeat) {
    case "daily":
      return true;
    case "weekly":
      return (dayNum(date) - dayNum(event.date)) % 7 === 0;
    case "monthly":
      return d === Math.min(ed, lastDay(y, m));
    case "yearly":
      return m === em && (d === ed || (ed === 29 && em === 2 && d === 28 && !isLeap(y)));
  }
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function occurrences(refs: EventRef[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const ref of refs) if (occursOn(ref.event, d)) out.push({ date: d, ref });
  }
  return out.sort(
    (a, b) =>
      cmp(a.date, b.date) || cmp(a.ref.event.time ?? "", b.ref.event.time ?? "") || cmp(a.ref.event.title, b.ref.event.title),
  );
}

// Callers never pass past dates; anything on or before today is "today".
export function groupOf(date: string, today: string): AgendaGroup {
  if (date <= today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  const sunday = addDays(today, 6 - ((dayNum(today) + 3) % 7)); // 1970-01-01 was a Thursday
  return date <= sunday ? "week" : "later";
}

// ---- export ----

const compactDate = (date: string) => date.replace(/-/g, "");

/** Start/end in the compact iCalendar / Google formats. Timed events last one hour. */
function span(e: AgendaEvent): { start: string; end: string; allDay: boolean } {
  if (!e.time) return { start: compactDate(e.date), end: compactDate(addDays(e.date, 1)), allDay: true };
  const [h, m] = e.time.split(":").map(Number);
  const total = h * 60 + m + 60;
  const endDate = total >= 1440 ? addDays(e.date, 1) : e.date;
  const t = total % 1440;
  return {
    start: `${compactDate(e.date)}T${pad(h)}${pad(m)}00`,
    end: `${compactDate(endDate)}T${pad(Math.floor(t / 60))}${pad(t % 60)}00`,
    allDay: false,
  };
}

const RRULE = (r: NonNullable<Repeat>) => `RRULE:FREQ=${r.toUpperCase()}`;

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
};

export function toICS(event: AgendaEvent, now: Date = new Date()): string {
  const s = span(event);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const summary = event.title.replace(/[\\;,]/g, "\\$&").replace(/\r?\n/g, "\\n");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//all-in-one//EN",
      "BEGIN:VEVENT",
      `UID:${hash(`${event.date} ${event.time ?? ""} ${event.title}`)}@all-in-one`,
      `DTSTAMP:${stamp}`,
      s.allDay ? `DTSTART;VALUE=DATE:${s.start}` : `DTSTART:${s.start}`,
      s.allDay ? `DTEND;VALUE=DATE:${s.end}` : `DTEND:${s.end}`,
      ...(event.repeat ? [RRULE(event.repeat)] : []),
      `SUMMARY:${summary}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}

export function googleCalendarUrl(event: AgendaEvent): string {
  const s = span(event);
  const enc = encodeURIComponent;
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(event.title)}&dates=${enc(s.start)}/${enc(s.end)}` +
    (event.repeat ? `&recur=${enc(RRULE(event.repeat))}` : "")
  );
}
