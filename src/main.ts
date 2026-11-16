import { ItemView, Plugin, PluginSettingTab, Setting, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import App from "./ui/App.svelte";
import { t } from "./i18n";
import { TaskStore } from "./store";
import { HabitStore } from "./habits/store";

const VIEW_TYPE = "all-in-one-hub";

interface Settings {
  rootFolder: string;
  tasksFile: string;
  habitsFile: string;
  habitsFolder: string;
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

  async onload() {
    // File names are localized once, on first run, then kept so switching language never orphans data.
    this.settings = Object.assign(
      {
        rootFolder: t("file.root"),
        tasksFile: `${t("file.tasks")}.md`,
        habitsFile: `${t("file.habits")}.md`,
        habitsFolder: t("file.habits"),
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
    const reload = (path: string) => {
      if (this.tasks.isTasksFile(path)) void this.tasks.load();
      if (this.habits.owns(path)) void this.habits.load();
    };
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
    return Promise.all([this.tasks.load(), this.habits.load()]);
  }

  async openHub() {
    const { workspace } = this.app;
    const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
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
  }
}
