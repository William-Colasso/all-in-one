<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Doc, TaskRef } from "../types";
  import type { AgendaDoc, AgendaGroup, EventRef } from "../agenda/types";
  import type { DatesDoc, DayEvent, Person } from "../people/types";
  import { type Key, t } from "../i18n";
  import { bucketOf } from "../tasks/parse";
  import { eventsOf } from "../agenda/parse";
  import { datesOf, dayEvents } from "../people/parse";
  import { addDays, refs } from "./util";
  import { agendaGroups, DAYS, type Item } from "./agenda";
  import EventRow from "./EventRow.svelte";
  import Icon from "./Icon.svelte";
  import ReminderRow from "./ReminderRow.svelte";
  import TaskRow from "./TaskRow.svelte";

  let {
    plugin,
    agenda,
    doc,
    people,
    dates,
    today,
    onedit,
    onedittask,
    onday,
    oncreate,
    onback,
  }: {
    plugin: AllInOnePlugin;
    agenda: AgendaDoc;
    doc: Doc;
    people: Person[];
    dates: DatesDoc;
    today: string;
    onedit: (ref: EventRef) => void;
    onedittask: (ref: TaskRef) => void;
    onday: (event: DayEvent) => void;
    oncreate: () => void;
    onback: () => void;
  } = $props();

  const HEADS: Record<AgendaGroup, Key> = {
    today: "when.today",
    tomorrow: "when.tomorrow",
    week: "agenda.week",
    later: "agenda.later",
  };

  const overdue = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "overdue"));
  const groups = $derived(
    agendaGroups(
      eventsOf(agenda),
      refs(doc, null, (x) => !x.done && !!x.due),
      today,
      dayEvents(people, datesOf(dates), today, addDays(today, DAYS)),
    ),
  );
  const key = (item: Item) =>
    "day" in item
      ? `d:${item.day.kind}:${item.day.title}:${item.date}`
      : "event" in item
        ? `${item.date}:${item.event.index}`
        : `t${item.task.index}`;
</script>

<header class="aio-agenda-head">
  <button class="icon-btn" aria-label={t("agenda.back")} onclick={onback}><Icon name="chevron-left" size={24} /></button>
  <h1>{t("more.agenda")}</h1>
</header>

{#if !overdue.length && !groups.length}
  <div class="aio-empty">
    <Icon name="calendar" size={48} />
    <p>{t("agenda.empty", { n: DAYS })}</p>
    <button class="mod-cta new" onclick={oncreate}>{t("agenda.new")}</button>
  </div>
{:else}
  {#if overdue.length}
    <h2 class="aio-section aio-error">{t("today.overdue")}</h2>
    {#each overdue as ref (ref.index)}<TaskRow {plugin} {ref} {today} onedit={onedittask} />{/each}
  {/if}
  {#each groups as [group, items] (group)}
    {@const dated = group === "week" || group === "later"}
    <h2 class="aio-section">{t(HEADS[group])}</h2>
    {#each items as item (key(item))}
      {#if "day" in item}
        <ReminderRow event={item.day} date={dated ? item.date : null} onopen={onday} />
      {:else if "event" in item}
        <EventRow ref={item.event} date={dated ? item.date : null} {onedit} />
      {:else}
        <TaskRow {plugin} ref={item.task} {today} onedit={onedittask} />
      {/if}
    {/each}
  {/each}
{/if}

<style>
  .aio-agenda-head {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    padding: var(--size-4-4) var(--size-4-4) 0 var(--size-4-1);
  }
  h1 {
    margin: 0;
    font-size: 1.75em;
    font-weight: 700;
    color: var(--text-normal);
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 50%;
    color: var(--text-muted);
  }
  .icon-btn:active {
    background: var(--background-modifier-hover);
  }
  .new {
    min-height: 48px;
    padding: 0 var(--size-4-6);
    font-size: var(--font-ui-medium);
  }
</style>
