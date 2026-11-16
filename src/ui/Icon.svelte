<script lang="ts">
  import { setIcon } from "obsidian";

  let { name, size, label }: { name: string; size?: number; label?: string } = $props();
</script>

<span
  class="aio-icon"
  style:--icon-size={size ? `${size}px` : undefined}
  role={label ? "img" : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : "true"}
  {@attach (el) => setIcon(el, name)}
></span>

<style>
  .aio-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
