<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { FinanceState, TxRef } from "../finance/types";
  import { t } from "../i18n";
  import { addMonths, pendingBills, totals } from "../finance/parse";
  import { fmtDate } from "./util";
  import { byDay, categoryRows, inMonth, money } from "./finance";
  import BillRow from "./BillRow.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    data,
    today,
    onedit,
    oncreate,
    onmanage,
  }: {
    plugin: AllInOnePlugin;
    data: FinanceState;
    today: string;
    onedit: (ref: TxRef) => void;
    oncreate: () => void;
    onmanage: () => void;
  } = $props();

  let month = $derived(today.slice(0, 7)); // writable: the arrows move it
  const atCurrent = $derived(month >= today.slice(0, 7));
  const refs = $derived(inMonth(data.txs, month));
  const txs = $derived(refs.map((r) => r.tx));
  const sum = $derived(totals(txs));
  // Only the current month: earlier months would list bills from before the user started tracking.
  const pending = $derived(atCurrent ? pendingBills(data.bills, txs, month) : []);
  const cats = $derived(categoryRows(data.categories, txs));
  const days = $derived(byDay(refs));
  const cur = $derived(plugin.settings.currency);

  const catName = (c: string) => c || t("fin.uncategorized");
</script>

<header class="aio-fin-head">
  <h1>{t("tab.finances")}</h1>
  <button class="icon-btn" aria-label={t("fin.manage")} onclick={onmanage}><Icon name="settings" size={22} /></button>
</header>

<div class="month">
  <button class="icon-btn" aria-label={t("habit.prevMonth")} onclick={() => (month = addMonths(month, -1))}>
    <Icon name="chevron-left" size={22} />
  </button>
  <span class="mname">{fmtDate(`${month}-01`, { month: "long", year: "numeric" })}</span>
  <button class="icon-btn" aria-label={t("habit.nextMonth")} disabled={atCurrent} onclick={() => (month = addMonths(month, 1))}>
    <Icon name="chevron-right" size={22} />
  </button>
</div>

{#if !refs.length && !pending.length}
  <div class="aio-empty">
    <Icon name="wallet" size={48} />
    <p>{t("fin.empty")}</p>
    <button class="mod-cta new" onclick={oncreate}>{t("fin.newExpense")}</button>
  </div>
{:else}
  <div class="summary">
    <span class="label">{t("fin.balance")}</span>
    <span class="balance" class:neg={sum.balance < 0}>{money(sum.balance, cur)}</span>
    <div class="split">
      <div class="part">
        <span class="label">{t("fin.income")}</span>
        <span class="value income">{money(sum.income, cur)}</span>
      </div>
      <div class="part">
        <span class="label">{t("fin.expenses")}</span>
        <span class="value">{money(sum.expense, cur)}</span>
      </div>
    </div>
  </div>

  {#if pending.length}
    <h2 class="aio-section">{t("fin.toSettle")}</h2>
    {#each pending as { bill, due } (bill.name)}<BillRow {plugin} {bill} {due} {today} />{/each}
  {/if}

  {#if cats.length}
    <h2 class="aio-section">{t("fin.byCategory")}</h2>
    {#each cats as { category, spent, budget } (category)}
      {@const over = budget !== null && spent > budget}
      <div class="cat">
        <div class="line">
          <span class="text">{catName(category)}</span>
          <span class="amt" class:over>
            {budget === null ? money(spent, cur) : t("fin.ofBudget", { spent: money(spent, cur), budget: money(budget, cur) })}
          </span>
        </div>
        {#if budget !== null}
          <div
            class="bar"
            role="progressbar"
            aria-label={catName(category)}
            aria-valuemin={0}
            aria-valuemax={budget}
            aria-valuenow={spent}
            aria-valuetext={t("fin.ofBudget", { spent: money(spent, cur), budget: money(budget, cur) })}
          >
            <span class="fill" class:over style:width="{budget > 0 ? Math.min(100, (spent / budget) * 100) : 100}%"></span>
          </div>
        {/if}
      </div>
    {/each}
  {/if}

  {#each days as [date, items] (date)}
    <h2 class="aio-section">
      {date === today ? t("when.today") : fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}
    </h2>
    {#each items as ref (ref.index)}
      {@const tx = ref.tx}
      <button class="tx" onclick={() => onedit(ref)}>
        <span class="body">
          <span class="text">{tx.text || tx.category || t(tx.amount < 0 ? "type.expense" : "type.income")}</span>
          {#if tx.text && tx.category}<span class="meta">{tx.category}</span>{/if}
        </span>
        <span class="amt" class:income={tx.amount > 0}>{money(tx.amount, cur, true)}</span>
      </button>
    {/each}
  {/each}
{/if}

<style>
  .aio-fin-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-4-2);
    padding: var(--size-4-6) var(--size-4-2) 0 var(--size-4-4);
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
  .icon-btn:active:not(:disabled) {
    background: var(--background-modifier-hover);
  }
  .month {
    display: flex;
    align-items: center;
    padding: var(--size-4-2) var(--size-4-2) 0;
  }
  .mname {
    flex: 1;
    text-align: center;
    font-weight: 600;
    font-size: var(--font-ui-medium);
  }
  .mname::first-letter {
    text-transform: uppercase;
  }
  .new {
    min-height: 48px;
    padding: 0 var(--size-4-6);
    font-size: var(--font-ui-medium);
  }
  .summary {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: var(--size-4-3) var(--size-4-4) 0;
    padding: var(--size-4-4);
    border-radius: var(--radius-l);
    background: var(--background-secondary);
  }
  .label {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .balance {
    font-size: 2em;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-normal);
    overflow-wrap: anywhere;
  }
  .balance.neg {
    color: var(--text-error);
  }
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-4-2);
    margin-top: var(--size-4-3);
  }
  .part {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .value {
    font-size: var(--font-ui-medium);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .value.income,
  .amt.income {
    color: var(--interactive-accent);
  }
  .cat {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
    padding: var(--size-4-2) var(--size-4-4);
  }
  .line,
  .tx {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
  }
  .text {
    flex: 1;
    min-width: 0;
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .amt {
    flex-shrink: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
  }
  .cat .amt {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .amt.over {
    color: var(--text-error);
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--background-modifier-border);
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--interactive-accent);
  }
  .fill.over {
    background: var(--text-error);
  }
  .tx {
    width: 100%;
    min-height: 56px;
    padding: var(--size-4-2) var(--size-4-4);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .tx:active {
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
  .meta {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
