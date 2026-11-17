<script lang="ts">
  import type { TFile } from "obsidian";
  import type AllInOnePlugin from "../main";
  import type { AiResult } from "../ai/types";
  import { t } from "../i18n";
  import { headingFor, notePrompt, sectionMarkdown } from "../ai/prompts";
  import { todayISO } from "../tasks/parse";
  import { aiLang, aiLanguage, shorten } from "./ai";
  import AiCard from "./AiCard.svelte";
  import Icon from "./Icon.svelte";

  // "Ask AI about this note": one question about the active note, one answer, optionally appended to it.
  let { plugin, file, close }: { plugin: AllInOnePlugin; file: TFile; close: () => void } = $props();
  const uid = $props.id();

  let question = $state("");
  let asked = ""; // the question of the shown answer (the box may have been edited since)
  let card = $state<ReturnType<typeof AiCard>>();

  async function run(webSearch: boolean): Promise<AiResult> {
    asked = question.trim();
    const content = await plugin.app.vault.cachedRead(file);
    return plugin.ai.complete(notePrompt({ title: file.basename, content, question: asked, lang: aiLanguage(plugin.app, file.path), webSearch }));
  }

  async function add(result: AiResult) {
    await plugin.appendToNote(file.path, sectionMarkdown(headingFor(shorten(asked), todayISO(), aiLang()), result));
    close();
  }

  function keydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void card?.start();
    }
  }
</script>

<div class="aio-ask">
  <p class="note-name"><Icon name="file-text" size={18} /><span>{file.basename}</span></p>
  <label class="label" for="{uid}-q">{t("ai.question")}</label>
  <textarea
    id="{uid}-q"
    rows="3"
    bind:value={question}
    placeholder={t("ai.questionPlaceholder")}
    onkeydown={keydown}
    {@attach (el) => {
      const id = window.setTimeout(() => el.focus()); // after the modal finishes opening
      return () => window.clearTimeout(id);
    }}
  ></textarea>
  <AiCard bind:this={card} {plugin} label={t("ai.askRun")} {run} onadd={add} disabled={!question.trim()} />
  <p class="muted">{t("ai.ask.sends")}</p>
</div>

<style>
  .aio-ask {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
  }
  p {
    margin: 0;
  }
  .note-name {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    min-width: 0;
    font-size: var(--font-ui-medium);
    font-weight: 600;
    color: var(--text-normal);
  }
  .note-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label {
    margin-top: var(--size-4-2);
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
  }
  textarea {
    width: 100%;
    min-height: 5.5em;
    resize: vertical;
    font-size: var(--font-ui-medium);
  }
  .muted {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }
</style>
