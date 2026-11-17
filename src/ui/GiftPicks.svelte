<script lang="ts">
  import { untrack } from "svelte";
  import type { GiftIdea } from "../ai/prompts";
  import { parseAmount } from "../finance/parse";
  import { t } from "../i18n";
  import { amountInput } from "./finance";
  import { locale } from "./util";
  import Icon from "./Icon.svelte";

  // AI gift ideas as an editable checklist: fix names and prices, untick the rest, save the picks.
  let {
    gifts,
    currency,
    onadd,
  }: {
    gifts: GiftIdea[];
    currency: string;
    onadd: (picked: GiftIdea[]) => void;
  } = $props();

  let rows = $state(
    untrack(() => gifts.map((g) => ({ ...g, on: true, priceText: g.price !== null ? amountInput(g.price) : "" }))),
  );
  const symbol = untrack(
    () => new Intl.NumberFormat(locale(), { style: "currency", currency }).formatToParts(0).find((x) => x.type === "currency")?.value ?? currency,
  );
  const picked = $derived(rows.filter((r) => r.on && r.name.trim()));
  // No links at all = no web search, so the prices are the model's guesses.
  const estimated = untrack(() => gifts.every((g) => !g.link));

  function add() {
    if (!picked.length) return;
    onadd(
      picked.map((r) => {
        const n = r.priceText.trim() ? parseAmount(r.priceText) : null;
        return { name: r.name.trim(), why: r.why, price: n !== null && n > 0 ? n : null, link: r.link };
      }),
    );
  }
</script>

<ul class="gifts">
  {#each rows as r, i (i)}
    <li class="gift" class:off={!r.on}>
      <label class="pick"><input type="checkbox" bind:checked={r.on} aria-label={t("ai.pick", { name: r.name })} /></label>
      <div class="body">
        <input class="name" type="text" bind:value={r.name} aria-label={t("ai.gift.name")} autocomplete="off" enterkeyhint="done" />
        {#if r.why}<p class="why">{r.why}</p>{/if}
        <div class="line">
          <span class="money">
            <span class="symbol" aria-hidden="true">{symbol}</span>
            <input
              class="price"
              type="text"
              inputmode="decimal"
              bind:value={r.priceText}
              aria-label={t("ai.price", { currency })}
              autocomplete="off"
              enterkeyhint="done"
            />
          </span>
          {#if r.link}<a class="open" href={r.link} target="_blank" rel="noopener noreferrer">{t("ai.openProduct")}</a>{/if}
        </div>
      </div>
    </li>
  {/each}
</ul>
{#if estimated}<p class="hint">{t("ai.estimated")}</p>{/if}
<button type="button" class="mod-cta add" disabled={!picked.length} onclick={add}>
  <Icon name="list-plus" size={18} />{t("ai.gifts.add", { n: picked.length })}
</button>

<style>
  .gifts {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .gift {
    display: flex;
    align-items: flex-start;
    gap: var(--size-4-2);
    padding: var(--size-4-2) 0;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .gift:first-child {
    padding-top: 0;
  }
  .off .body {
    opacity: 0.5;
  }
  /* 44px touch target around a native checkbox. */
  .pick {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin-left: calc(-1 * var(--size-4-2));
    cursor: pointer;
  }
  .pick input {
    width: 22px;
    height: 22px;
    margin: 0;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
  }
  .line {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
  }
  .body input {
    min-height: 44px;
    min-width: 0;
    font-size: var(--font-ui-medium);
  }
  .name {
    width: 100%;
    font-weight: 600;
  }
  .money {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    color: var(--text-muted);
  }
  .symbol {
    flex: none;
  }
  /* Beats Obsidian's ".is-mobile input[type=text] { width: 100% }". */
  .money .price {
    width: 7em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .why,
  .hint {
    margin: 0;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .hint {
    margin-top: var(--size-4-2);
  }
  .open {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: var(--font-ui-small);
  }
  .add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-4-2);
    width: 100%;
    min-height: 48px;
    margin-top: var(--size-4-3);
    font-size: var(--font-ui-medium);
  }
</style>
