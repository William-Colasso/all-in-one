<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { Bill } from "../finance/types";
  import { t } from "../i18n";
  import { fmtDate } from "./util";
  import { attempt } from "./habits";
  import { money } from "./finance";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    bill,
    due,
    today,
  }: { plugin: AllInOnePlugin; bill: Bill; due: string; today: string } = $props();

  const current = $derived(due.slice(0, 7) === today.slice(0, 7));
  const late = $derived(current && due < today);
  let busy = $state(false);

  // In the current month the payment is recorded today; settling an older month backdates it to the due date.
  async function confirm() {
    if (busy) return;
    busy = true;
    await attempt(() => plugin.finance.pay(bill, current ? today : due));
    busy = false;
  }
</script>

<div class="aio-row">
  <div class="body">
    <span class="text">{bill.name}</span>
    <span class="meta" class:late>
      <Icon name="calendar" size={13} />{due === today ? t("when.today") : fmtDate(due, { day: "numeric", month: "short" })}
    </span>
  </div>
  <span class="amt" class:income={bill.amount > 0}>{money(bill.amount, plugin.settings.currency, true)}</span>
  <button class="confirm" aria-label={t("fin.confirmBill", { name: bill.name })} disabled={busy} onclick={confirm}>
    <Icon name="check" size={20} />
  </button>
</div>

<style>
  .aio-row {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    min-height: 56px;
    padding: var(--size-4-1) var(--size-4-2) var(--size-4-1) var(--size-4-4);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .text {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .meta.late {
    color: var(--text-error);
  }
  .amt {
    flex-shrink: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
  }
  .amt.income {
    color: var(--interactive-accent);
  }
  .confirm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid var(--interactive-accent);
    color: var(--interactive-accent);
  }
  .confirm:active:not(:disabled) {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }
</style>
