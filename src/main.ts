import { ItemView, Plugin, PluginSettingTab, Setting, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import App from "./ui/App.svelte";
import { t } from "./i18n";
import { TaskStore } from "./store";

const VIEW_TYPE = "all-in-one-hub";

interface Settings {
  rootFolder: string;
  tasksFile: string;
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

  async onload() {
    // File names are localized once, on first run, then kept so switching language never orphans data.
    this.settings = Object.assign(
      { rootFolder: t("file.root"), tasksFile: `${t("file.tasks")}.md` },
      await this.loadData(),
    );
    await this.saveData(this.settings);

    this.tasks = new TaskStore(this.app, () => `${this.settings.rootFolder}/${this.settings.tasksFile}`);
    const reload = (path: string) => this.tasks.isTasksFile(path) && this.tasks.load();
    this.registerEvent(this.app.vault.on("modify", (f) => reload(f.path)));
    this.registerEvent(this.app.vault.on("delete", (f) => reload(f.path)));
    this.registerEvent(this.app.vault.on("rename", () => this.tasks.load()));
    this.app.workspace.onLayoutReady(() => this.tasks.load());

    this.registerView(VIEW_TYPE, (leaf) => new HubView(leaf, this));
    this.addRibbonIcon("layout-dashboard", t("cmd.open"), () => this.openHub());
    this.addCommand({ id: "open-hub", name: t("cmd.open"), callback: () => this.openHub() });
    this.addSettingTab(new SettingsTab(this));
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
          await this.plugin.tasks.load();
        }),
      );
  }
}
