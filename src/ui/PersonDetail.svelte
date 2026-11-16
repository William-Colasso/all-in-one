<script lang="ts">
  import { untrack } from "svelte";
  import type AllInOnePlugin from "../main";
  import type { Person } from "../people/types";
  import { t } from "../i18n";
  import { cleanEntry, daysBetween, giftLine, nextOccurrence, removePersonFromDates } from "../people/parse";
  import { fmtDate } from "./util";
  import { attempt } from "./habits";
  import { splitGift, whenText, without } from "./people";
  import EntryList from "./EntryList.svelte";
  import Icon from "./Icon.svelte";

  let {
    plugin,
    person: initial,
    today,
    onedit,
    onclose,
  }: { plugin: AllInOnePlugin; person: Person; today: string; onedit: (person: Person) => void; onclose: () => void } =
    $props();

  // Optimistic: edits show at once; the store refreshes a moment after each save.
  let person = $state.raw(untrack(() => initial));
  let queue: Promise<unknown> = Promise.resolve(); // saves run in order, so the last edit wins
  let confirming = $state(false);

  const next = $derived(person.birthday ? nextOccurrence(person.birthday, today) : null);
  const turning = $derived(
    next && person.birthday!.length === 10 ? Number(next.slice(0, 4)) - Number(person.birthday!.slice(0, 4)) : null,
  );
  const given = $derived([...person.given].sort().reverse()); // "YYYY-MM-DD text": newest first

  function update(p: Person) {
    person = p;
    queue = queue.then(() => attempt(() => plugin.people.save(p)));
  }

  type Field = "likes" | "sizes" | "ideas" | "given";
  const add = (field: Field) => (text: string) => {
    const entry = cleanEntry(text);
    const value = field === "given" ? giftLine(today, entry) : entry;
    if (entry && !person[field].includes(value)) update({ ...person, [field]: [...person[field], value] });
  };
  const remove = (field: Field) => (item: string) => update({ ...person, [field]: without(person[field], item) });
  const give = (idea: string) =>
    update({ ...person, ideas: without(person.ideas, idea), given: [...person.given, giftLine(today, idea)] });
  const showGift = (entry: string) => {
    const { date, text } = splitGift(entry);
    return { text, meta: date ? fmtDate(date, { day: "numeric", month: "short", year: "numeric" }) : "" };
  };

  async function del() {
    if (!confirming) return void (confirming = true);
    await queue;
    const name = person.name;
    const ok = await attempt(async () => {
      await plugin.people.remove(name);
      await plugin.dates.mutate((d) => removePersonFromDates(d, name));
    });
    if (ok) onclose();
  }
</script>

<div class="aio-person">
  {#if person.relation}<p class="relation">{person.relation}</p>{/if}
  <p class="bday">
    <Icon name="cake" size={18} />
    {#if person.birthday && next}
      <span>
        {fmtDate(person.birthday.length === 10 ? person.birthday : `2000-${person.birthday}`, {
          day: "numeric",
          month: "long",
          year: person.birthday.length === 10 ? "numeric" : undefined,
        })}
        <span class="muted">· {whenText(daysBetween(today, next))}</span>
        {#if turning !== null && turning > 0}<span class="muted">· {t("people.turns", { n: turning })}</span>{/if}
      </span>
    {:else}
      <span class="muted">{t("people.noBirthday")}</span>
    {/if}
  </p>

  <EntryList
    label={t("people.likes")}
    items={person.likes}
    placeholder={t("people.likesPlaceholder")}
    onadd={add("likes")}
    onremove={remove("likes")}
  />
  <EntryList
    label={t("people.sizes")}
    items={person.sizes}
    placeholder={t("people.sizesPlaceholder")}
    onadd={add("sizes")}
    onremove={remove("sizes")}
  />
  <EntryList
    label={t("people.ideas")}
    items={person.ideas}
    placeholder={t("people.ideasPlaceholder")}
    onadd={add("ideas")}
    onremove={remove("ideas")}
    ongive={give}
  />
  <EntryList
    label={t("people.given")}
    items={given}
    placeholder={t("people.givenPlaceholder")}
    show={showGift}
    onadd={add("given")}
    onremove={remove("given")}
  />

  <div class="more">
    <button class="link" onclick={() => plugin.openNote(plugin.people.path(person.name))}>
      <Icon name="file-text" size={20} /><span>{t("people.openNote")}</span><Icon name="external-link" size={16} />
    </button>
  </div>
  <div class="actions">
    <button class="delete" class:confirming onclick={del}>
      <Icon name="trash-2" size={18} />{confirming ? t("form.confirmDelete") : t("form.delete")}
    </button>
    <button class="mod-cta edit" onclick={() => onedit(person)}><Icon name="pencil" size={18} />{t("habit.editAction")}</button>
  </div>
</div>

<style>
  .aio-person {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
  }
  p {
    margin: 0;
  }
  .relation {
    font-size: var(--font-ui-medium);
    color: var(--text-muted);
  }
  .bday {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
    font-size: var(--font-ui-medium);
  }
  .bday :global(.aio-icon) {
    color: var(--interactive-accent);
  }
  .muted {
    color: var(--text-muted);
  }
  .more {
    display: flex;
    flex-direction: column;
    margin-top: var(--size-4-4);
    padding-top: var(--size-4-2);
    border-top: 1px solid var(--background-modifier-border);
  }
  .link {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    min-height: 48px;
    padding: 0 var(--size-4-2);
    border-radius: var(--radius-m);
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
  }
  .link span {
    flex: 1;
    text-align: left;
  }
  .link:active {
    background: var(--background-modifier-hover);
  }
  .actions {
    display: flex;
    gap: var(--size-4-2);
  }
  .edit {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-4-2);
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
