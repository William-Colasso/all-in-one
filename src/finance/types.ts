/**
 * One transaction. A line of a monthly file, e.g.
 * `- 2026-11-15 -42.50 Bread and milk [cat:: Groceries]`
 * `- 2026-11-05 -1500.00 Rent [cat:: Housing] [bill:: Rent]`
 */
export interface Tx {
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** Signed: negative = expense, positive = income. Never 0. */
  amount: number;
  text: string;
  /** "" = uncategorized */
  category: string;
  /** Name of the fixed bill this transaction settles for its month, if any. */
  bill: string | null;
}

export type TxLine = { kind: "tx"; tx: Tx } | { kind: "other"; raw: string };
export type TxDoc = TxLine[];

/** A transaction with where it lives: month file ("YYYY-MM") and line index in that file. */
export interface TxRef {
  month: string;
  index: number;
  tx: Tx;
}

/** `- Groceries [budget:: 800]` in the finance config file. The name is the unique id. */
export interface Category {
  name: string;
  /** Monthly spending limit, or null for none. */
  budget: number | null;
}

/**
 * A fixed monthly bill or income: `- Rent [amount:: -1500] [day:: 5] [cat:: Housing]`.
 * The name is the unique id. It is "pending" in a month until a Tx with `bill` = name exists there.
 */
export interface Bill {
  name: string;
  /** Signed like Tx.amount. */
  amount: number;
  /** Day of month 1..31 (clamped to the month's length when computing a due date). */
  day: number;
  category: string;
}

export type ConfigLine =
  | { kind: "category"; category: Category }
  | { kind: "bill"; bill: Bill }
  | { kind: "other"; raw: string };
export type ConfigDoc = ConfigLine[];

export interface FinanceState {
  categories: Category[];
  bills: Bill[];
  /** Every transaction of every month file, unsorted. */
  txs: TxRef[];
}
