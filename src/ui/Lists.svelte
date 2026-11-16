<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { ShoppingList, WishDoc, WishRef } from "../lists/types";
  import { type Key, t } from "../i18n";
  import { updateWishAt, wishesOf } from "../lists/parse";
  import { cleanName } from "../people/parse";
  import { attempt } from "./habits";
  import { money } from "./finance";
  import { onWish } from "./lists";
  import AddField from "./AddField.svelte";
  import Icon from "./Icon.svelte";
  import ListDetail from "./ListDetail.svelte";

  let {
    plugin,
    lists,
    wishes,
    open = $bindable(null),
    onwish,
    onback,
  }: {
    plugin: AllInOnePlugin;
    lists: ShoppingList[];
    wishes: WishDoc;
    /** Name of the shopping list shown, null = the overview. */
    open?: string | null;
    onwish: (ref: WishRef | null) => void;
    onback: () => void;
  } = $props();
  const uid = $props.id();

  type Segment = "shopping" | "wishlist";
  const SEGMENTS: [Segment, Key][] = [
    ["shopping", "lists.shopping"],
    ["wishlist", "lists.wishlist"],
  ];
  let seg = $state<Segment>("shopping");

  // A list deleted or renamed elsewhere just falls back to the overview.
  const list = $derived(lists.find((l) => l.name === open));
  const names = $derived(lists.map((l) => l.name));

  let creating = $state(false);
  let draft = $state("");
  const newName = $derived(cleanName(draft));
  const taken = $derived(names.some((n) => n.toLowerCase() === newName.toLowerCase()));

  function create(text: string) {
    const name = cleanName(text);
    if (!name || taken) return false;
    creating = false;
    void attempt(() => plugin.lists.create(name)).then((ok) => ok && (open = name));
  }

  // Bought wishes go to the bottom (stable, so file order otherwise).
  const wishRows = $derived(wishesOf(wishes).sort((a, b) => Number(a.wish.done) - Number(b.wish.done)));
  const priced = $derived(wishRows.filter((r) => !r.wish.done && r.wish.price !== null));
  const total = $derived(priced.reduce((s, r) => s + r.wish.price!, 0));
  const cur = $derived(plugin.settings.currency);

  const toggleWish = (ref: WishRef) =>
    attempt(() => plugin.wishes.mutate(onWish(ref, (d) => updateWishAt(d, ref.index, { ...ref.wish, done: !ref.wish.done }))));
</script>

{#if list}
  <ListDetail {plugin} {list} {names} onback={() => (open = null)} onrenamed={(name) => (open = name)} />
{:else}
  <header class="aio-head">
    <button class="icon-btn" aria-label={t("agenda.back")} onclick={onback}><Icon name="chevron-left" size={24} /></button>
    <h1>{t("more.lists")}</h1>
  </header>
  <div class="top">
    <div class="aio-seg" role="tablist" aria-label={t("lists.view")}>
      {#each SEGMENTS as [id, key] (id)}
        <button role="tab" aria-selected={seg === id} onclick={() => (seg = id)}>{t(key)}</button>
      {/each}
    </div>
  </div>

  {#if seg === "shopping"}
    {#if !lists.length && !creating}
      <div class="aio-empty">
        <Icon name="shopping-cart" size={48} />
        <p>{t("lists.empty")}</p>
        <button class="mod-cta new" onclick={() => (creating = true)}>{t("lists.new")}</button>
      </div>
    {:else}
      {#each lists as l (l.name)}
        {@const done = l.items.filter((r) => r.item.done).length}
        <button class="row" onclick={() => (open = l.name)}>
          <Icon name="list" size={22} />
          <span class="name">{l.name}</span>
          {#if l.items.length}<span class="meta">{t("habits.progress", { done, total: l.items.length })}</span>{/if}
          <Icon name="chevron-right" />
        </button>
      {/each}
      {#if creating}
        <div class="create">
          <AddField
            label={t("form.listName")}
            button={t("lists.create")}
            placeholder={t("lists.namePlaceholder")}
            focus
            bind:value={draft}
            invalid={taken}
            describedby={taken ? `${uid}-taken` : undefined}
            onadd={create}
          />
          {#if taken}<p class="msg error" id="{uid}-taken">{t("lists.nameTaken")}</p>{/if}
        </div>
      {:else}
        <button class="row add" onclick={() => ((draft = ""), (creating = true))}>
          <Icon name="plus" size={20} />{t("lists.new")}
        </button>
      {/if}
    {/if}
  {:else if !wishRows.length}
    <div class="aio-empty">
      <Icon name="gift" size={48} />
      <p>{t("lists.wishEmpty")}</p>
      <button class="mod-cta new" onclick={() => onwish(null)}>{t("lists.addWish")}</button>
    </div>
  {:else}
    {#if priced.length}<h2 class="aio-section">{t("lists.total", { amount: money(total, cur) })}</h2>{/if}
    {#each wishRows as ref (ref.index)}
      {@const w = ref.wish}
      <div class="wish" class:done={w.done}>
        <button class="check" role="checkbox" aria-checked={w.done} aria-label={w.text} onclick={() => toggleWish(ref)}>
          <span class="box">{#if w.done}<Icon name="check" size={18} />{/if}</span>
        </button>
        <button class="body" onclick={() => onwish(ref)}>
          <span class="text">{w.text}</span>
          {#if w.price !== null}<span class="price">{money(w.price, cur)}</span>{/if}
        </button>
        {#if w.link}
          <button class="icon-btn" aria-label={t("wish.open", { text: w.text })} onclick={() => window.open(w.link)}>
            <Icon name="external-link" size={20} />
          </button>
        {:else}
          <span class="icon-btn" aria-hidden="true"></span>
        {/if}
      </div>
    {/each}
    <button class="row add" onclick={() => onwish(null)}><Icon name="plus" size={20} />{t("lists.addWish")}</button>
  {/if}
{/if}

<style>
  .aio-head {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    padding: var(--size-4-4) var(--size-4-4) 0 var(--size-4-1);
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
  .icon-btn:active {
    background: var(--background-modifier-hover);
  }
  .top {
    padding: var(--size-4-3) var(--size-4-4) var(--size-4-2);
  }
  .new {
    min-height: 48px;
    padding: 0 var(--size-4-6);
    font-size: var(--font-ui-medium);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    width: 100%;
    min-height: 56px;
    padding: var(--size-4-2) var(--size-4-4);
    border-bottom: 1px solid var(--background-modifier-border);
    color: var(--text-muted);
  }
  .row:active,
  .body:active,
  .check:active {
    background: var(--background-modifier-hover);
  }
  .name {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    flex-shrink: 0;
    font-size: var(--font-ui-small);
    font-variant-numeric: tabular-nums;
  }
  .add {
    gap: var(--size-4-2);
    color: var(--interactive-accent);
    font-size: var(--font-ui-medium);
    border-bottom: none;
  }
  .create {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
    padding: var(--size-4-3) var(--size-4-4);
  }
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
  }
  .msg.error {
    color: var(--text-error);
  }
  .wish {
    display: flex;
    align-items: stretch;
    padding-right: var(--size-4-1);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    min-height: 56px;
    flex-shrink: 0;
  }
  .box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-s);
    border: 2px solid var(--text-faint);
    color: var(--text-on-accent);
    transition: transform 0.1s;
  }
  .check:active .box {
    transform: scale(0.85);
  }
  .done .box {
    background: var(--interactive-accent);
    border-color: var(--interactive-accent);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    padding: var(--size-4-2) var(--size-4-2) var(--size-4-2) 0;
    text-align: left;
  }
  .text {
    flex: 1;
    min-width: 0;
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow-wrap: anywhere;
  }
  .price {
    flex-shrink: 0;
    font-size: var(--font-ui-medium);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }
  .done .text,
  .done .price {
    text-decoration: line-through;
    color: var(--text-faint);
  }
  .wish .icon-btn {
    align-self: center;
  }
  @media (prefers-reduced-motion: reduce) {
    .box {
      transition: none;
    }
  }
</style>
