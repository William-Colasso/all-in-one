<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Bill, FinanceState } from "../finance/types";
  import { t } from "../i18n";
  import { cleanName, parseAmount, removeBill, upsertBill, upsertCategory } from "../finance/parse";
  import { attempt } from "./habits";
  import { amountInput, categoryNames } from "./finance";
  import CategoryPicker from "./CategoryPicker.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    data,
    bill,
    onclose,
  }: { plugin: AllInOnePlugin; data: FinanceState; bill: Bill | null; onclose: () => void } = $props();

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => ({ bill, names: categoryNames(data), categories: data.categories }));
  const b = init.bill;
  const uid = $props.id();

  let name = $state(b?.name ?? "");
  let income = $state(!!b && b.amount > 0);
  let amount = $state(b ? amountInput(Math.abs(b.amount)) : "");
  let day = $state<number | null>(b?.day ?? null);
  let cat = $state<string | null>(b?.category ?? "");
  let draft = $state("");
  let busy = $state(false);
  let confirming = $state(false);

  const clean = $derived(cleanName(name));
  const taken = $derived(data.bills.some((x) => x.name === clean && x.name !== b?.name));
  const value = $derived(parseAmount(amount));
  const category = $derived(cat ?? cleanName(draft));
  const isNew = $derived(cat === null && !!category && !init.categories.some((c) => c.name === category));
  const valid = $derived(!!clean && !taken && !!value && value > 0 && Number.isInteger(day) && day! >= 1 && day! <= 31);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const next: Bill = { name: clean, amount: income ? value! : -value!, day: day!, category };
    busy = true;
    const ok = await attempt(async () => {
      await plugin.finance.mutateConfig((d) =>
        upsertBill(isNew ? upsertCategory(d, { name: category, budget: null }) : d, next, b?.name),
      );
      if (b && b.name !== clean) await plugin.finance.renameBill(b.name, clean);
    });
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    if (!confirming) return void (confirming = true);
    if (await attempt(() => plugin.finance.mutateConfig((d) => removeBill(d, b!.name)))) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-name">{t("fin.name")}</label>
  <input
    id="{uid}-name"
    type="text"
    class="aio-input"
    bind:value={name}
    placeholder={t("fin.billPlaceholder")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={taken}
    aria-describedby={taken ? `${uid}-taken` : undefined}
    {@attach (el) => {
      if (!b) el.focus();
    }}
  />
  {#if taken}<p class="msg" id="{uid}-taken">{t("fin.billTaken")}</p>{/if}

  <span class="label" id="{uid}-type">{t("fin.type")}</span>
  <div class="aio-seg" role="group" aria-labelledby="{uid}-type">
    <button type="button" aria-pressed={!income} onclick={() => (income = false)}>{t("type.expense")}</button>
    <button type="button" aria-pressed={income} onclick={() => (income = true)}>{t("type.income")}</button>
  </div>

  <div class="pair">
    <div class="field">
      <label class="label" for="{uid}-amount">{t("fin.amount")}</label>
      <input
        id="{uid}-amount"
        type="text"
        inputmode="decimal"
        class="aio-input"
        bind:value={amount}
        placeholder="0"
        autocomplete="off"
        enterkeyhint="done"
      />
    </div>
    <div class="field">
      <label class="label" for="{uid}-day">{t("fin.dayOfMonth")}</label>
      <input id="{uid}-day" type="number" inputmode="numeric" min="1" max="31" step="1" class="aio-input" bind:value={day} placeholder="5" />
    </div>
  </div>

  <CategoryPicker names={init.names} bind:value={cat} bind:draft />

  <div class="actions">
    {#if b}
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
