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
 * A single Markdown file as a Svelte-compatible store (subscribe contract).
 * The file is the source of truth: every mutation re-reads it atomically through
 * vault.process, so edits made by hand or by sync are kept.
 */
export class DocStore<T> {
  private doc: T;
  private subs = new Set<(d: T) => void>();

  constructor(
    private app: App,
    private path: () => string,
    private parse: (md: string) => T,
    private serialize: (doc: T) => string,
  ) {
    this.doc = parse("");
  }

  subscribe(fn: (d: T) => void): () => void {
    fn(this.doc);
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  private set(doc: T) {
    this.doc = doc;
    this.subs.forEach((fn) => fn(doc));
  }

  owns(path: string) {
    return path === normalizePath(this.path());
  }

  async load() {
    const file = this.app.vault.getFileByPath(normalizePath(this.path()));
    this.set(this.parse(file ? await this.app.vault.read(file) : ""));
  }

  /** `fn` may throw to abort: nothing is written and the error reaches the caller. */
  async mutate(fn: (doc: T) => T) {
    await processFile(this.app, this.path(), (data) => {
      const next = fn(this.parse(data));
      this.set(next);
      return this.serialize(next);
    });
  }
}

export class TaskStore extends DocStore<Doc> {
  constructor(app: App, path: () => string) {
    super(app, path, parseDoc, serializeDoc);
  }
}
