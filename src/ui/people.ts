import { t } from "../i18n";

const pad = (n: number) => String(n).padStart(2, "0");

/** Day, month and year of a "MM-DD" / "YYYY-MM-DD" value; nulls when empty or malformed. */
export function splitDay(s: string | null): { day: number | null; month: number | null; year: number | null } {
  const m = s ? /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(s) : null;
  return m
    ? { day: Number(m[3]), month: Number(m[2]), year: m[1] ? Number(m[1]) : null }
    : { day: null, month: null, year: null };
}

/** "MM-DD", or "YYYY-MM-DD" with a year; null if that day doesn't exist (29 Feb is fine without a year). */
export function joinDay(day: number, month: number, year: number | null = null): string | null {
  const d = new Date(2000, 0, 1);
  d.setFullYear(year ?? 2000, month - 1, day); // 2000 is a leap year; setFullYear keeps years < 100 as is
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return year === null ? `${pad(month)}-${pad(day)}` : `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

/** A 4-digit birth year. */
export const validYear = (y: number) => Number.isInteger(y) && y >= 1000 && y <= 9999;

/** "Today", "Tomorrow", "in N days". */
// ponytail: 1 is always "Tomorrow", so the "in N days" form is only ever plural (en and pt-BR alike).
export const whenText = (n: number) => (n === 0 ? t("when.today") : n === 1 ? t("when.tomorrow") : t("people.inDays", { n }));

/** A "Gifts given" entry split into its date and text ("2025-12-25 Headphones"); date "" when missing. */
export function splitGift(entry: string): { date: string; text: string } {
  const m = /^(\d{4}-\d{2}-\d{2})\s+(.*)$/.exec(entry);
  return m ? { date: m[1], text: m[2] } : { date: "", text: entry };
}

/** `list` without the first occurrence of `item`. */
export const without = (list: string[], item: string) => {
  const i = list.indexOf(item);
  return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
};
