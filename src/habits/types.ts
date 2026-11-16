/**
 * A habit definition. One line of the habits file, e.g.
 * `- Water [goal:: 8] [unit:: glasses]`, `- Gym [freq:: 3/week]`, `- English [days:: mon,wed,fri]`.
 * The name identifies the habit (unique, case-sensitive).
 */
export interface Habit {
  name: string;
  /** Amount that completes a day. 1 for plain yes/no habits. */
  goal: number;
  /** Label for the amount ("glasses", "min"). Empty for yes/no habits. */
  unit: string;
  /** "N times a week, any days". Mutually exclusive with `days`. */
  perWeek: number | null;
  /** Fixed weekdays, 0 = Sunday … 6 = Saturday, sorted. Mutually exclusive with `perWeek`. */
  days: number[] | null;
}

export type HabitLine = { kind: "habit"; habit: Habit } | { kind: "other"; raw: string };
export type HabitDoc = HabitLine[];

/** One line of a monthly log file: `- 2026-11-15 [Water:: 6] [Gym:: 1]`. */
export type LogLine =
  | { kind: "day"; date: string; values: Record<string, number> }
  | { kind: "other"; raw: string };
export type LogDoc = LogLine[];

/** date (YYYY-MM-DD) → habit name → amount recorded that day. */
export type Log = Record<string, Record<string, number>>;

export interface HabitState {
  habits: Habit[];
  log: Log;
}
