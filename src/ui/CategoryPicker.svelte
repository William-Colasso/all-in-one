<script lang="ts">
  import { t } from "../i18n";

  // value: a category name, "" for none, or null while typing a new one into `draft`.
  let {
    names,
    value = $bindable(),
    draft = $bindable(),
  }: { names: string[]; value: string | null; draft: string } = $props();
  const uid = $props.id();
</script>

<span class="label" id="{uid}-cat">{t("fin.category")}</span>
<div class="aio-chips" role="group" aria-labelledby="{uid}-cat">
  <button type="button" class="aio-chip" aria-pressed={value === ""} onclick={() => (value = "")}>{t("fin.none")}</button>
  {#each names as name (name)}
    <button type="button" class="aio-chip" aria-pressed={value === name} onclick={() => (value = name)}>{name}</button>
  {/each}
  <button type="button" class="aio-chip" aria-pressed={value === null} onclick={() => (value = null)}>{t("fin.newCategoryChip")}</button>
</div>
{#if value === null}
  <input
    type="text"
    class="aio-input"
    bind:value={draft}
    placeholder={t("fin.categoryPlaceholder")}
    aria-label={t("fin.categoryName")}
    autocomplete="off"
    enterkeyhint="done"
    {@attach (el) => el.focus()}
  />
{/if}

<style>
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
</style>
