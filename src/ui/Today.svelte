<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Doc, TaskRef } from "../types";
  import { t } from "../i18n";
  import { bucketOf } from "../tasks/parse";
  import { fmtDate, refs } from "./util";
  import Icon from "./Icon.svelte";
  import TaskRow from "./TaskRow.svelte";

  let {
    plugin,
    doc,
    today,
    onedit,
  }: { plugin: AllInOnePlugin; doc: Doc; today: string; onedit: (ref: TaskRef) => void } = $props();

  const overdue = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "overdue"));
  const due = $derived(refs(doc, null, (x) => !x.done && bucketOf(x, today) === "today"));
  const done = $derived(refs(doc, null, (x) => x.done && x.doneDate === today));
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
{#if !overdue.length && !due.length}
  <div class="aio-empty"><Icon name="sun" size={48} /><p>{t("today.empty")}</p></div>
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
</style>
