<script lang="ts">
  import type { DayEvent } from "../people/types";
  import { t } from "../i18n";
  import { fmtDate } from "./util";
  import Icon from "./Icon.svelte";

  // A birthday or special date (derived, not stored in the agenda), for Today and the Agenda.
  let {
    event,
    when = "",
    date = null,
    onopen,
  }: { event: DayEvent; when?: string; date?: string | null; onopen: (event: DayEvent) => void } = $props();

  const birthday = $derived(event.kind === "birthday");
  const meta = $derived(
    [
      birthday && event.turning !== null && event.turning > 0 ? t("people.turns", { n: event.turning }) : "",
      !birthday && event.people.length ? t("dates.giftFor", { names: event.people.join(", ") }) : "",
      date ? fmtDate(date, { weekday: "short", day: "numeric", month: "short" }) : "",
    ].filter(Boolean),
  );
</script>

<button class="aio-remind" onclick={() => onopen(event)}>
  <span class="icon"><Icon name={birthday ? "cake" : "gift"} size={20} /></span>
  <span class="body">
    <span class="title">{birthday ? t("people.birthdayOf", { name: event.title }) : event.title}</span>
    {#if meta.length}<span class="meta">{meta.join(" · ")}</span>{/if}
  </span>
  {#if when}<span class="when">{when}</span>{/if}
</button>

<style>
  .aio-remind {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    width: 100%;
    min-height: 52px;
    padding: var(--size-4-2) var(--size-4-4);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .aio-remind:active {
    background: var(--background-modifier-hover);
  }
  .icon {
    display: flex;
    flex-shrink: 0;
    min-width: 4.5em; /* lines titles up with EventRow's time column */
    color: var(--interactive-accent);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }
  .title {
    font-size: var(--font-ui-medium);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .when {
    flex-shrink: 0;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    white-space: nowrap;
  }
</style>
