<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { TaskRef } from "../types";
  import type { Habit } from "../habits/types";
  import { type Key, t } from "../i18n";
  import { todayISO } from "../tasks/parse";
  import Icon from "./Icon.svelte";
  import HabitDetail from "./HabitDetail.svelte";
  import HabitForm from "./HabitForm.svelte";
  import Habits from "./Habits.svelte";
  import Sheet from "./Sheet.svelte";
  import TaskForm from "./TaskForm.svelte";
  import Tasks from "./Tasks.svelte";
  import Today from "./Today.svelte";

  let { plugin }: { plugin: AllInOnePlugin } = $props();

  type Tab = "today" | "tasks" | "habits" | "finances" | "more";
  type Item = { icon: string; key: Key };
  const TABS: (Item & { id: Tab })[] = [
    { id: "today", icon: "sun", key: "tab.today" },
    { id: "tasks", icon: "check-square", key: "tab.tasks" },
    { id: "habits", icon: "repeat", key: "tab.habits" },
    { id: "finances", icon: "wallet", key: "tab.finances" },
    { id: "more", icon: "more-horizontal", key: "tab.more" },
  ];
  const SOON_TYPES: Item[] = [
    { icon: "wallet", key: "type.expense" },
    { icon: "calendar", key: "type.appointment" },
    { icon: "list", key: "type.listItem" },
  ];
  const SOON_MORE: Item[] = [
    { icon: "calendar", key: "more.agenda" },
    { icon: "users", key: "more.people" },
    { icon: "list", key: "more.lists" },
  ];

  const tasks = $derived(plugin.tasks);
  const habits = $derived(plugin.habits);
  let tab = $state<Tab>("today");
  let filter = $state<string | null>(null); // list filter of the Tasks tab, also the default list for new tasks there
  let sheet = $state.raw<
    | { kind: "pick" }
    | { kind: "task"; ref: TaskRef | null }
    | { kind: "habit"; habit: Habit | null }
    | { kind: "detail"; name: string; date: string }
    | null
  >(null);

  // Keeps "today" right when the view stays open past midnight.
  let today = $state(todayISO());
  $effect(() => {
    const id = window.setInterval(() => (today = todayISO()), 60_000);
    return () => window.clearInterval(id);
  });

  const edit = (ref: TaskRef) => (sheet = { kind: "task", ref });
  const openHabit = (name: string, date: string) => (sheet = { kind: "detail", name, date });
  const newHabit = () => (sheet = { kind: "habit", habit: null });
  const close = () => (sheet = null);
  const title = $derived(
    sheet?.kind === "task"
      ? t(sheet.ref ? "form.edit" : "form.new")
      : sheet?.kind === "habit"
        ? t(sheet.habit ? "habit.edit" : "habit.new")
        : sheet?.kind === "detail"
          ? sheet.name
          : t("add.title"),
  );
</script>

<div class="aio-main">
  <div class="aio-page">
    <div class="aio-col">
      {#if tab === "today"}
        <Today {plugin} doc={$tasks} habits={$habits} {today} onedit={edit} onhabit={openHabit} />
      {:else if tab === "tasks"}
        <Tasks {plugin} doc={$tasks} {today} onedit={edit} bind:list={filter} />
      {:else if tab === "habits"}
        <Habits {plugin} data={$habits} {today} onopen={openHabit} oncreate={newHabit} />
      {:else if tab === "more"}
        <ul class="aio-menu">
          {#each SOON_MORE as item (item.key)}
            <li>
              <button class="aio-item" disabled>
                <Icon name={item.icon} size={22} /><span class="name">{t(item.key)}</span><span class="soon">{t("soon")}</span>
              </button>
            </li>
          {/each}
          <li>
            <button class="aio-item" onclick={() => plugin.openSettings()}>
              <Icon name="settings" size={22} /><span class="name">{t("more.settings")}</span><Icon name="chevron-right" />
            </button>
          </li>
        </ul>
      {:else}
        <div class="aio-empty">
          <Icon name="wallet" size={48} />
          <p>{t("soon.finances")}</p>
        </div>
      {/if}
    </div>
  </div>
  <button class="aio-fab" aria-label={t("add")} onclick={() => (sheet = { kind: "pick" })}>
    <Icon name="plus" size={28} />
  </button>
</div>

<div class="aio-tabbar" role="tablist">
  {#each TABS as item (item.id)}
    <button class="aio-tab" role="tab" aria-selected={tab === item.id} onclick={() => (tab = item.id)}>
      <span class="pill"><Icon name={item.icon} size={22} /></span>
      <span class="label">{t(item.key)}</span>
    </button>
  {/each}
</div>

{#if sheet}
  <Sheet {title} onclose={close}>
    {#if sheet.kind === "pick"}
      <ul class="aio-menu">
        <li>
          <button class="aio-item" onclick={() => (sheet = { kind: "task", ref: null })}>
            <Icon name="check-square" size={22} /><span class="name">{t("type.task")}</span><Icon name="chevron-right" />
          </button>
        </li>
        <li>
          <button class="aio-item" onclick={newHabit}>
            <Icon name="repeat" size={22} /><span class="name">{t("type.habit")}</span><Icon name="chevron-right" />
          </button>
        </li>
        {#each SOON_TYPES as item (item.key)}
          <li>
            <button class="aio-item" disabled>
              <Icon name={item.icon} size={22} /><span class="name">{t(item.key)}</span><span class="soon">{t("soon")}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else if sheet.kind === "habit"}
      <HabitForm {plugin} habits={$habits.habits} habit={sheet.habit} onclose={close} />
    {:else if sheet.kind === "detail"}
      {@const { name, date } = sheet}
      {@const habit = $habits.habits.find((h) => h.name === name)}
      {#if habit}
        <HabitDetail
          {plugin}
          {habit}
          log={$habits.log}
          {date}
          {today}
          onedit={() => (sheet = { kind: "habit", habit })}
          onclose={close}
        />
      {/if}
    {:else}
      <TaskForm
        {plugin}
        doc={$tasks}
        {today}
        ref={sheet.ref}
        defaultList={tab === "tasks" ? (filter ?? "") : ""}
        onclose={close}
      />
    {/if}
  </Sheet>
{/if}

<style>
  .aio-main {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  .aio-page {
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .aio-col {
    max-width: 560px;
    margin: 0 auto;
    padding-bottom: 96px; /* room for the FAB over the last row */
  }
  .aio-fab {
    position: absolute;
    bottom: var(--size-4-4);
    right: max(var(--size-4-4), calc(50% - 280px + var(--size-4-4)));
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-l);
    color: var(--text-on-accent);
    transition: transform 0.1s;
  }
  .aio-fab,
  .aio-fab:hover {
    background: var(--interactive-accent);
  }
  .aio-fab:active {
    background: var(--interactive-accent-hover);
    transform: scale(0.94);
  }
  .aio-tabbar {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    background: var(--background-secondary);
    border-top: 1px solid var(--background-modifier-border);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .aio-tab {
    flex: 1;
    max-width: 112px;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--text-muted);
    font-size: var(--font-ui-small);
  }
  .pill {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 30px;
    border-radius: 15px;
  }
  .aio-tab:active .pill {
    background: var(--background-modifier-hover);
  }
  .aio-tab[aria-selected="true"] {
    color: var(--interactive-accent);
    font-weight: 600;
  }
  .aio-tab[aria-selected="true"] .pill {
    background: color-mix(in srgb, var(--interactive-accent) 18%, transparent);
  }
  .aio-menu {
    list-style: none;
    margin: 0;
    padding: var(--size-4-2) 0;
  }
  .aio-col .aio-menu {
    padding: var(--size-4-4);
  }
  .aio-item {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    width: 100%;
    min-height: 52px;
    padding: 0 var(--size-4-3);
    border-radius: var(--radius-m);
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
  }
  .aio-item:active:not(:disabled) {
    background: var(--background-modifier-hover);
  }
  .aio-item:disabled {
    color: var(--text-faint);
    opacity: 1;
  }
  .name {
    flex: 1;
    text-align: left;
  }
  .soon {
    font-size: var(--font-ui-small);
    color: var(--text-faint);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    padding: 1px var(--size-4-2);
  }
  @media (prefers-reduced-motion: reduce) {
    .aio-fab {
      transition: none;
    }
  }
</style>
