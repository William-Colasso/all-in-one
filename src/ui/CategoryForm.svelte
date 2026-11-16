<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Category } from "../finance/types";
  import { t } from "../i18n";
  import { cleanName, parseAmount, removeCategory, upsertCategory } from "../finance/parse";
  import { attempt } from "./habits";
  import { amountInput } from "./finance";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    categories,
    category,
    onclose,
  }: { plugin: AllInOnePlugin; categories: Category[]; category: Category | null; onclose: () => void } = $props();

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => category);
  const uid = $props.id();

  let name = $state(init?.name ?? "");
  let budget = $state(init?.budget != null ? amountInput(init.budget) : "");
  let busy = $state(false);
  let confirming = $state(false);

  const clean = $derived(cleanName(name));
  const taken = $derived(categories.some((c) => c.name === clean && c.name !== init?.name));
  const limit = $derived(budget.trim() ? parseAmount(budget) : null);
  const valid = $derived(!!clean && !taken && (!budget.trim() || (limit ?? 0) > 0));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    busy = true;
    const ok = await attempt(async () => {
      await plugin.finance.mutateConfig((d) => upsertCategory(d, { name: clean, budget: limit }, init?.name));
      if (init && init.name !== clean) await plugin.finance.renameCategory(init.name, clean);
    });
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    if (!confirming) return void (confirming = true);
    // Transactions keep their category text; it just stops being a configured category.
    if (await attempt(() => plugin.finance.mutateConfig((d) => removeCategory(d, init!.name)))) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-name">{t("fin.name")}</label>
  <input
    id="{uid}-name"
    type="text"
    class="aio-input"
    bind:value={name}
    placeholder={t("fin.categoryPlaceholder")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={taken}
    aria-describedby={taken ? `${uid}-taken` : undefined}
    {@attach (el) => {
      if (!init) el.focus();
    }}
  />
  {#if taken}<p class="msg" id="{uid}-taken">{t("fin.categoryTaken")}</p>{/if}

  <label class="label" for="{uid}-budget">{t("fin.budget")}</label>
  <input
    id="{uid}-budget"
    type="text"
    inputmode="decimal"
    class="aio-input"
    bind:value={budget}
    placeholder={t("fin.optional")}
    autocomplete="off"
    enterkeyhint="done"
  />

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
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
    color: var(--text-error);
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
