<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Wish, WishRef } from "../lists/types";
  import { t } from "../i18n";
  import { addWish, cleanLink, cleanText, removeWishAt, updateWishAt } from "../lists/parse";
  import { parseAmount } from "../finance/parse";
  import { attempt } from "./habits";
  import { amountInput } from "./finance";
  import { onWish } from "./lists";
  import Icon from "./Icon.svelte";

  let { plugin, ref, onclose }: { plugin: AllInOnePlugin; ref: WishRef | null; onclose: () => void } = $props();

  // The form edits a snapshot taken when the sheet opens.
  const init = untrack(() => ref);
  const uid = $props.id();

  let text = $state(init?.wish.text ?? "");
  let price = $state(init?.wish.price != null ? amountInput(init.wish.price) : "");
  let link = $state(init?.wish.link ?? "");
  let busy = $state(false);
  let confirming = $state(false);

  const clean = $derived(cleanText(text));
  const amount = $derived(price.trim() ? parseAmount(price) : null);
  const badPrice = $derived(!!price.trim() && (amount === null || amount < 0));
  const url = $derived(link.trim() ? cleanLink(link) : "");
  const badLink = $derived(!!link.trim() && !url);
  const valid = $derived(!!clean && !badPrice && !badLink);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    const wish: Wish = { text: clean, done: init?.wish.done ?? false, price: amount, link: url };
    const r = init;
    busy = true;
    const ok = await attempt(() =>
      plugin.wishes.mutate(r ? onWish(r, (d) => updateWishAt(d, r.index, wish)) : (d) => addWish(d, wish)),
    );
    busy = false;
    if (ok) onclose();
  }

  async function remove() {
    const r = init!;
    if (!confirming) return void (confirming = true);
    if (await attempt(() => plugin.wishes.mutate(onWish(r, (d) => removeWishAt(d, r.index))))) onclose();
  }
</script>

<form class="aio-form" onsubmit={submit}>
  <label class="label" for="{uid}-text">{t("wish.text")}</label>
  <input
    id="{uid}-text"
    type="text"
    class="aio-input"
    bind:value={text}
    placeholder={t("wish.placeholder")}
    autocomplete="off"
    enterkeyhint="done"
    {@attach (el) => {
      if (!init) el.focus();
    }}
  />

  <label class="label" for="{uid}-price">{t("wish.price")}</label>
  <input
    id="{uid}-price"
    type="text"
    inputmode="decimal"
    class="aio-input"
    bind:value={price}
    placeholder={t("fin.optional")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={badPrice}
    aria-describedby={badPrice ? `${uid}-price-bad` : undefined}
  />
  {#if badPrice}<p class="msg error" id="{uid}-price-bad">{t("wish.badPrice")}</p>{/if}

  <label class="label" for="{uid}-link">{t("wish.link")}</label>
  <input
    id="{uid}-link"
    type="url"
    inputmode="url"
    class="aio-input"
    bind:value={link}
    placeholder={t("fin.optional")}
    autocomplete="off"
    enterkeyhint="done"
    aria-invalid={badLink}
    aria-describedby={badLink ? `${uid}-link-bad` : undefined}
  />
  {#if badLink}<p class="msg error" id="{uid}-link-bad">{t("wish.badLink")}</p>{/if}

  <div class="actions">
    {#if init}
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
  }
  .msg.error {
    color: var(--text-error);
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
