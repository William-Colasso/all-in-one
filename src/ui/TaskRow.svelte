<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { TaskRef } from "../types";
  import { t } from "../i18n";
  import { todayISO, toggleTask } from "../tasks/parse";
  import { addDays, fmtDate, onRef, save } from "./util";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    ref,
    today,
    onedit,
  }: { plugin: AllInOnePlugin; ref: TaskRef; today: string; onedit: (ref: TaskRef) => void } = $props();

  const task = $derived(ref.task);
  const overdue = $derived(!task.done && !!task.due && task.due < today);
  const dueLabel = $derived(
    !task.due
      ? ""
      : task.due === today
        ? t("when.today")
        : task.due === addDays(today, 1)
          ? t("when.tomorrow")
          : fmtDate(task.due, { day: "numeric", month: "short" }),
  );
  const toggle = () => save(plugin, onRef(ref, (d) => toggleTask(d, ref.index, todayISO())));
</script>

<div class="aio-row" class:done={task.done}>
  <button class="aio-check" role="checkbox" aria-checked={task.done} aria-label={task.text} onclick={toggle}>
    <span class="box">{#if task.done}<Icon name="check" size={16} />{/if}</span>
  </button>
  <button class="aio-body" onclick={() => onedit(ref)}>
    <span class="text">{task.text}</span>
    {#if task.due || task.priority || task.recurrence || ref.list}
      <span class="meta">
        {#if task.due}
          <span class="item" class:overdue><Icon name="calendar" size={13} />{dueLabel}</span>
        {/if}
        {#if task.priority}
          <span class="item prio-{task.priority}"><Icon name="flag" size={13} label={t(`prio.${task.priority}` as const)} /></span>
        {/if}
        {#if task.recurrence}
          <span class="item"><Icon name="repeat" size={13} label={t(`rec.${task.recurrence}` as const)} /></span>
        {/if}
        {#if ref.list}
          <span class="item"><Icon name="list" size={13} />{ref.list}</span>
        {/if}
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
  .aio-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    min-height: 52px;
    flex-shrink: 0;
  }
  .box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--text-faint);
    color: var(--text-on-accent);
    transition: transform 0.1s;
  }
  .aio-check:active .box {
    transform: scale(0.85);
  }
  .done .box {
    background: var(--interactive-accent);
    border-color: var(--interactive-accent);
  }
  .aio-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
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
  .done .text {
    text-decoration: line-through;
    color: var(--text-faint);
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
  .overdue,
  .prio-high {
    color: var(--text-error);
  }
  .prio-medium {
    color: var(--interactive-accent);
  }
  @media (prefers-reduced-motion: reduce) {
    .box {
      transition: none;
    }
  }
</style>
