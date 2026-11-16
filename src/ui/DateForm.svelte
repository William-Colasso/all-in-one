<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Person, SpecialDate } from "../people/types";
  import { t } from "../i18n";
  import { cleanName, removeDate, upsertDate } from "../people/parse";
  import { attempt } from "./habits";
  import { joinDay, splitDay } from "./people";
  import DayMonth from "./DayMonth.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    people,
    dates,
    date,
    onclose,
    ongift,
  }: {
    plugin: AllInOnePlugin;
    people: Person[];
    dates: SpecialDate[];
    date: SpecialDate | null;
    onclose: () => void;
    /** Opens a person's detail (where gift suggestions live) with this date as the occasion. */
    ongift?: (person: string, occasion: string) => void;
  } = $props();

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => date);
  const parts = splitDay(init?.day ?? null);
  // Existing people, plus linked names whose note is gone (so they can still be unlinked).
  const names = untrack(() => [...new Set([...people.map((p) => p.name), ...(init?.people ?? [])])]);
  const uid = $props.id();
  // Saved linked people that still have a note: each gets a "Suggest gifts" shortcut.
  const giftees = untrack(() => (init && ongift && plugin.ai.enabled ? init.people.filter((n) => people.some((p) => p.name === n)) : []));

  let name = $state(init?.name ?? "");
  let day = $state(parts.day);
  let month = $state(parts.month);
  let chosen = $state<string[]>(init?.people ?? []);
  let lead = $state<number | null | undefined>(init?.lead); // a number input binds undefined when empty
  let busy = $state(false);
  let confirming = $state(false);

  const clean = $derived(cleanName(name));
  const taken = $derived(dates.some((d) => d.name.toLowerCase() === clean.toLowerCase() && d.name !== init?.name));
  const md = $derived(day !== null && month !== null ? joinDay(day, month) : null);
  const badDay = $derived(day !== null && month !== null && !md);
  const badLead = $derived(lead != null && !(Number.isInteger(lead) && lead >= 0 && lead <= 365));
  const valid = $derived(!!clean && !taken && !!md && !badLead);

  const toggle = (n: string) => (chosen = chosen.includes(n) ? chosen.filter((x) => x !== n) : [...chosen, n]);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const next: SpecialDate = { name: clean, day: md!, people: chosen, lead: lead ?? null };
    busy = true;
    const ok = await attempt(() => plugin.dates.mutate((d) => upsertDate(d, next, init?.name)));
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    if (!confirming) return void (confirming = true);
    if (await attempt(() => plugin.dates.mutate((d) => removeDate(d, init!.name)))) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-name">{t("fin.name")}</label>
  <input
    id="{uid}-name"
    type="text"
    class="aio-input"
    bind:value={name}
    placeholder={t("dates.placeholder")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={taken}
    aria-describedby={taken ? `${uid}-taken` : undefined}
    {@attach (el) => {
      if (!init) el.focus();
    }}
  />
  {#if taken}<p class="msg error" id="{uid}-taken">{t("dates.nameTaken")}</p>{/if}

  <span class="label" id="{uid}-day">{t("fin.date")}</span>
  <div class="row" role="group" aria-labelledby="{uid}-day" aria-describedby={badDay ? `${uid}-bad` : undefined}>
    <DayMonth bind:day bind:month />
  </div>
  {#if badDay}<p class="msg error" id="{uid}-bad">{t("people.badDay")}</p>{/if}

  {#if names.length}
    <span class="label" id="{uid}-people">{t("dates.people")}</span>
    <div class="chips" role="group" aria-labelledby="{uid}-people">
      {#each names as n (n)}
        <button type="button" class="aio-chip" aria-pressed={chosen.includes(n)} onclick={() => toggle(n)}>{n}</button>
      {/each}
    </div>
  {/if}

  <label class="label" for="{uid}-lead">{t("dates.lead")}</label>
  <input
    id="{uid}-lead"
    type="number"
    inputmode="numeric"
    min="0"
    max="365"
    class="aio-input"
    bind:value={lead}
    placeholder={String(plugin.settings.leadDays)}
    aria-invalid={badLead}
    aria-describedby={badLead ? `${uid}-lead-bad` : undefined}
  />
  {#if badLead}<p class="msg error" id="{uid}-lead-bad">{t("dates.badLead")}</p>{/if}

  {#if giftees.length}
    <div class="more">
      {#each giftees as n (n)}
        <button type="button" class="link" onclick={() => ongift!(n, init!.name)}>
          <Icon name="sparkles" size={20} /><span>{t("ai.gifts.for", { name: n })}</span><Icon name="chevron-right" size={16} />
        </button>
      {/each}
    </div>
  {/if}

  <div class="actions">
    {#if init}
      <button type="button" class="delete" class:confirming onclick={remove}>
        <Icon name="trash-2" size={18} />{confirming ? t("form.confirmDelete") : t("form.delete")}
      </button>
    {/if}
    <button type="submit" class="mod-cta save" disabled={!valid || busy}>{t("form.save")}</button>
  </div>
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
    gap: var(--size-4-2);
  }
  /* People wrap instead of scrolling: there may be many, and all should be visible at once. */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-2);
  }
  .chips .aio-chip {
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .msg.error {
    color: var(--text-error);
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
  .link :global(.aio-icon:first-child) {
    color: var(--interactive-accent);
  }
  .link span {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .link:active {
    background: var(--background-modifier-hover);
  }
  .actions {
    display: flex;
    gap: var(--size-4-2);
    margin-top: var(--size-4-4);
  }
  .save {
    flex: 1;
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
