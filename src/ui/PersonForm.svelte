<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Person } from "../people/types";
  import { t } from "../i18n";
  import { cleanEntry, cleanName, renamePersonInDates } from "../people/parse";
  import { attempt } from "./habits";
  import { joinDay, splitDay, validYear } from "./people";
  import DayMonth from "./DayMonth.svelte";

  let {
    plugin,
    people,
    person,
    onclose,
  }: { plugin: AllInOnePlugin; people: Person[]; person: Person | null; onclose: () => void } = $props();

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => person);
  const parts = splitDay(init?.birthday ?? null);
  const uid = $props.id();

  let name = $state(init?.name ?? "");
  let relation = $state(init?.relation ?? "");
  let day = $state(parts.day);
  let month = $state(parts.month);
  let year = $state<number | null | undefined>(parts.year); // a number input binds undefined when empty
  let busy = $state(false);

  const clean = $derived(cleanName(name));
  // Case-insensitive: the name is a file name, and Android / Windows file systems ignore case.
  const taken = $derived(people.some((p) => p.name.toLowerCase() === clean.toLowerCase() && p.name !== init?.name));
  const none = $derived(day === null && month === null && year == null);
  const birthday = $derived(
    day !== null && month !== null && (year == null || validYear(year)) ? joinDay(day, month, year ?? null) : null,
  );
  const problem = $derived(
    none
      ? ""
      : year != null && !validYear(year)
        ? t("people.badYear")
        : day === null || month === null
          ? t("people.pickDay")
          : !birthday
            ? t("people.badDay")
            : "",
  );
  const valid = $derived(!!clean && !taken && !problem);

  const clear = () => ((day = null), (month = null), (year = null));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const p: Person = {
      likes: [],
      sizes: [],
      ideas: [],
      given: [],
      ...init,
      name: clean,
      relation: cleanEntry(relation),
      birthday: none ? null : birthday,
    };
    const old = init?.name;
    busy = true;
    const ok = await attempt(async () => {
      await plugin.people.save(p, old);
      if (old && old !== clean) await plugin.dates.mutate((d) => renamePersonInDates(d, old, clean));
    });
    busy = false;
    if (ok) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-name">{t("fin.name")}</label>
  <input
    id="{uid}-name"
    type="text"
    class="aio-input"
    bind:value={name}
    placeholder={t("people.namePlaceholder")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={taken}
    aria-describedby={taken ? `${uid}-taken` : undefined}
    {@attach (el) => {
      if (!init) el.focus();
    }}
  />
  {#if taken}<p class="msg error" id="{uid}-taken">{t("people.nameTaken")}</p>{/if}

  <label class="label" for="{uid}-rel">{t("people.relation")}</label>
  <input
    id="{uid}-rel"
    type="text"
    class="aio-input"
    bind:value={relation}
    placeholder={t("people.relationPlaceholder")}
    autocomplete="off"
    enterkeyhint="done"
  />

  <span class="label" id="{uid}-bday">{t("people.birthday")}</span>
  <div class="row" role="group" aria-labelledby="{uid}-bday" aria-describedby={problem ? `${uid}-problem` : undefined}>
    <DayMonth bind:day bind:month />
    <input
      type="number"
      inputmode="numeric"
      class="aio-input year"
      bind:value={year}
      placeholder={t("people.year")}
      aria-label={t("people.year")}
    />
    <button type="button" class="aio-chip" aria-pressed={none} onclick={clear}>{t("people.noBirthday")}</button>
  </div>
  {#if problem}<p class="msg error" id="{uid}-problem">{problem}</p>{/if}

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
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-2);
  }
  .row .year {
    width: auto;
    flex: 1 1 8em;
    min-width: 0;
  }
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .msg.error {
    color: var(--text-error);
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
