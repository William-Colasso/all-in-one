export type Priority = "high" | "medium" | "low" | null;
export type Recurrence = "daily" | "weekly" | "monthly" | null;

export interface Task {
  text: string;
  done: boolean;
  /** ISO date, YYYY-MM-DD */
  due: string | null;
  priority: Priority;
  recurrence: Recurrence;
  /** ISO date, YYYY-MM-DD; set when done */
  doneDate: string | null;
}

/**
 * One line of the tasks file. Lines the parser does not understand are kept
 * verbatim as "other" so hand-written content is never lost.
 * A level-2 heading ("## Name") starts a list; tasks before the first heading
 * belong to the unnamed list "".
 */
export type Line =
  | { kind: "task"; task: Task }
  | { kind: "heading"; name: string }
  | { kind: "other"; raw: string };

export type Doc = Line[];

/** A task with its position in the Doc and the list it belongs to. */
export interface TaskRef {
  index: number;
  list: string;
  task: Task;
}

export type Bucket = "overdue" | "today" | "upcoming" | "nodate";
