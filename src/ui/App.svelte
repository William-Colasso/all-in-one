<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { TaskRef } from "../types";
  import type { Habit } from "../habits/types";
  import type { Bill, Category, TxRef } from "../finance/types";
  import type { EventRef } from "../agenda/types";
  import type { DayEvent, Person, SpecialDate } from "../people/types";
  import type { WishRef } from "../lists/types";
  import { type Key, t } from "../i18n";
  import { todayISO } from "../tasks/parse";
  import { datesOf } from "../people/parse";
  import Agenda from "./Agenda.svelte";
  import BillForm from "./BillForm.svelte";
  import CategoryForm from "./CategoryForm.svelte";
  import DateForm from "./DateForm.svelte";
  import EventForm from "./EventForm.svelte";
  import FinanceManage from "./FinanceManage.svelte";
  import Finances from "./Finances.svelte";
  import Icon from "./Icon.svelte";
  import HabitDetail from "./HabitDetail.svelte";
  import HabitForm from "./HabitForm.svelte";
  import Habits from "./Habits.svelte";
  import ListCapture from "./ListCapture.svelte";
  import Lists from "./Lists.svelte";
  import People from "./People.svelte";
  import PersonDetail from "./PersonDetail.svelte";
  import PersonForm from "./PersonForm.svelte";
  import Sheet from "./Sheet.svelte";
  import TaskForm from "./TaskForm.svelte";
  import Tasks from "./Tasks.svelte";
  import Today from "./Today.svelte";
  import TxForm from "./TxForm.svelte";
  import WishForm from "./WishForm.svelte";

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
  type Screen = "agenda" | "people" | "lists";
  const SCREENS: (Item & { id: Screen })[] = [
    { id: "agenda", icon: "calendar", key: "more.agenda" },
    { id: "people", icon: "users", key: "more.people" },
    { id: "lists", icon: "list", key: "more.lists" },
  ];

  const tasks = $derived(plugin.tasks);
  const habits = $derived(plugin.habits);
  const finance = $derived(plugin.finance);
  const agenda = $derived(plugin.agenda);
  const people = $derived(plugin.people);
  const dates = $derived(plugin.dates);
  const lists = $derived(plugin.lists);
  const wishes = $derived(plugin.wishes);
  let tab = $state<Tab>("today");
  let screen = $state<Screen | null>(null); // the More tab shows this screen instead of its list
  let openList = $state<string | null>(null); // shopping list open in the Lists screen, the capture default
  let filter = $state<string | null>(null); // list filter of the Tasks tab, also the default list for new tasks there
  let sheet = $state.raw<
    | { kind: "pick" }
    | { kind: "task"; ref: TaskRef | null }
    | { kind: "habit"; habit: Habit | null }
    | { kind: "detail"; name: string; date: string }
    | { kind: "tx"; ref: TxRef | null }
    | { kind: "manage" }
    | { kind: "category"; category: Category | null }
    | { kind: "bill"; bill: Bill | null }
    | { kind: "event"; ref: EventRef | null }
    | { kind: "person"; name: string }
    | { kind: "personForm"; person: Person | null }
    | { kind: "date"; date: SpecialDate | null }
    | { kind: "wish"; ref: WishRef | null }
    | { kind: "listItem" }
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
  const editTx = (ref: TxRef | null) => (sheet = { kind: "tx", ref });
  const manage = () => (sheet = { kind: "manage" });
  const editEvent = (ref: EventRef | null) => (sheet = { kind: "event", ref });
  const openPerson = (name: string) => (sheet = { kind: "person", name });
  const editPerson = (person: Person | null) => (sheet = { kind: "personForm", person });
  const editDate = (date: SpecialDate | null) => (sheet = { kind: "date", date });
  const editWish = (ref: WishRef | null) => (sheet = { kind: "wish", ref });
  const close = () => (sheet = null);
  // A birthday opens the person; a special date its form.
  function openDay(e: DayEvent) {
    if (e.kind === "birthday") return openPerson(e.title);
    const date = datesOf($dates).find((d) => d.name === e.title);
    if (date) editDate(date);
  }
  const title = $derived.by(() => {
    switch (sheet?.kind) {
      case "task":
        return t(sheet.ref ? "form.edit" : "form.new");
      case "habit":
        return t(sheet.habit ? "habit.edit" : "habit.new");
      case "detail":
        return sheet.name;
      case "tx":
        return t(sheet.ref ? "fin.editTx" : "fin.newTx");
      case "manage":
        return t("fin.manage");
      case "category":
        return t(sheet.category ? "fin.editCategory" : "fin.newCategory");
      case "bill":
        return t(sheet.bill ? "fin.editBill" : "fin.newBill");
      case "event":
        return t(sheet.ref ? "agenda.edit" : "agenda.new");
      case "person":
        return sheet.name;
      case "personForm":
        return t(sheet.person ? "people.edit" : "people.new");
      case "date":
        return t(sheet.date ? "dates.edit" : "dates.new");
      case "wish":
        return t(sheet.ref ? "wish.edit" : "wish.new");
      case "listItem":
        return t("type.listItem");
      default:
        return t("add.title");
    }
  });
</script>

<div class="aio-main">
  <div class="aio-page">
    <div class="aio-col">
      {#if tab === "today"}
        <Today
          {plugin}
          doc={$tasks}
          habits={$habits}
          finance={$finance}
          agenda={$agenda}
          people={$people}
          dates={$dates}
          {today}
          onedit={edit}
          onhabit={openHabit}
          onevent={editEvent}
          onday={openDay}
        />
      {:else if tab === "tasks"}
        <Tasks {plugin} doc={$tasks} {today} onedit={edit} bind:list={filter} />
      {:else if tab === "habits"}
        <Habits {plugin} data={$habits} {today} onopen={openHabit} oncreate={newHabit} />
      {:else if tab === "finances"}
        <Finances {plugin} data={$finance} {today} onedit={editTx} oncreate={() => editTx(null)} onmanage={manage} />
      {:else if screen === "agenda"}
        <Agenda
          {plugin}
          agenda={$agenda}
          doc={$tasks}
          people={$people}
          dates={$dates}
          {today}
          onedit={editEvent}
          onedittask={edit}
          onday={openDay}
          oncreate={() => editEvent(null)}
          onback={() => (screen = null)}
        />
      {:else if screen === "people"}
        <People
          people={$people}
          dates={$dates}
          {today}
          onperson={openPerson}
          onnewperson={() => editPerson(null)}
          ondate={editDate}
          onback={() => (screen = null)}
        />
      {:else if screen === "lists"}
        <Lists {plugin} lists={$lists} wishes={$wishes} bind:open={openList} onwish={editWish} onback={() => (screen = null)} />
      {:else}
        <ul class="aio-menu">
          {#each SCREENS as item (item.id)}
            <li>
              <button class="aio-item" onclick={() => (screen = item.id)}>
                <Icon name={item.icon} size={22} /><span class="name">{t(item.key)}</span><Icon name="chevron-right" />
              </button>
            </li>
          {/each}
          <li>
            <button class="aio-item" onclick={() => plugin.openSettings()}>
              <Icon name="settings" size={22} /><span class="name">{t("more.settings")}</span><Icon name="chevron-right" />
            </button>
          </li>
        </ul>
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
        <li>
          <button class="aio-item" onclick={() => editTx(null)}>
            <Icon name="wallet" size={22} /><span class="name">{t("type.expense")}</span><Icon name="chevron-right" />
          </button>
        </li>
        <li>
          <button class="aio-item" onclick={() => editEvent(null)}>
            <Icon name="calendar" size={22} /><span class="name">{t("type.appointment")}</span><Icon name="chevron-right" />
          </button>
        </li>
        <li>
          <button class="aio-item" onclick={() => (sheet = { kind: "listItem" })}>
            <Icon name="list" size={22} /><span class="name">{t("type.listItem")}</span><Icon name="chevron-right" />
          </button>
        </li>
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
    {:else if sheet.kind === "tx"}
      <TxForm {plugin} data={$finance} {today} ref={sheet.ref} onclose={close} />
    {:else if sheet.kind === "manage"}
      <FinanceManage
        data={$finance}
        currency={plugin.settings.currency}
        oncategory={(category) => (sheet = { kind: "category", category })}
        onbill={(bill) => (sheet = { kind: "bill", bill })}
      />
    {:else if sheet.kind === "category"}
      <CategoryForm {plugin} categories={$finance.categories} category={sheet.category} onclose={manage} />
    {:else if sheet.kind === "bill"}
      <BillForm {plugin} data={$finance} bill={sheet.bill} onclose={manage} />
    {:else if sheet.kind === "event"}
      <EventForm {plugin} {today} ref={sheet.ref} onclose={close} />
    {:else if sheet.kind === "person"}
      {@const { name } = sheet}
      {@const person = $people.find((p) => p.name === name)}
      {#if person}<PersonDetail {plugin} {person} {today} onedit={editPerson} onclose={close} />{/if}
    {:else if sheet.kind === "personForm"}
      <PersonForm {plugin} people={$people} person={sheet.person} onclose={close} />
    {:else if sheet.kind === "date"}
      <DateForm {plugin} people={$people} dates={datesOf($dates)} date={sheet.date} onclose={close} />
    {:else if sheet.kind === "wish"}
      <WishForm {plugin} ref={sheet.ref} onclose={close} />
    {:else if sheet.kind === "listItem"}
      <ListCapture {plugin} lists={$lists} initial={tab === "more" && screen === "lists" ? openList : null} onclose={close} />
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
  .aio-item:active {
    background: var(--background-modifier-hover);
  }
  .name {
    flex: 1;
    text-align: left;
  }
  @media (prefers-reduced-motion: reduce) {
    .aio-fab {
      transition: none;
    }
  }
</style>
