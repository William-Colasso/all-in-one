<script lang="ts">
  import type { Snippet } from "svelte";
  import { t } from "../i18n";
  import Icon from "./Icon.svelte";

  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();
  const id = $props.id();
</script>

<!-- Positioned inside .aio-root (not the viewport), so it shrinks with the view when the soft keyboard opens. -->
<div class="aio-sheet-wrap">
  <button class="aio-backdrop" tabindex="-1" aria-label={t("close")} onclick={onclose}></button>
  <div class="aio-sheet" role="dialog" aria-modal="true" aria-labelledby={id}>
    <header>
      <h2 {id}>{title}</h2>
      <button class="aio-close" aria-label={t("close")} onclick={onclose}><Icon name="x" size={22} /></button>
    </header>
    <div class="aio-sheet-body">{@render children()}</div>
  </div>
</div>

<style>
  .aio-sheet-wrap {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .aio-backdrop,
  .aio-backdrop:hover {
    background: rgba(0, 0, 0, 0.45);
  }
  .aio-backdrop {
    position: absolute;
    inset: 0;
    cursor: default;
    animation: aio-fade 0.2s ease-out;
  }
  .aio-sheet {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 560px;
    max-height: 85%;
    margin: 0 auto;
    background: var(--background-primary);
    color: var(--text-normal);
    border-radius: var(--radius-l) var(--radius-l) 0 0;
    border: 1px solid var(--background-modifier-border);
    border-bottom: none;
    animation: aio-slide 0.25s ease-out;
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    padding: var(--size-4-2) var(--size-4-2) 0 var(--size-4-4);
  }
  h2 {
    flex: 1;
    margin: 0;
    font-size: var(--font-ui-large);
    font-weight: 600;
  }
  .aio-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    color: var(--text-muted);
  }
  .aio-close:active {
    background: var(--background-modifier-hover);
  }
  .aio-sheet-body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--size-4-2) var(--size-4-4) calc(var(--size-4-4) + env(safe-area-inset-bottom));
  }
  @keyframes aio-slide {
    from {
      transform: translateY(100%);
    }
  }
  @keyframes aio-fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .aio-sheet,
    .aio-backdrop {
      animation: none;
    }
  }
</style>
