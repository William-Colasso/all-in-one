<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Habit, Log } from "../habits/types";
  import { t } from "../i18n";
  import { isDone, streak, weekCount, weekOf } from "../habits/parse";
  import { amountText, attempt, dayState, streakText, tapValue } from "./habits";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    habit,
    log,
    date,
    today,
    compact = false,
    onopen,
  }: {
    plugin: AllInOnePlugin;
    habit: Habit;
    log: Log;
    date: string;
    today: string;
    compact?: boolean;
    onopen: () => void;
  } = $props();

  // Optimistic value while writes are in flight, so quick repeated taps all count.
  let pending = $state<number | null>(null);
  let inflight = 0;
  const value = $derived(pending ?? log[date]?.[habit.name] ?? 0);
  const done = $derived(isDone(habit, value));
  const numeric = $derived(habit.goal > 1);
  const runs = $derived(streak(habit, log, today));
  const week = $derived(weekOf(today).map((d) => dayState(habit, log, d, today)));
  const label = $derived(
    t("habit.check", { name: habit.name, state: numeric ? amountText(habit, value) : t(done ? "habit.done" : "habit.notDone") }),
  );

  async function tap() {
    const next = tapValue(habit, value);
    pending = next;
    inflight++;
    await attempt(() => plugin.habits.setValue(date, habit.name, next));
    if (--inflight === 0) pending = null;
  }
</script>

<div class="aio-row" class:done>
  <button class="aio-hcheck" aria-label={label} aria-pressed={numeric ? undefined : done} onclick={tap}>
    <span class="face">
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle class="track" cx="18" cy="18" r="16" />
        {#if numeric && !done && value > 0}
          <circle class="ring" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="{(value / habit.goal) * 100} 100" />
        {/if}
      </svg>
      {#if done}<Icon name="check" size={20} />{/if}
    </span>
  </button>
  <button class="aio-body" onclick={onopen}>
    <span class="text">{habit.name}</span>
    {#if numeric || runs >= 2 || habit.perWeek}
      <span class="meta">
        {#if numeric}<span>{amountText(habit, value)}</span>{/if}
        {#if runs >= 2}
          <span class="item streak"><Icon name="flame" size={13} />{streakText(habit, runs)}</span>
        {/if}
        {#if habit.perWeek}
          <span class="item"><Icon name="repeat" size={13} />{t("habit.thisWeek", { done: weekCount(habit, log, date), goal: habit.perWeek })}</span>
        {/if}
      </span>
    {/if}
    {#if !compact}
      <span class="dots" aria-hidden="true">
        {#each week as state, i (i)}<span class="dot {state}"></span>{/each}
      </span>
    {/if}
  </button>
</div>

<style>
  .aio-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .aio-hcheck {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    min-height: 60px;
    flex-shrink: 0;
  }
  .face {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    color: var(--text-on-accent);
    transition: transform 0.1s;
  }
  .aio-hcheck:active .face {
    transform: scale(0.85);
  }
  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }
  circle {
    fill: none;
    stroke-width: 2.5;
  }
  .track {
    stroke: var(--text-faint);
  }
  .ring {
    stroke: var(--interactive-accent);
    stroke-linecap: round;
    transition: stroke-dasharray 0.2s;
  }
  .done .track {
    fill: var(--interactive-accent);
    stroke: var(--interactive-accent);
  }
  .aio-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    padding: var(--size-4-2) var(--size-4-3) var(--size-4-2) 0;
    text-align: left;
  }
  .aio-body:active {
    background: var(--background-modifier-hover);
  }
  .text {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow-wrap: anywhere;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-1) var(--size-4-3);
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .streak {
    color: var(--interactive-accent);
  }
  .dots {
    display: flex;
    gap: 5px;
    margin-top: 2px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-sizing: border-box;
  }
  .dot.done {
    background: var(--interactive-accent);
  }
  .dot.partial {
    background: color-mix(in srgb, var(--interactive-accent) 40%, transparent);
  }
  .dot.missed {
    background: var(--background-modifier-border);
  }
  .dot.off {
    border: 1px dashed var(--background-modifier-border);
  }
  .dot.future {
    border: 1px solid var(--background-modifier-border);
  }
  @media (prefers-reduced-motion: reduce) {
    .face,
    .ring {
      transition: none;
    }
  }
</style>
