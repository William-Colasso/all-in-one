import type { Category, FinanceState, Tx, TxRef } from "../finance/types";
import { byCategory, pendingBills } from "../finance/parse";
import { addDays, locale } from "./util";

/** Formats an amount in the user's currency; `signed` adds a "+" to income. */
export const money = (n: number, currency: string, signed = false) =>
  new Intl.NumberFormat(locale(), { style: "currency", currency, signDisplay: signed ? "exceptZero" : "auto" }).format(n);

/** Stored amount back to what a person would type: "42,50", but "450" rather than "450,00". */
export const amountInput = (n: number) =>
  n.toLocaleString(locale(), { useGrouping: false, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export const inMonth = (txs: TxRef[], month: string) => txs.filter((r) => r.month === month);

/** Categories to offer in pickers: the configured ones, then any other already used. */
export function categoryNames(s: FinanceState): string[] {
  const used = [...s.txs.map((r) => r.tx.category), ...s.bills.map((b) => b.category)].sort((a, b) => a.localeCompare(b));
  return [...new Set([...s.categories.map((c) => c.name), ...used])].filter(Boolean);
}

/** Categories with spending this month or with a budget, most spent first. */
export function categoryRows(categories: Category[], txs: Tx[]) {
  const spent = new Map(byCategory(txs).map((r) => [r.category, r.spent]));
  const rows = categories
    .filter((c) => c.budget !== null)
    .map((c) => ({ category: c.name, spent: spent.get(c.name) ?? 0, budget: c.budget }));
  for (const [category, s] of spent) if (!rows.some((r) => r.category === category)) rows.push({ category, spent: s, budget: null });
  return rows.sort((a, b) => b.spent - a.spent);
}

/** Transactions grouped by date, newest day first; within a day, last written first. */
export function byDay(refs: TxRef[]): [string, TxRef[]][] {
  const sorted = [...refs].sort((a, b) =>
    a.tx.date === b.tx.date ? b.index - a.index : a.tx.date < b.tx.date ? 1 : -1,
  );
  const groups = new Map<string, TxRef[]>();
  for (const r of sorted) groups.set(r.tx.date, [...(groups.get(r.tx.date) ?? []), r]);
  return [...groups];
}

/** Pending bills of today's month that are past due or due within 3 days (for the Today tab). */
export function dueSoon(s: FinanceState, today: string) {
  const month = today.slice(0, 7);
  const limit = addDays(today, 3);
  return pendingBills(s.bills, inMonth(s.txs, month).map((r) => r.tx), month).filter((p) => p.due <= limit);
}
