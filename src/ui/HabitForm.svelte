<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Habit } from "../habits/types";
  import { type Key, t } from "../i18n";
  import { addHabit, cleanName, newHabit, weekOf } from "../habits/parse";
  import { todayISO } from "../tasks/parse";
  import { fmtDate } from "./util";
  import { attempt } from "./habits";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    habits,
    habit,
    onclose,
  }: { plugin: AllInOnePlugin; habits: Habit[]; habit: Habit | null; onclose: () => void } = $props();

  type Freq = "daily" | "days" | "week";
  const FREQS: [Freq, Key][] = [
    ["daily", "habit.everyDay"],
    ["days", "habit.specificDays"],
    ["week", "habit.perWeek"],
  ];
  // Mon..Sun chips: weekday number (0 = Sunday) and a date of this week for the localized label.
  const WEEK = weekOf(todayISO()).map((iso, i) => ({ day: (i + 1) % 7, iso }));

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => habit);
  const uid = $props.id();

  let name = $state(init?.name ?? "");
  let amount = $state(!!init && init.goal > 1);
  let goal = $state<number | null>(init && init.goal > 1 ? init.goal : null);
  let unit = $state(init?.unit ?? "");
  let freq = $state<Freq>(init?.days ? "days" : init?.perWeek ? "week" : "daily");
  let days = $state<number[]>(init?.days ?? []);
  let perWeek = $state(init?.perWeek ?? 3);
  let busy = $state(false);

  const clean = $derived(cleanName(name));
  const taken = $derived(habits.some((h) => h.name === clean && h.name !== init?.name));
  const noDays = $derived(freq === "days" && !days.length);
  const valid = $derived(!!clean && !taken && !noDays && (!amount || (goal ?? 0) > 0));

  const toggleDay = (d: number) =>
    (days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const h = newHabit(clean, {
      goal: amount ? goal! : 1,
      unit: amount ? cleanName(unit) : "",
      days: freq === "days" ? days : null,
      perWeek: freq === "week" ? perWeek : null,
    });
    busy = true;
    const ok = await attempt(() =>
      init ? plugin.habits.update(init.name, h) : plugin.habits.mutateHabits((d) => addHabit(d, h)),
    );
    busy = false;
    if (ok) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-name">{t("habit.name")}</label>
  <input
    id="{uid}-name"
    type="text"
    class="aio-input"
    bind:value={name}
    placeholder={t("habit.placeholder")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={taken}
    aria-describedby={taken ? `${uid}-taken` : undefined}
    {@attach (el) => {
      if (!init) el.focus();
    }}
  />
  {#if taken}<p class="msg error" id="{uid}-taken">{t("habit.nameTaken")}</p>{/if}

  <span class="label" id="{uid}-type">{t("habit.type")}</span>
  <div class="aio-seg" role="group" aria-labelledby="{uid}-type">
    <button type="button" aria-pressed={!amount} onclick={() => (amount = false)}>{t("habit.yesNo")}</button>
    <button type="button" aria-pressed={amount} onclick={() => (amount = true)}>{t("habit.amount")}</button>
  </div>
  {#if amount}
    <div class="pair">
      <div class="field">
        <label class="label" for="{uid}-goal">{t("habit.goal")}</label>
        <input id="{uid}-goal" type="number" inputmode="decimal" min="1" class="aio-input" bind:value={goal} placeholder="8" />
      </div>
      <div class="field">
        <label class="label" for="{uid}-unit">{t("habit.unit")}</label>
        <input
          id="{uid}-unit"
          type="text"
          class="aio-input"
          bind:value={unit}
          placeholder={t("habit.unitPlaceholder")}
          autocomplete="off"
          enterkeyhint="done"
        />
      </div>
    </div>
  {/if}

  <span class="label" id="{uid}-freq">{t("habit.frequency")}</span>
  <div class="aio-seg" role="group" aria-labelledby="{uid}-freq">
    {#each FREQS as [value, key] (value)}
      <button type="button" aria-pressed={freq === value} onclick={() => (freq = value)}>{t(key)}</button>
    {/each}
  </div>
  {#if freq === "days"}
    <div class="weekdays" role="group" aria-labelledby="{uid}-freq">
      {#each WEEK as { day, iso } (day)}
        <button
          type="button"
          class="aio-chip"
          aria-pressed={days.includes(day)}
          aria-label={fmtDate(iso, { weekday: "long" })}
          onclick={() => toggleDay(day)}>{fmtDate(iso, { weekday: "narrow" })}</button
        >
      {/each}
    </div>
    {#if noDays}<p class="msg">{t("habit.pickDay")}</p>{/if}
  {:else if freq === "week"}
    <div class="times">
      <button type="button" class="step" aria-label={t("habit.less")} disabled={perWeek <= 1} onclick={() => perWeek--}>
        <Icon name="minus" size={20} />
      </button>
      <span class="count" aria-live="polite">{perWeek}</span>
      <button type="button" class="step" aria-label={t("habit.more")} disabled={perWeek >= 7} onclick={() => perWeek++}>
        <Icon name="plus" size={20} />
      </button>
    </div>
  {/if}

  <div class="actions">
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
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .msg.error {
    color: var(--text-error);
  }
  .pair {
    display: flex;
    gap: var(--size-4-2);
  }
  .field {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
  }
  .weekdays {
    display: flex;
    gap: 2px; /* keeps each chip >= 44px wide on a 360px phone */
  }
  .weekdays .aio-chip {
    flex: 1 1 0;
    min-width: 0;
    padding: 0;
  }
  .times {
    display: flex;
    align-items: center;
    gap: var(--size-4-4);
  }
  .step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
  }
  .step:active:not(:disabled) {
    background: var(--background-modifier-hover);
  }
  .count {
    min-width: 2ch;
    text-align: center;
    font-size: var(--font-ui-large);
    font-weight: 600;
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
</style>
