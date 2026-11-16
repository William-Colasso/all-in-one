<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Doc, Priority, Recurrence, TaskRef } from "../types";
  import { type Key, t } from "../i18n";
  import { addTask, listNames, newTask, removeTask, updateTask } from "../tasks/parse";
  import { addDays, onRef, save } from "./util";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    doc,
    today,
    ref,
    defaultList,
    onclose,
  }: {
    plugin: AllInOnePlugin;
    doc: Doc;
    today: string;
    ref: TaskRef | null;
    defaultList: string;
    onclose: () => void;
  } = $props();

  const NEW = "\0new"; // select value for "New list…"; can't collide with a heading name
  const PRIORITIES: [Priority, Key][] = [
    [null, "prio.none"],
    ["low", "prio.low"],
    ["medium", "prio.medium"],
    ["high", "prio.high"],
  ];
  const RECURRENCES: [Recurrence, Key][] = [
    [null, "rec.none"],
    ["daily", "rec.daily"],
    ["weekly", "rec.weekly"],
    ["monthly", "rec.monthly"],
  ];

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => ({ ref, list: ref ? ref.list : defaultList, names: listNames(doc).filter(Boolean) }));
  const uid = $props.id();
  const tomorrow = $derived(addDays(today, 1));

  let text = $state(init.ref?.task.text ?? "");
  let due = $state(init.ref?.task.due ?? "");
  let priority = $state<Priority>(init.ref?.task.priority ?? null);
  let recurrence = $state<Recurrence>(init.ref?.task.recurrence ?? null);
  let list = $state(init.list);
  let newList = $state("");
  let busy = $state(false);
  let confirming = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    const target = list === NEW ? newList.trim() : list;
    const fields = { text: value, due: due || null, priority, recurrence };
    const r = init.ref;
    busy = true;
    const ok = await save(
      plugin,
      r ? onRef(r, (d) => updateTask(d, r.index, { ...r.task, ...fields }, target)) : (d) => addTask(d, newTask(value, fields), target),
    );
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    const r = init.ref!;
    if (!confirming) return void (confirming = true);
    if (await save(plugin, onRef(r, (d) => removeTask(d, r.index)))) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-text">{t("type.task")}</label>
  <input
    id="{uid}-text"
    type="text"
    class="aio-input"
    bind:value={text}
    placeholder={t("form.placeholder")}
    autocomplete="off"
    enterkeyhint="done"
    {@attach (el) => {
      if (!init.ref) el.focus();
    }}
  />

  <label class="label" for="{uid}-due">{t("form.due")}</label>
  <div class="due">
    <input id="{uid}-due" type="date" class="aio-input" bind:value={due} />
    <button type="button" class="aio-chip" aria-pressed={due === today} onclick={() => (due = today)}>{t("when.today")}</button>
    <button type="button" class="aio-chip" aria-pressed={due === tomorrow} onclick={() => (due = tomorrow)}>{t("when.tomorrow")}</button>
    {#if due}
      <button type="button" class="aio-chip" aria-label={t("form.clearDate")} onclick={() => (due = "")}><Icon name="x" size={16} /></button>
    {/if}
  </div>

  <span class="label" id="{uid}-prio">{t("form.priority")}</span>
  <div class="aio-seg" role="group" aria-labelledby="{uid}-prio">
    {#each PRIORITIES as [value, key] (key)}
      <button type="button" aria-pressed={priority === value} onclick={() => (priority = value)}>{t(key)}</button>
    {/each}
  </div>

  <span class="label" id="{uid}-rec">{t("form.recurrence")}</span>
  <div class="aio-seg" role="group" aria-labelledby="{uid}-rec">
    {#each RECURRENCES as [value, key] (key)}
      <button type="button" aria-pressed={recurrence === value} onclick={() => (recurrence = value)}>{t(key)}</button>
    {/each}
  </div>

  <label class="label" for="{uid}-list">{t("form.list")}</label>
  <select id="{uid}-list" class="dropdown aio-input" bind:value={list}>
    <option value="">{t("form.noList")}</option>
    {#each init.names as name (name)}<option value={name}>{name}</option>{/each}
    <option value={NEW}>{t("form.newList")}</option>
  </select>
  {#if list === NEW}
    <input
      type="text"
      class="aio-input"
      bind:value={newList}
      placeholder={t("form.listName")}
      aria-label={t("form.listName")}
      autocomplete="off"
      {@attach (el) => el.focus()}
    />
  {/if}

  <div class="actions">
    {#if init.ref}
      <button type="button" class="delete" class:confirming onclick={remove}>
        <Icon name="trash-2" size={18} />{confirming ? t("form.confirmDelete") : t("form.delete")}
      </button>
    {/if}
    <button type="submit" class="mod-cta save" disabled={!text.trim() || busy}>{t("form.save")}</button>
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
  .due {
    display: flex;
    flex-wrap: wrap; /* the date takes its own line so the year is never clipped; shortcuts sit below */
    gap: var(--size-4-2);
  }
  .due .aio-input {
    width: auto;
    flex: 1 1 100%;
    min-width: 0;
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
