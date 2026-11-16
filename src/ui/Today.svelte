<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Doc, TaskRef } from "../types";
  import type { HabitState } from "../habits/types";
  import type { FinanceState } from "../finance/types";
  import { t } from "../i18n";
  import { bucketOf } from "../tasks/parse";
  import { isDone, isScheduled } from "../habits/parse";
  import { fmtDate, refs } from "./util";
  import { dueSoon } from "./finance";
  import BillRow from "./BillRow.svelte";
  import HabitRow from "./HabitRow.svelte";
  import Icon from "./Icon.svelte";
  import TaskRow from "./TaskRow.svelte";

  let {
    plugin,
    doc,
    habits,
    finance,
    today,
    onedit,
    onhabit,
  }: {
    plugin: AllInOnePlugin;
    doc: Doc;
    habits: HabitState;
    finance: FinanceState;
    today: string;
    onedit: (ref: TaskRef) => void;
    onhabit: (name: string, date: string) => void;
  } = $props();

  const overdue = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "overdue"));
  const due = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "today"));
  const done = $derived(refs(doc, null, (x) => x.done && x.doneDate === today));
  const scheduled = $derived(habits.habits.filter((h) => isScheduled(h, today)));
  const habitsDone = $derived(scheduled.filter((h) => isDone(h, habits.log[today]?.[h.name])).length);
  const bills = $derived(dueSoon(finance, today));
</script>

<header class="aio-today-head">
  <div class="weekday">{fmtDate(today, { weekday: "long" })}</div>
  <h1>{fmtDate(today, { day: "numeric", month: "long" })}</h1>
</header>

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
{#if !overdue.length && !due.length && !bills.length && habitsDone === scheduled.length}
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
    text-transform: capitalize;
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
