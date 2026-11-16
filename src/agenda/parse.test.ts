import { describe, it, expect } from "vitest";
import {
  addDays, addEvent, cleanTitle, eventsOf, googleCalendarUrl, groupOf, occursOn, occurrences, parseAgenda,
  removeEventAt, sameEvent, serializeAgenda, toICS, updateEventAt,
} from "./parse";
import type { AgendaEvent, Repeat } from "./types";

const ev = (date: string, time: string | null, title: string, repeat: Repeat = null): AgendaEvent => ({
  date, time, title, repeat,
});
const one = (md: string) => eventsOf(parseAgenda(md))[0]?.event;
const titles = (md: string) => eventsOf(parseAgenda(md)).map((x) => x.event.title);

describe("parsing", () => {
  it("reads timed and all-day events", () => {
    expect(one("- 2026-11-20 15:00 Dentist")).toEqual(ev("2026-11-20", "15:00", "Dentist"));
    expect(one("- 2026-11-22 Trip to the coast")).toEqual(ev("2026-11-22", null, "Trip to the coast"));
  });
  it("normalizes H:MM and keeps invalid times in the title", () => {
    expect(one("- 2026-11-20 9:05 Run")).toEqual(ev("2026-11-20", "09:05", "Run"));
    expect(one("- 2026-11-20 25:00 Run")).toEqual(ev("2026-11-20", null, "25:00 Run"));
    expect(one("- 2026-11-20 12:60 Run")).toEqual(ev("2026-11-20", null, "12:60 Run"));
    expect(one("- 2026-11-20 10:00am Run")).toEqual(ev("2026-11-20", null, "10:00am Run"));
  });
  it("reads repeat in any position and case", () => {
    expect(one("- 2026-12-25 Christmas [repeat:: yearly]")).toEqual(ev("2026-12-25", null, "Christmas", "yearly"));
    expect(one("- 2026-11-16 07:30 [REPEAT:: Weekly] Gym")).toEqual(ev("2026-11-16", "07:30", "Gym", "weekly"));
    expect(one("- 2026-11-16 Gym [repeat::daily] club")).toEqual(ev("2026-11-16", null, "Gym club", "daily"));
  });
  it("leaves unknown repeat values and unknown fields in the title", () => {
    expect(one("- 2026-11-16 Gym [repeat:: hourly]")).toEqual(ev("2026-11-16", null, "Gym [repeat:: hourly]"));
    expect(one("- 2026-11-16 Gym [color:: red]")).toEqual(ev("2026-11-16", null, "Gym [color:: red]"));
  });
  it("treats invalid dates, empty titles and other lines as other", () => {
    const md = "# T\n- 2026-02-30 x\n- 2026-13-01 x\n- 2026-11-20\n- 2026-11-20 10:00\n- 2026-11-20 [repeat:: daily]\n- [ ] x\n  - 2026-11-20 x\nprose\n\n";
    expect(parseAgenda(md.trimEnd() + "\n").every((l) => l.kind === "other")).toBe(true);
    expect(serializeAgenda(parseAgenda(md))).toBe(md);
  });
  it("round-trips canonical files and normalizes newlines", () => {
    const md =
      "# Agenda\n- 2026-11-16 07:30 Gym [repeat:: weekly]\n- 2026-11-20 15:00 Dentist\n\nnotes\n- 2026-11-22 Trip\n- 2026-12-25 Christmas [repeat:: yearly]\n";
    expect(serializeAgenda(parseAgenda(md))).toBe(md);
    expect(serializeAgenda(parseAgenda(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeAgenda(parseAgenda("- 2026-11-20 9:00 A"))).toBe("- 2026-11-20 09:00 A\n");
  });
  it("handles empty input", () => {
    expect(parseAgenda("")).toEqual([]);
    expect(serializeAgenda(parseAgenda(""))).toBe("");
    expect(serializeAgenda(parseAgenda("\n"))).toBe("\n");
  });
});

describe("editing", () => {
  it("adds into an empty doc", () => {
    expect(serializeAgenda(addEvent([], ev("2026-11-20", null, "A")))).toBe("- 2026-11-20 A\n");
  });
  it("keeps date/time order with all-day first", () => {
    let d = parseAgenda("");
    d = addEvent(d, ev("2026-11-20", "15:00", "B"));
    d = addEvent(d, ev("2026-11-20", null, "A"));
    d = addEvent(d, ev("2026-11-19", "23:00", "Z"));
    d = addEvent(d, ev("2026-11-20", "09:00", "C"));
    d = addEvent(d, ev("2026-11-20", "15:00", "B2"));
    d = addEvent(d, ev("2026-11-21", null, "Last"));
    expect(titles(serializeAgenda(d))).toEqual(["Z", "A", "C", "B", "B2", "Last"]);
  });
  it("leaves other lines in place", () => {
    const d = parseAgenda("# H\n- 2026-11-20 B\nnote\n- 2026-11-22 D\n");
    expect(serializeAgenda(addEvent(d, ev("2026-11-21", null, "C")))).toBe("# H\n- 2026-11-20 B\n- 2026-11-21 C\nnote\n- 2026-11-22 D\n");
    expect(serializeAgenda(addEvent(d, ev("2026-11-01", null, "A")))).toBe("# H\n- 2026-11-01 A\n- 2026-11-20 B\nnote\n- 2026-11-22 D\n");
    expect(serializeAgenda(addEvent(parseAgenda("# H\nprose\n"), ev("2026-11-01", null, "A")))).toBe("# H\nprose\n- 2026-11-01 A\n");
  });
  it("updates in place or re-places", () => {
    const d = parseAgenda("- 2026-11-20 A\n- 2026-11-21 B\n- 2026-11-22 C\n");
    expect(serializeAgenda(updateEventAt(d, 0, ev("2026-11-20", null, "A2", "daily")))).toBe(
      "- 2026-11-20 A2 [repeat:: daily]\n- 2026-11-21 B\n- 2026-11-22 C\n",
    );
    expect(serializeAgenda(updateEventAt(d, 0, ev("2026-11-23", null, "A")))).toBe("- 2026-11-21 B\n- 2026-11-22 C\n- 2026-11-23 A\n");
    expect(serializeAgenda(updateEventAt(d, 2, ev("2026-11-20", "08:00", "C")))).toBe(
      "- 2026-11-20 A\n- 2026-11-20 08:00 C\n- 2026-11-21 B\n",
    );
    const withOther = parseAgenda("# H\n- 2026-11-20 A\n");
    expect(updateEventAt(withOther, 0, ev("2026-11-20", null, "X"))).toBe(withOther);
    expect(updateEventAt(withOther, 9, ev("2026-11-20", null, "X"))).toBe(withOther);
  });
  it("removes event lines only", () => {
    const d = parseAgenda("# H\n- 2026-11-20 A\n- 2026-11-21 B\n");
    expect(serializeAgenda(removeEventAt(d, 1))).toBe("# H\n- 2026-11-21 B\n");
    expect(removeEventAt(d, 0)).toBe(d);
    expect(removeEventAt(d, 7)).toBe(d);
  });
  it("does not mutate inputs", () => {
    const d = parseAgenda("- 2026-11-20 A\n- 2026-11-21 B\n");
    const snap = JSON.parse(JSON.stringify(d));
    const e = ev("2026-11-19", null, "N");
    addEvent(d, e);
    updateEventAt(d, 0, ev("2026-12-01", null, "A"));
    removeEventAt(d, 0);
    expect(d).toEqual(snap);
    expect(e).toEqual(ev("2026-11-19", null, "N"));
  });
  it("compares events and cleans titles", () => {
    expect(sameEvent(ev("2026-11-20", null, "A"), ev("2026-11-20", null, "A"))).toBe(true);
    expect(sameEvent(ev("2026-11-20", null, "A"), ev("2026-11-20", "10:00", "A"))).toBe(false);
    expect(sameEvent(ev("2026-11-20", null, "A"), ev("2026-11-20", null, "A", "daily"))).toBe(false);
    expect(cleanTitle("  a [b]::  c \n d ")).toBe("a b c d");
  });
});

describe("recurrence", () => {
  it("one-off events occur once", () => {
    expect(occursOn(ev("2026-11-20", null, "A"), "2026-11-20")).toBe(true);
    expect(occursOn(ev("2026-11-20", null, "A"), "2026-11-21")).toBe(false);
  });
  it("never occurs before the start date", () => {
    for (const r of ["daily", "weekly", "monthly", "yearly"] as const) {
      expect(occursOn(ev("2026-11-20", null, "A", r), "2026-11-19")).toBe(false);
      expect(occursOn(ev("2026-11-20", null, "A", r), "2026-11-20")).toBe(true);
    }
  });
  it("daily and weekly", () => {
    expect(occursOn(ev("2026-11-16", null, "A", "daily"), "2027-03-01")).toBe(true);
    const w = ev("2026-11-16", null, "A", "weekly");
    expect(occursOn(w, "2026-11-23")).toBe(true);
    expect(occursOn(w, "2026-12-14")).toBe(true);
    expect(occursOn(w, "2026-11-24")).toBe(false);
    expect(occursOn(w, "2027-01-04")).toBe(true);
  });
  it("monthly clamps to the last day", () => {
    const m = ev("2026-01-31", null, "A", "monthly");
    expect(occursOn(m, "2026-02-28")).toBe(true);
    expect(occursOn(m, "2026-02-27")).toBe(false);
    expect(occursOn(m, "2026-04-30")).toBe(true);
    expect(occursOn(m, "2026-03-31")).toBe(true);
    expect(occursOn(m, "2026-03-30")).toBe(false);
    expect(occursOn(m, "2028-02-29")).toBe(true);
    expect(occursOn(m, "2028-02-28")).toBe(false);
    expect(occursOn(ev("2026-11-15", null, "A", "monthly"), "2027-02-15")).toBe(true);
  });
  it("yearly handles leap days", () => {
    const y = ev("2024-02-29", null, "A", "yearly");
    expect(occursOn(y, "2025-02-28")).toBe(true);
    expect(occursOn(y, "2025-03-01")).toBe(false);
    expect(occursOn(y, "2028-02-29")).toBe(true);
    expect(occursOn(y, "2028-02-28")).toBe(false);
    expect(occursOn(ev("2026-12-25", null, "X", "yearly"), "2027-12-25")).toBe(true);
    expect(occursOn(ev("2026-12-25", null, "X", "yearly"), "2027-12-24")).toBe(false);
  });
  it("lists occurrences sorted over a range", () => {
    const refs = eventsOf(
      parseAgenda("- 2026-11-16 07:30 Gym [repeat:: weekly]\n- 2026-11-16 Zebra\n- 2026-11-16 Apple\n- 2026-11-18 12:00 Lunch\n- 2026-11-23 Late\n"),
    );
    const out = occurrences(refs, "2026-11-16", "2026-11-22").map((o) => `${o.date} ${o.ref.event.title}`);
    expect(out).toEqual(["2026-11-16 Apple", "2026-11-16 Zebra", "2026-11-16 Gym", "2026-11-18 Lunch"]);
    expect(occurrences(refs, "2026-11-23", "2026-11-23").map((o) => o.ref.index)).toEqual([4, 0]);
    expect(occurrences(refs, "2026-11-30", "2026-11-01")).toEqual([]);
  });
  it("handles a big range", () => {
    const refs = eventsOf(parseAgenda(Array.from({ length: 300 }, (_, i) => `- 2026-01-${String((i % 28) + 1).padStart(2, "0")} E${i} [repeat:: weekly]`).join("\n") + "\n"));
    expect(occurrences(refs, "2026-11-15", "2027-12-19").length).toBeGreaterThan(1000);
  });
  it("adds days across boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("groupOf", () => {
  it("groups relative to a Wednesday", () => {
    const t = "2026-11-11";
    expect(groupOf("2026-11-11", t)).toBe("today");
    expect(groupOf("2026-11-12", t)).toBe("tomorrow");
    expect(groupOf("2026-11-13", t)).toBe("week");
    expect(groupOf("2026-11-15", t)).toBe("week");
    expect(groupOf("2026-11-16", t)).toBe("later");
  });
  it("groups relative to a Monday and a Sunday", () => {
    expect(groupOf("2026-11-15", "2026-11-09")).toBe("week");
    expect(groupOf("2026-11-16", "2026-11-09")).toBe("later");
    expect(groupOf("2026-11-16", "2026-11-15")).toBe("tomorrow");
    expect(groupOf("2026-11-17", "2026-11-15")).toBe("later");
  });
  it("treats past dates as today", () => {
    expect(groupOf("2026-11-01", "2026-11-11")).toBe("today");
  });
});

describe("toICS", () => {
  const now = new Date("2026-11-15T10:20:30.456Z");
  it("writes a timed event", () => {
    const ics = toICS(ev("2026-11-20", "15:00", "Dentist"), now);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const l = ics.split("\r\n");
    expect(l.slice(0, 4)).toEqual(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//all-in-one//EN", "BEGIN:VEVENT"]);
    expect(l).toContain("DTSTAMP:20261115T102030Z");
    expect(l).toContain("DTSTART:20261120T150000");
    expect(l).toContain("DTEND:20261120T160000");
    expect(l).toContain("SUMMARY:Dentist");
    expect(l.some((x) => /^UID:[0-9a-f]+@all-in-one$/.test(x))).toBe(true);
    expect(l.slice(-3)).toEqual(["END:VEVENT", "END:VCALENDAR", ""]);
    expect(l.some((x) => x.startsWith("RRULE"))).toBe(false);
  });
  it("is deterministic in its UID and differs per event", () => {
    const uid = (e: AgendaEvent) => toICS(e, now).split("\r\n").find((x) => x.startsWith("UID:"));
    expect(uid(ev("2026-11-20", "15:00", "A"))).toBe(uid(ev("2026-11-20", "15:00", "A")));
    expect(uid(ev("2026-11-20", "15:00", "A"))).not.toBe(uid(ev("2026-11-20", "15:00", "B")));
  });
  it("crosses midnight", () => {
    const l = toICS(ev("2026-12-31", "23:30", "Party"), now).split("\r\n");
    expect(l).toContain("DTSTART:20261231T233000");
    expect(l).toContain("DTEND:20270101T003000");
  });
  it("writes all-day and repeating events with escaping", () => {
    const l = toICS(ev("2026-02-28", null, "A, b; c\\d\ne", "monthly"), now).split("\r\n");
    expect(l).toContain("DTSTART;VALUE=DATE:20260228");
    expect(l).toContain("DTEND;VALUE=DATE:20260301");
    expect(l).toContain("RRULE:FREQ=MONTHLY");
    expect(l).toContain("SUMMARY:A\\, b\\; c\\\\d\\ne");
    expect(toICS(ev("2026-11-20", null, "x", "yearly"), now)).toContain("RRULE:FREQ=YEARLY");
  });
});

describe("googleCalendarUrl", () => {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  it("builds timed, all-day and repeating urls", () => {
    expect(googleCalendarUrl(ev("2026-11-20", "15:00", "Dentist"))).toBe(
      `${base}&text=Dentist&dates=20261120T150000/20261120T160000`,
    );
    expect(googleCalendarUrl(ev("2026-11-22", null, "Trip"))).toBe(`${base}&text=Trip&dates=20261122/20261123`);
    expect(googleCalendarUrl(ev("2026-11-16", "23:30", "Gym", "weekly"))).toBe(
      `${base}&text=Gym&dates=20261116T233000/20261117T003000&recur=RRULE%3AFREQ%3DWEEKLY`,
    );
  });
  it("encodes the title", () => {
    expect(googleCalendarUrl(ev("2026-11-22", null, "Tom & Jerry's #1?"))).toContain(
      "&text=Tom%20%26%20Jerry's%20%231%3F&",
    );
  });
});
