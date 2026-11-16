<script lang="ts">
  import { t } from "../i18n";
  import { fmtDate } from "./util";

  // Day + month selects (no year) for birthdays and special dates; null = not picked.
  let { day = $bindable(), month = $bindable() }: { day: number | null; month: number | null } = $props();

  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
  const MONTHS = DAYS.slice(0, 12).map((m) => ({ m, name: fmtDate(`2000-${String(m).padStart(2, "0")}-01`, { month: "long" }) }));
</script>

<select class="dropdown aio-input day" aria-label={t("people.day")} bind:value={day}>
  <option value={null}>{t("people.day")}</option>
  {#each DAYS as d (d)}<option value={d}>{d}</option>{/each}
</select>
<select class="dropdown aio-input month" aria-label={t("people.month")} bind:value={month}>
  <option value={null}>{t("people.month")}</option>
  {#each MONTHS as { m, name } (m)}<option value={m}>{name}</option>{/each}
</select>

<style>
  .aio-input {
    min-height: 44px;
    font-size: var(--font-ui-medium);
  }
  .day {
    flex: 0 0 auto;
    min-width: 5.5em;
  }
  .month {
    flex: 1 1 9em;
    min-width: 0;
  }
</style>
