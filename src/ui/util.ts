import { Notice } from "obsidian";
import type AllInOnePlugin from "../main";
import type { Doc, Task, TaskRef } from "../types";
import { isPt, t } from "../i18n";
import { compareTasks, listTasks, todayISO } from "../tasks/parse";

export const locale = () => (isPt() ? "pt-BR" : "en");

/** Local Date for an ISO day (new Date("YYYY-MM-DD") would be UTC midnight). */
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), opts).format(toDate(iso));

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** Tasks of one list (null = all) that pass `keep`, sorted with compareTasks. */
export const refs = (doc: Doc, list: string | null, keep: (task: Task) => boolean): TaskRef[] =>
  listTasks(doc)
    .filter((r) => (list === null || r.list === list) && keep(r.task))
    .sort((a, b) => compareTasks(a.task, b.task));

/**
 * Wraps a mutation of `ref` so it aborts (no write) if the line at ref.index is no
 * longer that task, e.g. the file was edited or synced while a sheet was open.
 */
export const onRef = (ref: TaskRef, fn: (doc: Doc) => Doc) => (doc: Doc) => {
  const line = doc[ref.index];
  if (line?.kind !== "task" || line.task.text !== ref.task.text) throw new Error("Task moved in file");
  return fn(doc);
};

/** Runs a store mutation; on failure shows a notice and resolves false (nothing is written). */
export async function save(plugin: AllInOnePlugin, fn: (doc: Doc) => Doc): Promise<boolean> {
  try {
    await plugin.tasks.mutate(fn);
    return true;
  } catch (e) {
    console.error(e);
    new Notice(t("error.save"));
    return false;
  }
}
