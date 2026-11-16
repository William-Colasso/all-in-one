<script lang="ts">
  import { untrack } from "svelte";
  import { Notice } from "obsidian";
  import type AllInOnePlugin from "../main";
  import type { AgendaEvent, EventRef, Repeat } from "../agenda/types";
  import { type Key, t } from "../i18n";
  import { addEvent, cleanTitle, removeEventAt, updateEventAt } from "../agenda/parse";
  import { addDays } from "./util";
  import { attempt } from "./habits";
  import { nextHour, onEvent } from "./agenda";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    today,
    ref,
    onclose,
  }: { plugin: AllInOnePlugin; today: string; ref: EventRef | null; onclose: () => void } = $props();

  const REPEATS: [Repeat, Key][] = [
    [null, "rec.none"],
    ["daily", "rec.daily"],
    ["weekly", "rec.weekly"],
    ["monthly", "rec.monthly"],
    ["yearly", "rec.yearly"],
  ];

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => ref);
  const next = nextHour();
  const uid = $props.id();
  const tomorrow = $derived(addDays(today, 1));

  let title = $state(init?.event.title ?? "");
  let date = $state(init?.event.date ?? untrack(() => (next.date > today ? next.date : today)));
  let allDay = $state(!!init && init.event.time === null);
  let time = $state(init?.event.time ?? next.time);
  let repeat = $state<Repeat>(init?.event.repeat ?? null);
  let busy = $state(false);
  let confirming = $state(false);

  const clean = $derived(cleanTitle(title));
  const valid = $derived(!!clean && !!date && (allDay || !!time));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const event: AgendaEvent = { date, time: allDay ? null : time, title: clean, repeat };
    const r = init;
    busy = true;
    const ok = await attempt(() =>
      plugin.agenda.mutate(r ? onEvent(r, (d) => updateEventAt(d, r.index, event)) : (d) => addEvent(d, event)),
    );
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    const r = init!;
    if (!confirming) return void (confirming = true);
    if (await attempt(() => plugin.agenda.mutate(onEvent(r, (d) => removeEventAt(d, r.index))))) onclose();
  }

  async function exportIcs() {
    let path = "";
    if (await attempt(async () => (path = await plugin.exportIcs(init!.event)))) new Notice(t("agenda.saved", { path }));
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-title">{t("agenda.title")}</label>
  <input
    id="{uid}-title"
    type="text"
    class="aio-input"
    bind:value={title}
    placeholder={t("agenda.placeholder")}
    autocomplete="off"
    enterkeyhint="done"
    {@attach (el) => {
      if (!init) el.focus();
    }}
  />

  <label class="label" for="{uid}-date">{t("fin.date")}</label>
  <div class="row">
    <input id="{uid}-date" type="date" class="aio-input" bind:value={date} />
    <button type="button" class="aio-chip" aria-pressed={date === today} onclick={() => (date = today)}>{t("when.today")}</button>
    <button type="button" class="aio-chip" aria-pressed={date === tomorrow} onclick={() => (date = tomorrow)}>{t("when.tomorrow")}</button>
  </div>

  <label class="label" for="{uid}-time">{t("agenda.time")}</label>
  <div class="row">
    {#if !allDay}<input id="{uid}-time" type="time" class="aio-input" bind:value={time} />{/if}
    <button type="button" class="aio-chip" aria-pressed={allDay} onclick={() => (allDay = !allDay)}>{t("agenda.allDay")}</button>
  </div>

  <span class="label" id="{uid}-rep">{t("form.recurrence")}</span>
  <!-- ponytail: five segments don't fit 360px (esp. pt-BR), so a scrollable chip row. -->
  <div class="aio-chips" role="group" aria-labelledby="{uid}-rep">
    {#each REPEATS as [value, key] (key)}
      <button type="button" class="aio-chip" aria-pressed={repeat === value} onclick={() => (repeat = value)}>{t(key)}</button>
    {/each}
  </div>
  {#if init?.event.repeat}<p class="msg">{t("agenda.series")}</p>{/if}

  <div class="actions">
    <button type="submit" class="mod-cta save" disabled={!valid || busy}>{t("form.save")}</button>
  </div>

  {#if init}
    <div class="more">
      <button type="button" class="link" onclick={() => plugin.openInCalendar(init.event)}>
        <Icon name="calendar-plus" size={20} /><span>{t("agenda.google")}</span><Icon name="external-link" size={16} />
      </button>
      <button type="button" class="link" onclick={exportIcs}>
        <Icon name="download" size={20} /><span>{t("agenda.ics")}</span>
      </button>
      <button type="button" class="link delete" class:confirming onclick={remove}>
        <Icon name="trash-2" size={20} /><span>{confirming ? t("form.confirmDelete") : t("form.delete")}</span>
      </button>
    </div>
  {/if}
</form>

<style>
  .aio-form {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
  }
  .label {
    margin-top: var(--size-4-2);
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
  }
  .aio-input {
    width: 100%;
    min-height: 44px;
    font-size: var(--font-ui-medium);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-2);
  }
  .row .aio-input {
    width: auto;
    flex: 1 1 140px;
  }
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .actions {
    display: flex;
    margin-top: var(--size-4-4);
  }
  .save {
    flex: 1;
    min-height: 48px;
    font-size: var(--font-ui-medium);
  }
  .more {
    display: flex;
    flex-direction: column;
    margin-top: var(--size-4-4);
    padding-top: var(--size-4-2);
    border-top: 1px solid var(--background-modifier-border);
  }
  .link {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    min-height: 48px;
    padding: 0 var(--size-4-2);
    border-radius: var(--radius-m);
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
  }
  .link span {
    flex: 1;
    text-align: left;
  }
  .link:active,
  .link.confirming {
    background: var(--background-modifier-hover);
  }
  .link.delete {
    color: var(--text-error);
  }
</style>
