<script lang="ts">
  import type AllInOnePlugin from "../main";
  import type { ItemDoc, ItemRef, ShoppingList } from "../lists/types";
  import { t } from "../i18n";
  import { addItem, cleanText, clearDone, removeItemAt, toggleItemAt } from "../lists/parse";
  import { cleanName } from "../people/parse";
  import { attempt } from "./habits";
  import { onItem } from "./lists";
  import AddField from "./AddField.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    list,
    names,
    onback,
    onrenamed,
  }: {
    plugin: AllInOnePlugin;
    list: ShoppingList;
    names: string[];
    onback: () => void;
    onrenamed: (name: string) => void;
  } = $props();
  const uid = $props.id();

  const todo = $derived(list.items.filter((r) => !r.item.done));
  const checked = $derived(list.items.filter((r) => r.item.done));

  let renaming = $state(false);
  let draft = $state("");
  let confirming = $state(false);
  // ponytail: list names are note names, so person/date names' file-name cleaner applies as is.
  const newName = $derived(cleanName(draft));
  const taken = $derived(
    names.some((n) => n.toLowerCase() === newName.toLowerCase() && n !== list.name),
  );

  const write = (fn: (doc: ItemDoc) => ItemDoc) => attempt(() => plugin.lists.mutate(list.name, fn));
  const add = (text: string) => {
    const c = cleanText(text);
    if (!c) return false;
    void write((d) => addItem(d, c));
  };
  const toggle = (ref: ItemRef) => write(onItem(ref, (d) => toggleItemAt(d, ref.index)));
  const remove = (ref: ItemRef) => write(onItem(ref, (d) => removeItemAt(d, ref.index)));

  function rename(text: string) {
    const to = cleanName(text);
    if (!to || taken) return false;
    renaming = false;
    if (to === list.name) return;
    const from = list.name;
    void attempt(() => plugin.lists.rename(from, to)).then((ok) => ok && onrenamed(to));
  }

  async function del() {
    if (!confirming) return void (confirming = true);
    if (await attempt(() => plugin.lists.remove(list.name))) onback();
  }
</script>

<header class="aio-head">
  <button class="icon-btn" aria-label={t("agenda.back")} onclick={onback}><Icon name="chevron-left" size={24} /></button>
  <h1>{list.name}</h1>
  <button
    class="icon-btn"
    aria-label={t("lists.rename")}
    aria-expanded={renaming}
    onclick={() => ((draft = list.name), (renaming = !renaming))}
  >
    <Icon name="pencil" size={20} />
  </button>
</header>

<div class="top">
  {#if renaming}
    <AddField
      label={t("form.listName")}
      button={t("lists.rename")}
      icon="check"
      focus
      bind:value={draft}
      invalid={taken}
      describedby={taken ? `${uid}-taken` : undefined}
      onadd={rename}
    />
    {#if taken}<p class="msg error" id="{uid}-taken">{t("lists.nameTaken")}</p>{/if}
  {:else}
    <AddField label={t("lists.addItem")} button={t("lists.addItem")} placeholder={t("lists.itemPlaceholder")} onadd={add} />
  {/if}
</div>

{#if !list.items.length}
  <div class="aio-empty"><Icon name="shopping-cart" size={48} /><p>{t("lists.listEmpty")}</p></div>
{/if}
{#each [...todo, ...checked] as ref (ref.index)}
  {@const done = ref.item.done}
  {#if done && ref === checked[0]}
    <div class="checked-head">
      <button class="clear" onclick={() => write(clearDone)}>{t("lists.clearChecked")}</button>
    </div>
  {/if}
  <div class="item" class:done>
    <button class="check" role="checkbox" aria-checked={done} onclick={() => toggle(ref)}>
      <span class="box">{#if done}<Icon name="check" size={18} />{/if}</span>
      <span class="text">{ref.item.text}</span>
    </button>
    <button class="icon-btn" aria-label={t("entry.remove", { text: ref.item.text })} onclick={() => remove(ref)}>
      <Icon name="x" size={20} />
    </button>
  </div>
{/each}

<div class="more">
  <button class="delete" class:confirming onclick={del}>
    <Icon name="trash-2" size={20} /><span>{confirming ? t("form.confirmDelete") : t("form.delete")}</span>
  </button>
</div>

<style>
  .aio-head {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    padding: var(--size-4-4) var(--size-4-2) 0 var(--size-4-1);
  }
  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1.75em;
    font-weight: 700;
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
    padding: var(--size-4-3) var(--size-4-4) var(--size-4-2);
  }
  .msg {
    margin: 0;
    font-size: var(--font-ui-small);
  }
  .msg.error {
    color: var(--text-error);
  }
  .checked-head {
    display: flex;
    justify-content: flex-end;
    padding: var(--size-4-2) var(--size-4-2) 0;
  }
  .clear {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 var(--size-4-2);
    border-radius: var(--radius-m);
    color: var(--interactive-accent);
    font-size: var(--font-ui-small);
  }
  .clear:active {
    background: var(--background-modifier-hover);
  }
  .item {
    display: flex;
    align-items: center;
    padding-right: var(--size-4-2);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .check {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    min-height: 56px;
    padding: var(--size-4-2) var(--size-4-2) var(--size-4-2) var(--size-4-4);
    text-align: left;
  }
  .check:active {
    background: var(--background-modifier-hover);
  }
  .box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
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
  .text {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow-wrap: anywhere;
  }
  .done .text {
    text-decoration: line-through;
    color: var(--text-faint);
  }
  .more {
    display: flex;
    flex-direction: column;
    margin: var(--size-4-6) var(--size-4-4) 0;
  }
  .delete {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    min-height: 48px;
    padding: 0 var(--size-4-2);
    border-radius: var(--radius-m);
    color: var(--text-error);
    font-size: var(--font-ui-medium);
  }
  .delete:active,
  .delete.confirming {
    background: var(--background-modifier-hover);
  }
  @media (prefers-reduced-motion: reduce) {
    .box {
      transition: none;
    }
  }
</style>
