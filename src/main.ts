import { ItemView, normalizePath, Plugin, PluginSettingTab, Setting, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import App from "./ui/App.svelte";
import { isPt, t } from "./i18n";
import { DocStore, processFile, TaskStore } from "./store";
import { HabitStore } from "./habits/store";
import { FinanceStore } from "./finance/store";
import type { AgendaDoc, AgendaEvent } from "./agenda/types";
import { googleCalendarUrl, parseAgenda, serializeAgenda, toICS } from "./agenda/parse";
import { PeopleStore } from "./people/store";
import type { DatesDoc } from "./people/types";
import { parseDates, serializeDates } from "./people/parse";
import { ListStore } from "./lists/store";
import type { WishDoc } from "./lists/types";
import { parseWishes, serializeWishes } from "./lists/parse";

const VIEW_TYPE = "all-in-one-hub";

interface Settings {
  rootFolder: string;
  tasksFile: string;
  habitsFile: string;
  habitsFolder: string;
  financeFile: string;
  financeFolder: string;
  /** ISO 4217 code used to format amounts. */
  currency: string;
  agendaFile: string;
  peopleFolder: string;
  datesFile: string;
  listsFolder: string;
  wishFile: string;
  /** Default number of days in advance to remind about birthdays and special dates. */
  leadDays: number;
}

class HubView extends ItemView {
  private component: ReturnType<typeof mount> | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: AllInOnePlugin) {
    super(leaf);
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return t("app.name");
  }
  getIcon() {
    return "layout-dashboard";
  }
  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("aio-root");
    this.component = mount(App, { target: this.contentEl, props: { plugin: this.plugin } });
  }
  async onClose() {
    if (this.component) await unmount(this.component);
    this.component = null;
  }
}

export default class AllInOnePlugin extends Plugin {
  settings!: Settings;
  tasks!: TaskStore;
  habits!: HabitStore;
  finance!: FinanceStore;
  agenda!: DocStore<AgendaDoc>;
  people!: PeopleStore;
  dates!: DocStore<DatesDoc>;
  lists!: ListStore;
  wishes!: DocStore<WishDoc>;

  async onload() {
    // File names are localized once, on first run, then kept so switching language never orphans data.
    this.settings = Object.assign(
      {
        rootFolder: t("file.root"),
        tasksFile: `${t("file.tasks")}.md`,
        habitsFile: `${t("file.habits")}.md`,
        habitsFolder: t("file.habits"),
        financeFile: `${t("file.finance")}.md`,
        financeFolder: t("file.finance"),
        currency: isPt() ? "BRL" : "USD",
        agendaFile: `${t("file.agenda")}.md`,
        peopleFolder: t("file.people"),
        datesFile: `${t("file.dates")}.md`,
        listsFolder: t("file.lists"),
        wishFile: `${t("file.wishes")}.md`,
        leadDays: 14,
      },
      await this.loadData(),
    );
    await this.saveData(this.settings);

    const root = () => this.settings.rootFolder;
    this.tasks = new TaskStore(this.app, () => `${root()}/${this.settings.tasksFile}`);
    this.habits = new HabitStore(
      this.app,
      () => `${root()}/${this.settings.habitsFile}`,
      () => `${root()}/${this.settings.habitsFolder}`,
    );
    this.finance = new FinanceStore(
      this.app,
      () => `${root()}/${this.settings.financeFile}`,
      () => `${root()}/${this.settings.financeFolder}`,
    );
    this.agenda = new DocStore(this.app, () => `${root()}/${this.settings.agendaFile}`, parseAgenda, serializeAgenda);
    this.people = new PeopleStore(this.app, () => `${root()}/${this.settings.peopleFolder}`);
    this.dates = new DocStore(this.app, () => `${root()}/${this.settings.datesFile}`, parseDates, serializeDates);
    this.lists = new ListStore(this.app, () => `${root()}/${this.settings.listsFolder}`);
    this.wishes = new DocStore(this.app, () => `${root()}/${this.settings.wishFile}`, parseWishes, serializeWishes);
    const reload = (path: string) => {
      if (this.tasks.owns(path)) void this.tasks.load();
      if (this.agenda.owns(path)) void this.agenda.load();
      if (this.habits.owns(path)) void this.habits.load();
      if (this.finance.owns(path)) void this.finance.load();
      if (this.dates.owns(path)) void this.dates.load();
      if (this.wishes.owns(path)) void this.wishes.load();
      if (this.lists.owns(path)) void this.lists.load();
      if (this.people.owns(path)) void this.people.load();
    };
    // People are read from frontmatter, which the metadata cache parses a moment after the file changes.
    this.registerEvent(this.app.metadataCache.on("changed", (f) => this.people.owns(f.path) && void this.people.load()));
    this.registerEvent(this.app.vault.on("modify", (f) => reload(f.path)));
    this.registerEvent(this.app.vault.on("delete", (f) => reload(f.path)));
    this.registerEvent(this.app.vault.on("rename", () => void this.loadAll()));
    // "create" also fires for every file while the vault loads; onLayoutReady covers that first read.
    this.app.workspace.onLayoutReady(() => {
      void this.loadAll();
      this.registerEvent(this.app.vault.on("create", (f) => reload(f.path)));
    });

    this.registerView(VIEW_TYPE, (leaf) => new HubView(leaf, this));
    this.addRibbonIcon("layout-dashboard", t("cmd.open"), () => this.openHub());
    this.addCommand({ id: "open-hub", name: t("cmd.open"), callback: () => this.openHub() });
    this.addSettingTab(new SettingsTab(this));
  }

  loadAll() {
    return Promise.all([
      this.tasks.load(),
      this.habits.load(),
      this.finance.load(),
      this.agenda.load(),
      this.people.load(),
      this.dates.load(),
      this.lists.load(),
      this.wishes.load(),
    ]);
  }

  async openHub() {
    const { workspace } = this.app;
    const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
  }

  /** Opens Google Calendar's "new event" page prefilled with the event (the Calendar app takes the link on Android). */
  openInCalendar(event: AgendaEvent) {
    window.open(googleCalendarUrl(event));
  }

  /** Writes the event as an .ics file in the root folder, for any calendar app to import. Returns its vault path. */
  async exportIcs(event: AgendaEvent): Promise<string> {
    const name = event.title.replace(/[\\/:*?"<>|#^[\]]/g, "").trim() || "event";
    const path = normalizePath(`${this.settings.rootFolder}/${name}.ics`);
    await processFile(this.app, path, () => toICS(event));
    return path;
  }

  /** Opens a vault note in a new tab (e.g. a person's note, to write free-form text in its body). */
  async openNote(path: string) {
    const file = this.app.vault.getFileByPath(normalizePath(path));
    if (file) await this.app.workspace.getLeaf(true).openFile(file);
  }

  /** Opens this plugin's settings tab (used by the "More" tab). */
  openSettings() {
    const setting = (this.app as any).setting;
    setting?.open();
    setting?.openTabById(this.manifest.id);
  }
}

class SettingsTab extends PluginSettingTab {
  constructor(private plugin: AllInOnePlugin) {
    super(plugin.app, plugin);
  }
  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName(t("settings.root"))
      .setDesc(t("settings.root.desc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.rootFolder).onChange(async (v) => {
          this.plugin.settings.rootFolder = v.trim().replace(/^\/+|\/+$/g, "") || t("file.root");
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.loadAll();
        }),
      );
    new Setting(this.containerEl)
      .setName(t("settings.currency"))
      .setDesc(t("settings.currency.desc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.currency).onChange(async (v) => {
          const code = v.trim().toUpperCase();
          if (!/^[A-Z]{3}$/.test(code)) return;
          this.plugin.settings.currency = code;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.finance.load(); // re-emit so open views reformat
        }),
      );
    new Setting(this.containerEl)
      .setName(t("settings.lead"))
      .setDesc(t("settings.lead.desc"))
      .addText((text) =>
        text.setValue(String(this.plugin.settings.leadDays)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0 || n > 365) return;
          this.plugin.settings.leadDays = n;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.dates.load(); // re-emit so open views recompute reminders
        }),
      );
  }
}
