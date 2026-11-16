import type { TaskRef } from "../types";
import type { AgendaDoc, AgendaGroup, EventRef } from "../agenda/types";
import type { DayEvent } from "../people/types";
import { groupOf, occurrences, sameEvent } from "../agenda/parse";
import { todayISO } from "../tasks/parse";
import { addDays } from "./util";

/** How far ahead the Agenda screen looks. */
export const DAYS = 60;

export type Item = { date: string } & ({ event: EventRef } | { task: TaskRef } | { day: DayEvent });

/**
 * Birthdays / special dates, appointments (repeats expanded) and open dated tasks from today
 * through DAYS ahead, grouped by groupOf. Within a day: birthdays and special dates, then
 * appointments (all-day first, then time), then tasks in the order given (callers pass them
 * priority-sorted).
 */
export function agendaGroups(
  events: EventRef[],
  tasks: TaskRef[],
  today: string,
  days: DayEvent[] = [],
): [AgendaGroup, Item[]][] {
  const to = addDays(today, DAYS);
  const items: Item[] = [
    ...days.filter((d) => d.date >= today && d.date <= to).map((day) => ({ date: day.date, day })),
    ...occurrences(events, today, to).map(({ date, ref }) => ({ date, event: ref })),
    ...tasks
      .filter(({ task: x }) => !x.done && !!x.due && x.due >= today && x.due <= to)
      .map((ref) => ({ date: ref.task.due!, task: ref })),
  ];
  // Stable sort: same-day items keep the order above.
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const groups = new Map<AgendaGroup, Item[]>();
  for (const it of items) {
    const g = groupOf(it.date, today);
    groups.set(g, [...(groups.get(g) ?? []), it]);
  }
  return [...groups];
}

/**
 * Wraps a mutation of `ref` so it aborts (no write) if the line at ref.index is no
 * longer that event, e.g. the file was edited or synced while a sheet was open.
 */
export const onEvent = (ref: EventRef, fn: (doc: AgendaDoc) => AgendaDoc) => (doc: AgendaDoc) => {
  const line = doc[ref.index];
  if (line?.kind !== "event" || !sameEvent(line.event, ref.event)) throw new Error("Event moved in file");
  return fn(doc);
};

/** Default for a new appointment: the next full hour (rolls into tomorrow at 23:xx). */
export function nextHour(now = new Date()) {
  const d = new Date(now);
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return { date: todayISO(d), time: `${String(d.getHours()).padStart(2, "0")}:00` };
}
