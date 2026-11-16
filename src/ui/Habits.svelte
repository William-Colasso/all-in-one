<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { HabitState } from "../habits/types";
  import { t } from "../i18n";
  import { isDone, isScheduled, weekOf } from "../habits/parse";
  import { fmtDate } from "./util";
  import HabitRow from "./HabitRow.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    data,
    today,
    onopen,
    oncreate,
  }: {
    plugin: AllInOnePlugin;
    data: HabitState;
    today: string;
    onopen: (name: string, date: string) => void;
    oncreate: () => void;
  } = $props();

  const week = $derived(weekOf(today));
  let selected = $derived(today); // follows today (e.g. past midnight) until a day is tapped
  const on = $derived(data.habits.filter((h) => isScheduled(h, selected)));
  const off = $derived(data.habits.filter((h) => !isScheduled(h, selected)));
  const done = $derived(on.filter((h) => isDone(h, data.log[selected]?.[h.name])).length);
</script>

<header class="aio-habits-head">
  <h1>{t("tab.habits")}</h1>
  {#if on.length}<span class="progress">{t("habits.progress", { done, total: on.length })}</span>{/if}
</header>

{#if !data.habits.length}
  <div class="aio-empty">
    <Icon name="repeat" size={48} />
    <p>{t("habits.empty")}</p>
    <button class="mod-cta new" onclick={oncreate}>{t("habit.new")}</button>
  </div>
{:else}
  <div class="week" role="group" aria-label={t("habits.week")}>
    {#each week as d (d)}
      <button
        class="day"
        class:today={d === today}
        aria-pressed={d === selected}
        aria-label={fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}
        disabled={d > today}
        onclick={() => (selected = d)}
      >
        <span class="wd">{fmtDate(d, { weekday: "narrow" })}</span>
        <span class="num">{Number(d.slice(8))}</span>
      </button>
    {/each}
  </div>

  {#each on as habit (habit.name)}
    <HabitRow {plugin} {habit} log={data.log} date={selected} {today} onopen={() => onopen(habit.name, selected)} />
  {/each}

  {#if off.length}
    <h2 class="aio-section">{t("habits.notToday")}</h2>
    {#each off as habit (habit.name)}
      <button class="off" onclick={() => onopen(habit.name, selected)}>{habit.name}</button>
    {/each}
  {/if}
{/if}

<style>
  .aio-habits-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--size-4-2);
    padding: var(--size-4-6) var(--size-4-4) var(--size-4-2);
  }
  h1 {
    margin: 0;
    font-size: 1.75em;
    font-weight: 700;
    color: var(--text-normal);
  }
  .progress {
    color: var(--interactive-accent);
    font-size: var(--font-ui-medium);
    font-weight: 600;
  }
  .new {
    min-height: 48px;
    padding: 0 var(--size-4-6);
    font-size: var(--font-ui-medium);
  }
  .week {
    display: flex;
    gap: var(--size-4-1);
    padding: 0 var(--size-4-3) var(--size-4-2);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .day {
    flex: 1;
    min-width: 0;
    min-height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: var(--radius-m);
    color: var(--text-muted);
  }
  .day:active:not(:disabled) {
    background: var(--background-modifier-hover);
  }
  .wd {
    font-size: var(--font-ui-smaller);
    text-transform: uppercase;
  }
  .num {
    font-size: var(--font-ui-medium);
    font-weight: 600;
  }
  .day.today {
    color: var(--interactive-accent);
  }
  .day[aria-pressed="true"] {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }
  .off {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 48px;
    padding: 0 var(--size-4-4);
    color: var(--text-muted);
    font-size: var(--font-ui-medium);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .off:active {
    background: var(--background-modifier-hover);
  }
</style>
