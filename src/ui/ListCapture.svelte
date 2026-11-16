<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { ShoppingList } from "../lists/types";
  import { t } from "../i18n";
  import { addItem, cleanText } from "../lists/parse";
  import { cleanName } from "../people/parse";
  import { attempt } from "./habits";
  import AddField from "./AddField.svelte";

  // "+" → List item: adds items to a shopping list one after another; Done closes.
  let {
    plugin,
    lists,
    initial,
    onclose,
  }: { plugin: AllInOnePlugin; lists: ShoppingList[]; initial: string | null; onclose: () => void } = $props();
  const uid = $props.id();

  let picked = $state(untrack(() => initial ?? ""));
  const target = $derived(lists.some((l) => l.name === picked) ? picked : (lists[0]?.name ?? ""));
  let last = $state("");
  let draft = $state("");

  function add(text: string) {
    const c = cleanText(text);
    if (!c) return false;
    const list = target;
    void attempt(() => plugin.lists.mutate(list, (d) => addItem(d, c))).then((ok) => ok && (last = c));
  }

  function create() {
    const n = cleanName(draft);
    if (!n) return false;
    void attempt(() => plugin.lists.create(n)).then((ok) => ok && (picked = n));
  }
</script>

<div class="aio-capture">
  {#if !lists.length}
    <p class="msg" id="{uid}-first">{t("lists.first")}</p>
    <AddField
      label={t("form.listName")}
      button={t("lists.create")}
      placeholder={t("lists.namePlaceholder")}
      focus
      bind:value={draft}
      describedby="{uid}-first"
      onadd={create}
    />
  {:else}
    <span class="label" id="{uid}-list">{t("form.list")}</span>
    <div class="aio-chips" role="group" aria-labelledby="{uid}-list">
      {#each lists as l (l.name)}
        <button type="button" class="aio-chip" aria-pressed={target === l.name} onclick={() => (picked = l.name)}>{l.name}</button>
      {/each}
    </div>
    <AddField label={t("lists.addItem")} button={t("lists.addItem")} placeholder={t("lists.itemPlaceholder")} focus onadd={add} />
    <p class="msg" aria-live="polite">{last ? t("lists.added", { text: last }) : ""}</p>
  {/if}
  <button class="mod-cta done" onclick={onclose}>{t("lists.finish")}</button>
</div>

<style>
  .aio-capture {
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
  .msg {
    margin: 0;
    min-height: 1.4em;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
  .done {
    min-height: 48px;
    margin-top: var(--size-4-2);
    font-size: var(--font-ui-medium);
  }
</style>
