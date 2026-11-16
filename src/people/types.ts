/**
 * A person. One note per person in the people folder; the note's name is the person's
 * name and the data lives in its frontmatter (Obsidian properties), so the body stays
 * free for the user's own notes:
 *
 * ---
 * birthday: 1990-03-12
 * relation: Sister
 * likes: [coffee, hiking]
 * sizes: [shirt M]
 * gift-ideas: [Trail shoes]
 * gifts-given: [2025-12-25 Headphones]
 * ---
 */
export interface Person {
  /** Note name without extension. Unique id. */
  name: string;
  /** "YYYY-MM-DD", or "MM-DD" when the year is unknown. */
  birthday: string | null;
  relation: string;
  likes: string[];
  sizes: string[];
  ideas: string[];
  given: string[];
}

/**
 * A yearly special date. One line of the dates file:
 * `- 12-25 Christmas [people:: Ana, João] [lead:: 21]`. The name is the unique id.
 */
export interface SpecialDate {
  name: string;
  /** "MM-DD" */
  day: string;
  /** Names of the people this date is about (gift recipients). */
  people: string[];
  /** Days in advance to start reminding; null = the plugin default. */
  lead: number | null;
}

export type DateLine = { kind: "date"; date: SpecialDate } | { kind: "other"; raw: string };
export type DatesDoc = DateLine[];

/** A birthday or special date falling on a concrete day. */
export interface DayEvent {
  /** ISO date of this occurrence. */
  date: string;
  kind: "birthday" | "date";
  /** Person name (birthday) or special-date name. */
  title: string;
  /** Birthday: [the person]. Special date: its linked people. */
  people: string[];
  /** Birthday with a known birth year: the age reached on `date`. Otherwise null. */
  turning: number | null;
}

/** An upcoming DayEvent that is within its reminder lead time. */
export interface Reminder extends DayEvent {
  /** 0 = today. */
  daysLeft: number;
}
