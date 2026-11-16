import { type App, normalizePath, type TFile } from "obsidian";
import type { Doc } from "./types";
import { parseDoc, serializeDoc } from "./tasks/parse";

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
    const path = normalizePath(this.path());
    let file: TFile | null = this.app.vault.getFileByPath(path);
    if (!file) {
      const folder = path.split("/").slice(0, -1).join("/");
      if (folder && !this.app.vault.getFolderByPath(folder)) await this.app.vault.createFolder(folder);
      file = await this.app.vault.create(path, "");
    }
    await this.app.vault.process(file, (data) => {
      const next = fn(parseDoc(data));
      this.set(next);
      return serializeDoc(next);
    });
  }
}
