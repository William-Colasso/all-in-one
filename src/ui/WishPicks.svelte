<script lang="ts">
  import type { WishResearch } from "../ai/prompts";
  import { t } from "../i18n";
  import { money } from "./finance";
  import Icon from "./Icon.svelte";

  // AI research on a wish: offers can fill the form's price and link; alternatives go to the wishlist.
  let {
    data,
    currency,
    onuse,
    onalternative,
  }: {
    data: WishResearch;
    currency: string;
    onuse: (offer: WishResearch["offers"][number]) => void;
    /** Resolves true once the alternative is saved. */
    onalternative: (alt: WishResearch["alternatives"][number]) => Promise<boolean>;
  } = $props();
  const uid = $props.id();

  let used = $state(-1);
  let added = $state<number[]>([]);

  async function addAlt(i: number) {
    if (added.includes(i)) return;
    if (await onalternative(data.alternatives[i])) added = [...added, i];
  }
</script>

{#if data.summary}<p class="summary">{data.summary}</p>{/if}

{#if data.offers.length}
  <h4 class="h" id="{uid}-offers">{t("ai.wish.offers")}</h4>
  <ul class="rows" aria-labelledby="{uid}-offers">
    {#each data.offers as o, i (i)}
      <li class="row">
        <span class="body">
          {#if o.link}<a href={o.link} target="_blank" rel="noopener noreferrer">{o.store}</a>{:else}<span>{o.store}</span>{/if}
          {#if o.price !== null}<span class="price">{money(o.price, currency)}</span>{/if}
        </span>
        <button type="button" class="act" onclick={() => ((used = i), onuse(o))} aria-label={t("ai.wish.useFor", { store: o.store })}>
          {#if used === i}<Icon name="check" size={18} />{:else}{t("ai.wish.use")}{/if}
        </button>
      </li>
    {/each}
  </ul>
  {#if used >= 0}<p class="hint" role="status">{t("ai.wish.usedHint")}</p>{/if}
{/if}

{#if data.alternatives.length}
  <h4 class="h" id="{uid}-alts">{t("ai.wish.alternatives")}</h4>
  <ul class="rows" aria-labelledby="{uid}-alts">
    {#each data.alternatives as a, i (i)}
      <li class="row">
        <span class="body">
          <span class="name">{a.name}</span>
          {#if a.price !== null || a.why}
            <span class="why">{[a.price !== null ? money(a.price, currency) : "", a.why].filter(Boolean).join(" · ")}</span>
          {/if}
        </span>
        <button
          type="button"
          class="act icon"
          disabled={added.includes(i)}
          onclick={() => addAlt(i)}
          aria-label={t("ai.wish.addAlt", { name: a.name })}
        >
          <Icon name={added.includes(i) ? "check" : "plus"} size={20} />
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if data.check}<p class="check"><Icon name="info" size={16} /><span>{data.check}</span></p>{/if}

<style>
  p {
    margin: 0;
  }
  .summary {
    font-size: var(--font-ui-medium);
  }
  .h {
    margin: var(--size-4-3) 0 var(--size-4-1);
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    min-height: 48px;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: var(--size-4-1) 0;
    font-size: var(--font-ui-medium);
  }
  .name {
    font-weight: 600;
  }
  .price {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .why,
  .hint {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .hint {
    margin-top: var(--size-4-1);
  }
  .act {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 var(--size-4-3);
    border-radius: var(--radius-m);
    font-size: var(--font-ui-small);
  }
  .act.icon {
    padding: 0;
  }
  .act:disabled {
    color: var(--text-success);
    opacity: 1;
  }
  .check {
    display: flex;
    gap: var(--size-4-2);
    margin-top: var(--size-4-3);
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .check :global(.aio-icon) {
    flex: none;
    margin-top: 2px;
  }
</style>
