<script lang="ts">
  import Icon from "./Icon.svelte";

  // Text input + add button for typing several entries in a row: Enter or the button
  // calls onadd, then the input is cleared and keeps focus (onadd returns false to keep the text).
  let {
    label,
    button,
    placeholder = "",
    icon = "plus",
    focus = false,
    invalid = false,
    describedby,
    value = $bindable(""),
    onadd,
  }: {
    label: string;
    button: string;
    placeholder?: string;
    icon?: string;
    focus?: boolean;
    invalid?: boolean;
    describedby?: string;
    value?: string;
    onadd: (text: string) => boolean | void;
  } = $props();

  let input: HTMLInputElement;

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!value.trim() || invalid) return;
    if (onadd(value) !== false) value = "";
    input.focus();
  }
</script>

<form class="aio-add" onsubmit={submit}>
  <input
    bind:this={input}
    type="text"
    class="aio-input"
    bind:value
    {placeholder}
    aria-label={label}
    aria-invalid={invalid}
    aria-describedby={describedby}
    autocomplete="off"
    enterkeyhint="enter"
    {@attach (el) => {
      if (focus) el.focus();
    }}
  />
  <!-- pointerdown kept from blurring the input, so the soft keyboard stays open between entries. -->
  <button
    type="submit"
    class="add-btn"
    aria-label={button}
    disabled={!value.trim() || invalid}
    onpointerdown={(e) => e.preventDefault()}
  >
    <Icon name={icon} size={22} />
  </button>
</form>

<style>
  .aio-add {
    display: flex;
    gap: var(--size-4-2);
  }
  .aio-input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    font-size: var(--font-ui-medium);
  }
  .add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--radius-m);
    color: var(--text-on-accent);
  }
  .add-btn,
  .add-btn:hover {
    background: var(--interactive-accent);
  }
  .add-btn:active:not(:disabled) {
    background: var(--interactive-accent-hover);
  }
</style>
