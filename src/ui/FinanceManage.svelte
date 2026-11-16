<script lang="ts">
  import type { Bill, Category, FinanceState } from "../finance/types";
  import { t } from "../i18n";
  import { money } from "./finance";
  import Icon from "./Icon.svelte";

  let {
    data,
    currency,
    oncategory,
    onbill,
  }: {
    data: FinanceState;
    currency: string;
    oncategory: (category: Category | null) => void;
    onbill: (bill: Bill | null) => void;
  } = $props();
</script>

<h3 class="aio-section">{t("fin.categories")}</h3>
<ul class="list">
  {#each data.categories as c (c.name)}
    <li>
      <button class="item" onclick={() => oncategory(c)}>
        <span class="name">{c.name}</span>
        <span class="meta">{c.budget !== null ? money(c.budget, currency) : t("fin.noBudget")}</span>
        <Icon name="chevron-right" />
      </button>
    </li>
  {/each}
  <li>
    <button class="item add" onclick={() => oncategory(null)}><Icon name="plus" size={20} />{t("fin.addCategory")}</button>
  </li>
</ul>

<h3 class="aio-section">{t("fin.bills")}</h3>
<ul class="list">
  {#each data.bills as b (b.name)}
    <li>
      <button class="item" onclick={() => onbill(b)}>
        <span class="name">{b.name}</span>
        <span class="meta">
          <span class:income={b.amount > 0}>{money(b.amount, currency, true)}</span> · {t("fin.day", { n: b.day })}
        </span>
        <Icon name="chevron-right" />
      </button>
    </li>
  {/each}
  <li>
    <button class="item add" onclick={() => onbill(null)}><Icon name="plus" size={20} />{t("fin.addBill")}</button>
  </li>
</ul>

<style>
  .aio-section {
    margin-left: 0;
    margin-right: 0;
  }
  .aio-section:first-child {
    margin-top: var(--size-4-2);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .item {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    width: 100%;
    min-height: 52px;
    padding: 0 var(--size-4-2);
    border-radius: var(--radius-m);
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
  }
  .item:active {
    background: var(--background-modifier-hover);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    flex-shrink: 0;
    white-space: nowrap;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .income {
    color: var(--interactive-accent);
  }
  .add {
    color: var(--interactive-accent);
  }
</style>
