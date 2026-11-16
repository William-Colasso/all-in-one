<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Doc, TaskRef } from "../types";
  import type { HabitState } from "../habits/types";
  import type { FinanceState } from "../finance/types";
  import type { AgendaDoc, EventRef } from "../agenda/types";
  import type { DatesDoc, DayEvent, Person } from "../people/types";
  import { t } from "../i18n";
  import { bucketOf } from "../tasks/parse";
  import { isDone, isScheduled } from "../habits/parse";
  import { eventsOf, occurrences } from "../agenda/parse";
  import { datesOf, reminders } from "../people/parse";
  import { fmtDate, refs } from "./util";
  import { dueSoon } from "./finance";
  import { whenText } from "./people";
  import BillRow from "./BillRow.svelte";
  import EventRow from "./EventRow.svelte";
  import HabitRow from "./HabitRow.svelte";
  import Icon from "./Icon.svelte";
  import ReminderRow from "./ReminderRow.svelte";
  import TaskRow from "./TaskRow.svelte";

  let {
    plugin,
    doc,
    habits,
    finance,
    agenda,
    people,
    dates,
    today,
    onedit,
    onhabit,
    onevent,
    onday,
  }: {
    plugin: AllInOnePlugin;
    doc: Doc;
    habits: HabitState;
    finance: FinanceState;
    agenda: AgendaDoc;
    people: Person[];
    dates: DatesDoc;
    today: string;
    onedit: (ref: TaskRef) => void;
    onhabit: (name: string, date: string) => void;
    onevent: (ref: EventRef) => void;
    onday: (event: DayEvent) => void;
  } = $props();

  const events = $derived(occurrences(eventsOf(agenda), today, today));
  const overdue = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "overdue"));
  const due = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "today"));
  const done = $derived(refs(doc, null, (x) => x.done && x.doneDate === today));
  const scheduled = $derived(habits.habits.filter((h) => isScheduled(h, today)));
  const habitsDone = $derived(scheduled.filter((h) => isDone(h, habits.log[today]?.[h.name])).length);
  const bills = $derived(dueSoon(finance, today));
  // dates re-emits when the lead-time setting changes, so this recomputes then too.
  const coming = $derived(reminders(people, datesOf(dates), today, plugin.settings.leadDays));
</script>

<header class="aio-today-head">
  <div class="weekday">{fmtDate(today, { weekday: "long" })}</div>
  <h1>{fmtDate(today, { day: "numeric", month: "long" })}</h1>
</header>

{#if events.length}
  <h2 class="aio-section">{t("more.agenda")}</h2>
  {#each events as { ref } (ref.index)}<EventRow {ref} onedit={onevent} />{/each}
{/if}
{#if coming.length}
  <h2 class="aio-section">{t("today.comingUp")}</h2>
  {#each coming as r (`${r.kind}:${r.title}:${r.date}`)}<ReminderRow event={r} when={whenText(r.daysLeft)} onopen={onday} />{/each}
{/if}
{#if overdue.length}
  <h2 class="aio-section aio-error">{t("today.overdue")}</h2>
  {#each overdue as ref (ref.index)}<TaskRow {plugin} {ref} {today} {onedit} />{/each}
{/if}
{#if due.length}
  <h2 class="aio-section">{t("when.today")}</h2>
  {#each due as ref (ref.index)}<TaskRow {plugin} {ref} {today} {onedit} />{/each}
{/if}
{#if bills.length}
  <h2 class="aio-section">{t("fin.toSettle")}</h2>
  {#each bills as p (p.bill.name)}<BillRow {plugin} bill={p.bill} due={p.due} {today} />{/each}
{/if}
{#if !events.length && !coming.some((r) => r.daysLeft === 0) && !overdue.length && !due.length && !bills.length && habitsDone === scheduled.length}
  <div class="aio-empty"><Icon name="sun" size={48} /><p>{t("today.empty")}</p></div>
{/if}
{#if scheduled.length}
  <h2 class="aio-section count-head"><span>{t("tab.habits")}</span><span>{habitsDone} / {scheduled.length}</span></h2>
  {#each scheduled as habit (habit.name)}
    <HabitRow {plugin} {habit} log={habits.log} date={today} {today} compact onopen={() => onhabit(habit.name, today)} />
  {/each}
{/if}
{#if done.length}
  <h2 class="aio-section">{t("today.done")}</h2>
  {#each done as ref (ref.index)}<TaskRow {plugin} {ref} {today} {onedit} />{/each}
{/if}

<style>
  .aio-today-head {
    padding: var(--size-4-6) var(--size-4-4) var(--size-4-2);
  }
  /* Intl gives lowercase names in Portuguese; capitalize just the first letter ("Segunda-feira", "16 de novembro"). */
  .weekday::first-letter,
  h1::first-letter {
    text-transform: uppercase;
  }
  .weekday {
    color: var(--interactive-accent);
    font-size: var(--font-ui-medium);
    font-weight: 600;
  }
  h1 {
    margin: 0;
    font-size: 1.75em;
    font-weight: 700;
    color: var(--text-normal);
  }
  .count-head {
    display: flex;
    justify-content: space-between;
  }
</style>
