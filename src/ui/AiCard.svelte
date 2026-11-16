<script lang="ts">
  import { onDestroy } from "svelte";
  import { Component, MarkdownRenderer } from "obsidian";
  import type AllInOnePlugin from "../main";
  import type { AiResult } from "../ai/types";
  import { t } from "../i18n";
  import { attempt } from "./habits";
  import { aiMessage } from "./ai";
  import Icon from "./Icon.svelte";

  // One AI action: run → (thinking) → preview → add to note / discard / try again.
  // Nothing is written until "Add to note"; the rest of the sheet stays usable while it runs.
  let {
    plugin,
    label,
    run,
    onadd,
    disabled = false,
    webHint = "",
  }: {
    plugin: AllInOnePlugin;
    label: string;
    run: (webSearch: boolean) => Promise<AiResult>;
    /** Absent: no "Add to note" button. */
    onadd?: (result: AiResult) => Promise<void>;
    /** e.g. the question is still empty. */
    disabled?: boolean;
    /** Shown under the web-search toggle. */
    webHint?: string;
  } = $props();
  const uid = $props.id();

  let phase = $state<"idle" | "running" | "result" | "error" | "added">("idle");
  let result = $state.raw<AiResult | null>(null);
  let error = $state("");
  let web = $state(false); // per run: reset whenever the card goes back to idle
  let searching = $state(false);
  let adding = $state(false);

  let alive = true;
  let timer = 0;
  onDestroy(() => {
    alive = false; // a late answer after the sheet closed is dropped
    window.clearTimeout(timer);
  });

  /** Runs the action (also called by AiAsk on Ctrl/Cmd+Enter). */
  export async function start() {
    if (phase === "running" || disabled) return;
    searching = web && plugin.ai.supportsWeb;
    phase = "running";
    try {
      const r = await run(searching);
      if (!alive) return;
      result = r;
      phase = "result";
    } catch (e) {
      if (!alive) return;
      error = aiMessage(e);
      phase = "error";
    }
  }

  function reset() {
    result = null;
    web = false;
    phase = "idle";
  }

  async function add() {
    if (!result || !onadd || adding) return;
    const r = result;
    adding = true;
    const ok = await attempt(() => onadd(r));
    if (!alive) return;
    adding = false;
    if (!ok) return;
    reset();
    phase = "added";
    timer = window.setTimeout(() => (phase = "idle"), 1500);
  }

  const safe = (url: string) => /^https?:\/\//i.test(url);

  // Links in the answer and the sources open in the browser, never inside Obsidian.
  function openLink(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute("href") ?? "";
    if (safe(href)) window.open(href);
  }
</script>

<div class="aio-ai">
  {#if phase === "result" && result}
    {@const sources = result.sources.filter((s) => safe(s.url))}
    {@const text = result.text}
    <!-- Delegated link clicks; the links themselves are focusable and fire click on Enter. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="card" onclick={openLink}>
      <div
        class="md markdown-rendered"
        {@attach (el) => {
          const c = new Component();
          c.load();
          void MarkdownRenderer.render(plugin.app, text, el, "", c);
          return () => c.unload();
        }}
      ></div>
      {#if sources.length}
        <h4 class="sources-h" id="{uid}-src">{t("ai.sources")}</h4>
        <ul class="sources" aria-labelledby="{uid}-src">
          {#each sources as s (s.url)}
            <li><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a></li>
          {/each}
        </ul>
      {/if}
    </div>
    <div class="buttons">
      {#if onadd}
        <button type="button" class="mod-cta primary" disabled={adding} onclick={add}>
          <Icon name="file-plus" size={18} />{t("ai.add")}
        </button>
      {/if}
      <button type="button" class="btn" onclick={reset}>{t("ai.discard")}</button>
      <button type="button" class="btn" {disabled} onclick={start}><Icon name="rotate-ccw" size={18} />{t("ai.retry")}</button>
    </div>
  {/if}

  {#if phase === "error"}<p class="error" role="alert">{error}</p>{/if}

  <div class="status" role="status" aria-live="polite">
    {#if phase === "running"}
      <span class="row"><span class="aio-spin"></span>{searching ? t("ai.searching") : t("ai.thinking")}</span>
    {:else if phase === "added"}
      <span class="row done"><Icon name="check" size={18} />{t("ai.added")}</span>
    {/if}
  </div>

  {#if phase === "idle" || phase === "error"}
    <button type="button" class="btn run" {disabled} onclick={start}>
      <Icon name={phase === "error" ? "rotate-ccw" : "sparkles"} size={18} />{phase === "error" ? t("ai.retry") : label}
    </button>
    {#if plugin.ai.supportsWeb}
      <label class="web">
        <input type="checkbox" bind:checked={web} />
        <span>{t("ai.web")}</span>
      </label>
      {#if webHint}<p class="hint">{webHint}</p>{/if}
    {/if}
  {/if}
</div>

<style>
  /* Buttons are styled here in full: outside .aio-root (the Ask AI dialog) Obsidian's own button look applies. */
  .aio-ai {
    display: flex;
    flex-direction: column;
  }
  .aio-ai > :not(.status),
  .row {
    margin-top: var(--size-4-2);
  }
  .btn,
  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-4-2);
    min-height: 44px;
    padding: 0 var(--size-4-4);
    border-radius: var(--radius-m);
    font-size: var(--font-ui-medium);
    cursor: pointer;
  }
  .btn,
  .btn:hover {
    background: transparent;
    box-shadow: none;
  }
  .btn {
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
  }
  .btn:active:not(:disabled) {
    background: var(--background-modifier-hover);
  }
  .btn:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .run {
    min-height: 48px;
    color: var(--interactive-accent);
    font-weight: 600;
  }
  .web {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    min-height: 44px;
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    cursor: pointer;
  }
  .web input {
    margin: 0;
  }
  .hint,
  .error {
    margin: 0;
    font-size: var(--font-ui-small);
  }
  .hint {
    color: var(--text-muted);
  }
  .error {
    color: var(--text-error);
    overflow-wrap: anywhere;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    min-height: 44px;
    padding: 0 var(--size-4-2);
    color: var(--text-muted);
    font-size: var(--font-ui-medium);
  }
  .row.done {
    color: var(--text-success);
  }
  .card {
    padding: var(--size-4-3);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    background: var(--background-primary);
    min-width: 0;
    overflow-wrap: anywhere;
    user-select: text;
    -webkit-user-select: text;
  }
  /* Obsidian's own Markdown typography; only the outer margins are tightened. */
  .md > :global(:first-child) {
    margin-top: 0;
  }
  .md > :global(:last-child) {
    margin-bottom: 0;
  }
  .md :global(pre) {
    white-space: pre-wrap;
  }
  .md :global(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
  .md :global(img) {
    max-width: 100%;
  }
  .sources-h {
    margin: var(--size-4-3) 0 var(--size-4-1);
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
  }
  .sources {
    margin: 0;
    padding-left: var(--size-4-4);
    font-size: var(--font-ui-small);
  }
  .sources li {
    padding: 2px 0;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-2);
  }
  .primary {
    flex: 1 1 100%;
    min-height: 48px;
  }
  .buttons .btn {
    flex: 1;
  }
</style>
