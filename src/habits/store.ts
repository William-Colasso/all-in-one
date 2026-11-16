import { type App, normalizePath, TFile } from "obsidian";
import { processFile } from "../store";
import type { Habit, HabitDoc, HabitState, Log } from "./types";
import {
  habitsOf,
  logOf,
  parseHabits,
  parseLog,
  renameInLog,
  serializeHabits,
  serializeLog,
  setValue,
  updateHabit,
} from "./parse";

/**
 * Habit definitions (one file) plus the monthly log files (one folder), exposed as a
 * Svelte-compatible store. Files are the source of truth: every write goes through
 * vault.process and the state is then re-read.
 */
export class HabitStore {
  private state: HabitState = { habits: [], log: {} };
  private subs = new Set<(s: HabitState) => void>();

  constructor(private app: App, private defs: () => string, private folder: () => string) {}

  subscribe(fn: (s: HabitState) => void): () => void {
    fn(this.state);
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  owns(path: string) {
    return path === normalizePath(this.defs()) || path.startsWith(normalizePath(this.folder()) + "/");
  }

  private logFiles(): TFile[] {
    const folder = this.app.vault.getFolderByPath(normalizePath(this.folder()));
    return (folder?.children ?? []).filter((f): f is TFile => f instanceof TFile && f.extension === "md");
  }

  async load() {
    const { vault } = this.app;
    const defs = vault.getFileByPath(normalizePath(this.defs()));
    const habits = defs ? habitsOf(parseHabits(await vault.read(defs))) : [];
    // ponytail: reads every monthly file on each load; cache per file if years of history get slow.
    const log: Log = {};
    for (const f of this.logFiles()) Object.assign(log, logOf(parseLog(await vault.read(f))));
    this.state = { habits, log };
    this.subs.forEach((fn) => fn(this.state));
  }

  async mutateHabits(fn: (doc: HabitDoc) => HabitDoc) {
    await processFile(this.app, this.defs(), (data) => serializeHabits(fn(parseHabits(data))));
    await this.load();
  }

  /** Records `value` for a habit on a day (0 clears it). */
  async setValue(date: string, name: string, value: number) {
    const path = `${this.folder()}/${date.slice(0, 7)}.md`;
    await processFile(this.app, path, (data) => serializeLog(setValue(parseLog(data), date, name, value)));
    await this.load();
  }

  /** Replaces the habit called `oldName`; a changed name is carried over to every log file. */
  async update(oldName: string, habit: Habit) {
    if (habit.name !== oldName) {
      for (const f of this.logFiles()) {
        await this.app.vault.process(f, (data) => serializeLog(renameInLog(parseLog(data), oldName, habit.name)));
      }
    }
    await this.mutateHabits((doc) => updateHabit(doc, oldName, habit));
  }
}
