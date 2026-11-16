export type Repeat = "daily" | "weekly" | "monthly" | "yearly" | null;

/**
 * An appointment. One line of the agenda file, e.g.
 * `- 2026-11-20 15:00 Dentist`, `- 2026-12-25 Christmas [repeat:: yearly]`.
 */
export interface AgendaEvent {
  /** ISO date, YYYY-MM-DD. For repeating events, the first occurrence. */
  date: string;
  /** "HH:MM" (24h), or null for an all-day event. */
  time: string | null;
  title: string;
  repeat: Repeat;
}

export type AgendaLine = { kind: "event"; event: AgendaEvent } | { kind: "other"; raw: string };
export type AgendaDoc = AgendaLine[];

/** An event with its line index in the agenda file. */
export interface EventRef {
  index: number;
  event: AgendaEvent;
}

/** One concrete day an event happens on (repeating events yield many). */
export interface Occurrence {
  date: string;
  ref: EventRef;
}

export type AgendaGroup = "today" | "tomorrow" | "week" | "later";
