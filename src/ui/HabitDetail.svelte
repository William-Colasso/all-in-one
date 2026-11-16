<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Habit, Log } from "../habits/types";
  import { t } from "../i18n";
  import { isDone, monthGrid, rate, removeHabit, streak, weekOf } from "../habits/parse";
  import { addDays, fmtDate } from "./util";
  import { amountText, attempt, CAP, dayState, streakText } from "./habits";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    habit,
    log,
    date,
    today,
    onedit,
    onclose,
  }: {
    plugin: AllInOnePlugin;
    habit: Habit;
    log: Log;
    date: string;
    today: string;
    onedit: () => void;
    onclose: () => void;
  } = $props();

  // Same optimistic pattern as HabitRow, so quick +/- taps all count.
  let pending = $state<number | null>(null);
  let inflight = 0;
  const value = $derived(pending ?? log[date]?.[habit.name] ?? 0);
  const done = $derived(isDone(habit, value));
  const numeric = $derived(habit.goal > 1);
  const pct = $derived(Math.round(rate(habit, log, addDays(today, -29), today) * 100));
  const initials = $derived(weekOf(today).map((d) => fmtDate(d, { weekday: "narrow" })));

  let month = $derived(today.slice(0, 7)); // writable: the arrows move it
  const atCurrent = $derived(month >= today.slice(0, 7));
  const shift = (n: -1 | 1) => (month = addDays(`${month}-01`, n < 0 ? -1 : 31).slice(0, 7));

  let confirming = $state(false);

  async function set(next: number) {
    pending = next;
    inflight++;
    await attempt(() => plugin.habits.setValue(date, habit.name, next));
    if (--inflight === 0) pending = null;
  }

  async function remove() {
    if (!confirming) return void (confirming = true);
    // Only the definition goes; the log files keep the history.
    if (await attempt(() => plugin.habits.mutateHabits((d) => removeHabit(d, habit.name)))) onclose();
  }
</script>

<div class="aio-detail">
  <span class="label">{date === today ? t("when.today") : fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}</span>
  {#if numeric}
    <div class="stepper">
      <button class="step" aria-label={t("habit.less")} disabled={value <= 0} onclick={() => set(Math.max(0, value - 1))}>
        <Icon name="minus" size={20} />
      </button>
      <span class="amount" aria-live="polite">{amountText(habit, value)}</span>
      <button class="step" aria-label={t("habit.more")} disabled={value >= CAP} onclick={() => set(Math.min(CAP, value + 1))}>
        <Icon name="plus" size={20} />
      </button>
      <button class="aio-chip" aria-pressed={done} onclick={() => set(habit.goal)}>{t("habit.done")}</button>
    </div>
  {:else}
    <button class="toggle" aria-pressed={done} onclick={() => set(done ? 0 : 1)}>
      <Icon name="check" size={20} />{t("habit.done")}
    </button>
  {/if}

  <div class="stats">
    <div class="stat">
      <span class="big"><Icon name="flame" size={18} />{streakText(habit, streak(habit, log, today))}</span>
      <span class="label">{t("habit.streak")}</span>
    </div>
    <div class="stat">
      <span class="big">{pct}%</span>
      <span class="label">{t("habit.rate")}</span>
    </div>
  </div>

  <div class="month">
    <button class="nav" aria-label={t("habit.prevMonth")} onclick={() => shift(-1)}><Icon name="chevron-left" size={20} /></button>
    <span class="mname">{fmtDate(`${month}-01`, { month: "long", year: "numeric" })}</span>
    <button class="nav" aria-label={t("habit.nextMonth")} disabled={atCurrent} onclick={() => shift(1)}>
      <Icon name="chevron-right" size={20} />
    </button>
  </div>
  <!-- ponytail: heat map is visual only; the streak and rate above carry the same information as text. -->
  <div class="grid" aria-hidden="true">
    {#each initials as wd, i (i)}<span class="wd">{wd}</span>{/each}
    {#each monthGrid(month).flat() as cell, i (i)}
      {#if cell}
        <span class="cell {dayState(habit, log, cell, today)}">{Number(cell.slice(8))}</span>
      {:else}
        <span></span>
      {/if}
    {/each}
  </div>

  <div class="actions">
    <button class="delete" class:confirming onclick={remove}>
      <Icon name="trash-2" size={18} />{confirming ? t("form.confirmDelete") : t("form.delete")}
    </button>
    <button class="mod-cta edit" onclick={onedit}><Icon name="pencil" size={18} />{t("habit.editAction")}</button>
  </div>
</div>

<style>
  .aio-detail {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
  }
  .label {
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
  }
  .aio-detail > .label:first-child::first-letter {
    text-transform: uppercase;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
  }
  .step,
  .nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
  }
  .nav {
    border: none;
    color: var(--text-muted);
  }
  .step:active:not(:disabled),
  .nav:active:not(:disabled) {
    background: var(--background-modifier-hover);
  }
  .amount {
    flex: 1;
    text-align: center;
    font-size: var(--font-ui-medium);
    font-weight: 600;
  }
  .toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-4-2);
    min-height: 48px;
    border-radius: var(--radius-m);
    border: 1px solid var(--background-modifier-border);
    color: var(--text-muted);
    font-size: var(--font-ui-medium);
  }
  .toggle:active {
    background: var(--background-modifier-hover);
  }
  .toggle[aria-pressed="true"] {
    background: var(--interactive-accent);
    border-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-4-2);
    margin-top: var(--size-4-2);
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--size-4-3);
    border-radius: var(--radius-m);
    background: var(--background-secondary);
  }
  .big {
    display: inline-flex;
    align-items: center;
    gap: var(--size-4-1);
    font-size: var(--font-ui-large);
    font-weight: 700;
  }
  .stat .big :global(.aio-icon) {
    color: var(--interactive-accent);
  }
  .month {
    display: flex;
    align-items: center;
    margin-top: var(--size-4-2);
  }
  .mname {
    flex: 1;
    text-align: center;
    font-weight: 600;
  }
  .mname::first-letter {
    text-transform: uppercase;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .wd {
    text-align: center;
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    border-radius: var(--radius-s);
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
  }
  .cell.done {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }
  .cell.partial {
    background: color-mix(in srgb, var(--interactive-accent) 40%, transparent);
    color: var(--text-normal);
  }
  .cell.missed {
    background: var(--background-modifier-border);
  }
  .cell.off {
    border: 1px dashed var(--background-modifier-border);
    color: var(--text-faint);
  }
  .cell.future {
    color: var(--text-faint);
  }
  .actions {
    display: flex;
    gap: var(--size-4-2);
    margin-top: var(--size-4-4);
  }
  .edit {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-4-2);
    min-height: 48px;
    font-size: var(--font-ui-medium);
  }
  .delete {
    display: inline-flex;
    align-items: center;
    gap: var(--size-4-2);
    min-height: 48px;
    padding: 0 var(--size-4-4);
    border-radius: var(--radius-m);
    color: var(--text-error);
    border: 1px solid var(--background-modifier-border);
  }
  .delete:active,
  .delete.confirming {
    background: var(--background-modifier-hover);
    border-color: var(--text-error);
  }
</style>
