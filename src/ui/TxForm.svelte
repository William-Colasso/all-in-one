<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { FinanceState, Tx, TxRef } from "../finance/types";
  import { t } from "../i18n";
  import { cleanName, parseAmount, upsertCategory } from "../finance/parse";
  import { attempt } from "./habits";
  import { amountInput, categoryNames } from "./finance";
  import CategoryPicker from "./CategoryPicker.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    data,
    today,
    ref,
    onclose,
  }: { plugin: AllInOnePlugin; data: FinanceState; today: string; ref: TxRef | null; onclose: () => void } = $props();

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => ({ ref, names: categoryNames(data), categories: data.categories, today }));
  const tx = init.ref?.tx;
  const uid = $props.id();

  let income = $state(!!tx && tx.amount > 0);
  let amount = $state(tx ? amountInput(Math.abs(tx.amount)) : "");
  let text = $state(tx?.text ?? "");
  let cat = $state<string | null>(tx?.category ?? "");
  let draft = $state("");
  let date = $state(tx?.date ?? init.today);
  let busy = $state(false);
  let confirming = $state(false);

  const value = $derived(parseAmount(amount));
  const category = $derived(cat ?? cleanName(draft));
  const isNew = $derived(cat === null && !!category && !init.categories.some((c) => c.name === category));
  const valid = $derived(!!value && value > 0 && !!date);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const next: Tx = { date, amount: income ? value! : -value!, text: cleanName(text), category, bill: tx?.bill ?? null };
    const r = init.ref;
    busy = true;
    const ok = await attempt(async () => {
      if (isNew) await plugin.finance.mutateConfig((d) => upsertCategory(d, { name: category, budget: null }));
      await (r ? plugin.finance.update(r, next) : plugin.finance.add(next));
    });
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    if (!confirming) return void (confirming = true);
    if (await attempt(() => plugin.finance.remove(init.ref!))) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <span class="label" id="{uid}-type">{t("fin.type")}</span>
  <div class="aio-seg" role="group" aria-labelledby="{uid}-type">
    <button type="button" aria-pressed={!income} onclick={() => (income = false)}>{t("type.expense")}</button>
    <button type="button" aria-pressed={income} onclick={() => (income = true)}>{t("type.income")}</button>
  </div>

  <label class="label" for="{uid}-amount">{t("fin.amount")}</label>
  <input
    id="{uid}-amount"
    type="text"
    inputmode="decimal"
    class="aio-input big"
    bind:value={amount}
    placeholder="0"
    autocomplete="off"
    enterkeyhint="done"
    {@attach (el) => {
      if (!init.ref) el.focus();
    }}
  />

  <label class="label" for="{uid}-text">{t("fin.description")}</label>
  <input
    id="{uid}-text"
    type="text"
    class="aio-input"
    bind:value={text}
    placeholder={t("fin.optional")}
    autocomplete="off"
    enterkeyhint="done"
  />

  <CategoryPicker names={init.names} bind:value={cat} bind:draft />

  <label class="label" for="{uid}-date">{t("fin.date")}</label>
  <input id="{uid}-date" type="date" class="aio-input" bind:value={date} />

  <div class="actions">
    {#if init.ref}
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
  .aio-input.big {
    min-height: 56px;
    font-size: 1.75em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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
