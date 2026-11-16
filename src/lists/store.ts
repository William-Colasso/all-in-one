import { type App, normalizePath, TFile } from "obsidian";
import { processFile } from "../store";
import type { ItemDoc, ShoppingList } from "./types";
import { itemsOf, parseItems, serializeItems } from "./parse";

/**
 * Shopping lists (one checkbox note per list, in one folder) as a Svelte-compatible store.
 * Files are the source of truth: every write goes through vault.process and the state is re-read.
 */
export class ListStore {
  private lists: ShoppingList[] = [];
  private subs = new Set<(l: ShoppingList[]) => void>();

  constructor(private app: App, private folder: () => string) {}

  subscribe(fn: (l: ShoppingList[]) => void): () => void {
    fn(this.lists);
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  owns(path: string) {
    return path.startsWith(normalizePath(this.folder()) + "/");
  }

  private path(name: string) {
    return normalizePath(`${this.folder()}/${name}.md`);
  }

  async load() {
    const folder = this.app.vault.getFolderByPath(normalizePath(this.folder()));
    const files = (folder?.children ?? []).filter((f): f is TFile => f instanceof TFile && f.extension === "md");
    const lists: ShoppingList[] = [];
    for (const f of files) lists.push({ name: f.basename, items: itemsOf(parseItems(await this.app.vault.read(f))) });
    this.lists = lists.sort((a, b) => a.name.localeCompare(b.name));
    this.subs.forEach((fn) => fn(this.lists));
  }

  /** Rewrites one list; creates it if missing. `fn` may throw to abort (nothing is written). */
  async mutate(name: string, fn: (doc: ItemDoc) => ItemDoc) {
    await processFile(this.app, this.path(name), (data) => serializeItems(fn(parseItems(data))));
    await this.load();
  }

  create(name: string) {
    if (this.app.vault.getFileByPath(this.path(name))) throw new Error("A list with that name already exists");
    return this.mutate(name, (doc) => doc);
  }

  async rename(from: string, to: string) {
    if (this.app.vault.getFileByPath(this.path(to))) throw new Error("A list with that name already exists");
    const file = this.app.vault.getFileByPath(this.path(from));
    if (file) await this.app.fileManager.renameFile(file, this.path(to));
    await this.load();
  }

  /** Moves the list's note to the trash (per the user's Obsidian deletion setting). */
  async remove(name: string) {
    const file = this.app.vault.getFileByPath(this.path(name));
    if (file) await this.app.fileManager.trashFile(file);
    await this.load();
  }
}
