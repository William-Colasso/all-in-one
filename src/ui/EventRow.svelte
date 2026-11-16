<script lang="ts">
  import type { EventRef } from "../agenda/types";
  import { t } from "../i18n";
  import { fmtDate } from "./util";
  import Icon from "./Icon.svelte";

  let {
    ref,
    date = null,
    onedit,
  }: { ref: EventRef; date?: string | null; onedit: (ref: EventRef) => void } = $props();

  const event = $derived(ref.event);
</script>

<button class="aio-event" onclick={() => onedit(ref)}>
  <span class="time">{event.time ?? t("agenda.allDay")}</span>
  <span class="body">
    <span class="title">{event.title}</span>
    {#if date}
      <span class="meta"><Icon name="calendar" size={13} />{fmtDate(date, { weekday: "short", day: "numeric", month: "short" })}</span>
    {/if}
  </span>
  {#if event.repeat}<Icon name="repeat" size={16} label={t(`rec.${event.repeat}` as const)} />{/if}
</button>

<style>
  .aio-event {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    width: 100%;
    min-height: 52px;
    padding: var(--size-4-2) var(--size-4-4);
    border-bottom: 1px solid var(--background-modifier-border);
    color: var(--text-muted);
  }
  .aio-event:active {
    background: var(--background-modifier-hover);
  }
  .time {
    flex-shrink: 0;
    min-width: 4.5em;
    font-size: var(--font-ui-small);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }
  .title {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--font-ui-small);
  }
</style>
