<script lang="ts">
  import type { DatesDoc, Person, SpecialDate } from "../people/types";
  import { type Key, t } from "../i18n";
  import { datesOf, daysBetween, nextOccurrence } from "../people/parse";
  import { fmtDate } from "./util";
  import { whenText } from "./people";
  import Icon from "./Icon.svelte";

  let {
    people,
    dates,
    today,
    onperson,
    onnewperson,
    ondate,
    onback,
  }: {
    people: Person[];
    dates: DatesDoc;
    today: string;
    onperson: (name: string) => void;
    onnewperson: () => void;
    ondate: (date: SpecialDate | null) => void;
    onback: () => void;
  } = $props();

  type Segment = "people" | "dates";
  const SEGMENTS: [Segment, Key][] = [
    ["people", "people.people"],
    ["dates", "people.dates"],
  ];
  let seg = $state<Segment>("people");

  const upcoming = (day: string) => {
    const next = nextOccurrence(day, today);
    return { next, left: daysBetween(today, next) };
  };
  // By next birthday; people without one last (the store already sorts by name, and sort is stable).
  const personRows = $derived(
    people
      .map((p) => {
        if (!p.birthday) return { p, next: "", left: Infinity, turning: null };
        const { next, left } = upcoming(p.birthday);
        const turning = p.birthday.length === 10 ? Number(next.slice(0, 4)) - Number(p.birthday.slice(0, 4)) : null;
        return { p, next, left, turning };
      })
      .sort((a, b) => (a.left === b.left ? 0 : a.left - b.left)), // Infinity - Infinity would be NaN
  );
  const dateRows = $derived(
    datesOf(dates)
      .map((d) => ({ d, ...upcoming(d.day) }))
      .sort((a, b) => a.left - b.left),
  );
  const short = (iso: string) => fmtDate(iso, { day: "numeric", month: "short" });
</script>

<header class="aio-head">
  <button class="icon-btn" aria-label={t("agenda.back")} onclick={onback}><Icon name="chevron-left" size={24} /></button>
  <h1>{t("more.people")}</h1>
</header>
<div class="top">
  <div class="aio-seg" role="tablist" aria-label={t("people.view")}>
    {#each SEGMENTS as [id, key] (id)}
      <button role="tab" aria-selected={seg === id} onclick={() => (seg = id)}>{t(key)}</button>
    {/each}
  </div>
</div>

{#if seg === "people"}
  {#if !people.length}
    <div class="aio-empty">
      <Icon name="users" size={48} />
      <p>{t("people.empty")}</p>
      <button class="mod-cta new" onclick={onnewperson}>{t("people.new")}</button>
    </div>
  {:else}
    {#each personRows as { p, next, left, turning } (p.name)}
      <button class="row" onclick={() => onperson(p.name)}>
        <span class="body">
          <span class="name">{p.name}</span>
          {#if p.relation}<span class="meta">{p.relation}</span>{/if}
        </span>
        {#if next}
          <span class="when">
            <span class="day">{short(next)}</span>
            <span class="meta">
              {whenText(left)}{#if turning !== null && turning > 0}{` · ${t("people.turns", { n: turning })}`}{/if}
            </span>
          </span>
        {/if}
      </button>
    {/each}
    <button class="row add" onclick={onnewperson}><Icon name="plus" size={20} />{t("people.add")}</button>
  {/if}
{:else if !dateRows.length}
  <div class="aio-empty">
    <Icon name="gift" size={48} />
    <p>{t("dates.empty")}</p>
    <button class="mod-cta new" onclick={() => ondate(null)}>{t("dates.new")}</button>
  </div>
{:else}
  {#each dateRows as { d, next, left } (d.name)}
    <button class="row" onclick={() => ondate(d)}>
      <span class="body">
        <span class="name">{d.name}</span>
        {#if d.people.length}<span class="meta">{d.people.join(", ")}</span>{/if}
      </span>
      <span class="when">
        <span class="day">{short(next)}</span>
        <span class="meta">{whenText(left)}</span>
      </span>
    </button>
  {/each}
  <button class="row add" onclick={() => ondate(null)}><Icon name="plus" size={20} />{t("dates.add")}</button>
{/if}

<style>
  .aio-head {
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
  .top {
    padding: var(--size-4-3) var(--size-4-4) var(--size-4-2);
  }
  .new {
    min-height: 48px;
    padding: 0 var(--size-4-6);
    font-size: var(--font-ui-medium);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    width: 100%;
    min-height: 56px;
    padding: var(--size-4-2) var(--size-4-4);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .row:active {
    background: var(--background-modifier-hover);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }
  .name {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .when {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .day {
    font-size: var(--font-ui-medium);
    font-variant-numeric: tabular-nums;
    color: var(--text-normal);
  }
  .add {
    gap: var(--size-4-2);
    color: var(--interactive-accent);
    font-size: var(--font-ui-medium);
    border-bottom: none;
  }
</style>
