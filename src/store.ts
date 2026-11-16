import { type App, normalizePath } from "obsidian";
import type { Doc } from "./types";
import { parseDoc, serializeDoc } from "./tasks/parse";

/** Atomically rewrites a vault file through `fn`, creating the file and its folders if missing. */
export async function processFile(app: App, rawPath: string, fn: (data: string) => string) {
  const path = normalizePath(rawPath);
  let file = app.vault.getFileByPath(path);
  if (!file) {
    const parts = path.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      const folder = parts.slice(0, i).join("/");
      if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
    }
    file = await app.vault.create(path, "");
  }
  await app.vault.process(file, fn);
}

/**
 * Tasks file as a Svelte-compatible store (subscribe contract).
 * The Markdown file is the source of truth: every mutation re-reads it
 * atomically through vault.process, so edits made by hand or by sync are kept.
 */
export class TaskStore {
  private doc: Doc = [];
  private subs = new Set<(d: Doc) => void>();

  constructor(private app: App, private path: () => string) {}

  subscribe(fn: (d: Doc) => void): () => void {
    fn(this.doc);
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  private set(doc: Doc) {
    this.doc = doc;
    this.subs.forEach((fn) => fn(doc));
  }

  isTasksFile(path: string) {
    return path === normalizePath(this.path());
  }

  async load() {
    const file = this.app.vault.getFileByPath(normalizePath(this.path()));
    this.set(file ? parseDoc(await this.app.vault.read(file)) : []);
  }

  async mutate(fn: (doc: Doc) => Doc) {
    await processFile(this.app, this.path(), (data) => {
      const next = fn(parseDoc(data));
      this.set(next);
      return serializeDoc(next);
    });
  }
}
