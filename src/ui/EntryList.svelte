<script lang="ts">
  import { t } from "../i18n";
  import AddField from "./AddField.svelte";
  import Icon from "./Icon.svelte";

  // One editable string list of a person (likes, sizes, ideas, gifts given).
  let {
    label,
    items,
    placeholder,
    show = (item) => ({ text: item, meta: "" }),
    onadd,
    onremove,
    ongive,
  }: {
    label: string;
    items: string[];
    placeholder: string;
    show?: (item: string) => { text: string; meta: string };
    onadd: (text: string) => void;
    onremove: (item: string) => void;
    ongive?: (item: string) => void;
  } = $props();
  const uid = $props.id();
</script>

<h3 class="aio-section" id="{uid}-h">{label}</h3>
{#if items.length}
  <ul class="entries" aria-labelledby="{uid}-h">
    {#each items as item, i (i)}
      {@const s = show(item)}
      <li class="entry">
        <span class="body">
          <span class="text">{s.text}</span>
          {#if s.meta}<span class="meta">{s.meta}</span>{/if}
        </span>
        {#if ongive}
          <button class="icon-btn" aria-label={t("entry.given", { text: s.text })} onclick={() => ongive(item)}>
            <Icon name="gift" size={20} />
          </button>
        {/if}
        <button class="icon-btn" aria-label={t("entry.remove", { text: s.text })} onclick={() => onremove(item)}>
          <Icon name="x" size={20} />
        </button>
      </li>
    {/each}
  </ul>
{/if}
<AddField {label} button={t("entry.add", { section: label })} {placeholder} {onadd} />

<style>
  .aio-section {
    margin-left: 0;
    margin-right: 0;
  }
  .entries {
    list-style: none;
    margin: 0 0 var(--size-4-1);
    padding: 0;
  }
  .entry {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    min-height: 44px;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--size-4-1) 0;
  }
  .text {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow-wrap: anywhere;
  }
  .meta {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
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
</style>
