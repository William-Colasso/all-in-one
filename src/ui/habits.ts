import { Notice } from "obsidian";
import type { Habit, Log } from "../habits/types";
import { isDone, isScheduled } from "../habits/parse";
import { type Key, t } from "../i18n";

/** Upper bound for a recorded amount, so a stuck finger can't write nonsense. */
export const CAP = 9999;

/** Value after tapping the check: yes/no toggles 0/1, amounts count up by one. */
export const tapValue = (habit: Habit, value: number) =>
  habit.goal <= 1 ? (isDone(habit, value) ? 0 : 1) : Math.min(value + 1, CAP);

export type DayState = "done" | "partial" | "missed" | "off" | "future";

/** How a day looks in the week dots and the heat map. */
export function dayState(habit: Habit, log: Log, date: string, today: string): DayState {
  if (date > today) return "future";
  const value = log[date]?.[habit.name];
  if (isDone(habit, value)) return "done";
  if (!isScheduled(habit, date)) return "off";
  return value ? "partial" : "missed";
}

/** "6 / 8 glasses" */
export const amountText = (habit: Habit, value: number) =>
  `${value} / ${habit.goal}${habit.unit ? ` ${habit.unit}` : ""}`;

/** "5 days", or "2 weeks" for times-per-week habits (their streak counts weeks). */
// ponytail: n === 1 covers en and pt-BR; Intl.PluralRules if a language needs more forms.
export const streakText = (habit: Habit, n: number) => {
  const keys: [Key, Key] = habit.perWeek ? ["habit.weeks.one", "habit.weeks.other"] : ["habit.days.one", "habit.days.other"];
  return t(keys[n === 1 ? 0 : 1], { n });
};

/** Runs a store write; on failure shows the save notice and resolves false. */
export async function attempt(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    console.error(e);
    new Notice(t("error.save"));
    return false;
  }
}
