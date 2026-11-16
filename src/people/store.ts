import { type App, normalizePath, TFile } from "obsidian";
import { processFile } from "../store";
import type { Person } from "./types";
import { applyPerson, personFrom } from "./parse";

/**
 * People notes (one per person, data in frontmatter) as a Svelte-compatible store.
 * Reads go through Obsidian's metadata cache and writes through processFrontMatter,
 * so the YAML is always handled by Obsidian itself and the note body is never touched.
 */
export class PeopleStore {
  private people: Person[] = [];
  private subs = new Set<(p: Person[]) => void>();

  constructor(private app: App, private folder: () => string) {}

  subscribe(fn: (p: Person[]) => void): () => void {
    fn(this.people);
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  owns(path: string) {
    return path.startsWith(normalizePath(this.folder()) + "/");
  }

  path(name: string) {
    return normalizePath(`${this.folder()}/${name}.md`);
  }

  async load() {
    const folder = this.app.vault.getFolderByPath(normalizePath(this.folder()));
    const files = (folder?.children ?? []).filter((f): f is TFile => f instanceof TFile && f.extension === "md");
    this.people = files
      .map((f) => personFrom(f.basename, this.app.metadataCache.getFileCache(f)?.frontmatter))
      .sort((a, b) => a.name.localeCompare(b.name));
    this.subs.forEach((fn) => fn(this.people));
  }

  /** Creates or updates a person. `oldName` renames the note (links to it are updated by Obsidian). */
  async save(person: Person, oldName?: string) {
    const target = this.path(person.name);
    if (oldName && oldName !== person.name) {
      if (this.app.vault.getFileByPath(target)) throw new Error("A person with that name already exists");
      const old = this.app.vault.getFileByPath(this.path(oldName));
      if (old) await this.app.fileManager.renameFile(old, target);
    }
    await processFile(this.app, target, (data) => data); // creates the note and folder if missing
    const file = this.app.vault.getFileByPath(target)!;
    await this.app.fileManager.processFrontMatter(file, (fm) => applyPerson(fm, person));
    // The metadata cache updates asynchronously; main.ts reloads this store on its "changed" event.
  }

  /** Moves the person's note to the trash (per the user's Obsidian deletion setting). */
  async remove(name: string) {
    const file = this.app.vault.getFileByPath(this.path(name));
    if (file) await this.app.fileManager.trashFile(file);
    await this.load();
  }
}
