<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Doc, TaskRef } from "../types";
  import { type Key, t } from "../i18n";
  import { bucketOf, listNames } from "../tasks/parse";
  import { addDays, fmtDate, refs } from "./util";
  import Icon from "./Icon.svelte";
  import TaskRow from "./TaskRow.svelte";

  type Segment = "today" | "upcoming" | "nodate" | "done";

  let {
    plugin,
    doc,
    today,
    onedit,
    list = $bindable(null),
  }: {
    plugin: AllInOnePlugin;
    doc: Doc;
    today: string;
    onedit: (ref: TaskRef) => void;
    list?: string | null;
  } = $props();

  const SEGMENTS: [Segment, Key][] = [
    ["today", "when.today"],
    ["upcoming", "tasks.upcoming"],
    ["nodate", "tasks.nodate"],
    ["done", "tasks.done"],
  ];
  let seg = $state<Segment>("today");

  const names = $derived(listNames(doc).filter(Boolean));
  // Drop a filter whose list no longer exists (its chip would be gone).
  $effect(() => {
    if (list !== null && !names.includes(list)) list = null;
  });

  const overdue = $derived(
    seg === "today" ? refs(doc, list, (x) => !x.done && bucketOf(x, today) === "overdue") : [],
  );
  const rows = $derived(refs(doc, list, (x) => (seg === "done" ? x.done : !x.done && bucketOf(x, today) === seg)));
  // Upcoming grouped by due date (rows are priority-sorted, so group with a map, then order the dates).
  const groups = $derived.by(() => {
    const byDate = new Map<string, TaskRef[]>();
    if (seg === "upcoming") for (const r of rows) byDate.set(r.task.due!, [...(byDate.get(r.task.due!) ?? []), r]);
    return [...byDate].sort(([a], [b]) => (a < b ? -1 : 1));
  });
  const dayLabel = (iso: string) =>
    iso === addDays(today, 1) ? t("when.tomorrow") : fmtDate(iso, { weekday: "long", day: "numeric", month: "short" });
</script>

<div class="aio-tasks-top">
  <div class="aio-seg" role="tablist" aria-label={t("tasks.view")}>
    {#each SEGMENTS as [id, key] (id)}
      <button role="tab" aria-selected={seg === id} onclick={() => (seg = id)}>{t(key)}</button>
    {/each}
  </div>
  {#if names.length}
    <div class="aio-chips" role="group" aria-label={t("tasks.lists")}>
      <button class="aio-chip" aria-pressed={list === null} onclick={() => (list = null)}>{t("tasks.all")}</button>
      {#each names as name (name)}
        <button class="aio-chip" aria-pressed={list === name} onclick={() => (list = name)}>{name}</button>
      {/each}
    </div>
  {/if}
</div>

{#if !overdue.length && !rows.length}
  <div class="aio-empty"><Icon name="check-square" size={48} /><p>{t("tasks.empty")}</p></div>
{:else if seg === "upcoming"}
  {#each groups as [date, items] (date)}
    <h2 class="aio-section">{dayLabel(date)}</h2>
    {#each items as ref (ref.index)}<TaskRow {plugin} {ref} {today} {onedit} />{/each}
  {/each}
{:else}
  {#if overdue.length}
    <h2 class="aio-section aio-error">{t("today.overdue")}</h2>
    {#each overdue as ref (ref.index)}<TaskRow {plugin} {ref} {today} {onedit} />{/each}
    {#if rows.length}<h2 class="aio-section">{t("when.today")}</h2>{/if}
  {/if}
  {#each rows as ref (ref.index)}<TaskRow {plugin} {ref} {today} {onedit} />{/each}
{/if}

<style>
  .aio-tasks-top {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-3);
    padding: var(--size-4-4) var(--size-4-4) var(--size-4-1);
  }
</style>
