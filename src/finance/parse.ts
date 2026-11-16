import type { Bill, Category, ConfigDoc, Tx, TxDoc } from "./types";

const cents = (n: number) => Math.round(n * 100);

export function cleanName(name: string): string {
  return name.replace(/::/g, "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
}

const lines = (md: string) => {
  const ls = md.split(/\r?\n/);
  if (ls[ls.length - 1] === "") ls.pop();
  return ls;
};
const join = (ls: string[]) => (ls.length ? ls.join("\n") + "\n" : "");

// ---- transactions ----

const TX_LINE = /^- (\d{4}-\d{2}-\d{2}) ([+-]?\d+(?:[.,]\d+)?)(?:\s+(.*))?$/;
const TX_FIELD = /\[(cat|bill)::\s*([^\]]*)\]/gi;

export function parseTxs(md: string): TxDoc {
  if (md === "") return [];
  return lines(md).map((raw): TxDoc[number] => {
    const m = TX_LINE.exec(raw);
    const amount = m ? cents(Number(m[2].replace(",", "."))) / 100 : 0;
    if (!m || !amount) return { kind: "other", raw };
    const f: Record<string, string> = {};
    const text = (m[3] ?? "")
      .replace(TX_FIELD, (_m, k: string, v: string) => {
        f[k.toLowerCase()] ??= v.trim();
        return " ";
      })
      .replace(/\s+/g, " ")
      .trim();
    return { kind: "tx", tx: { date: m[1], amount, text, category: f.cat ?? "", bill: f.bill || null } };
  });
}

export function serializeTxs(doc: TxDoc): string {
  return join(
    doc.map((l) => {
      if (l.kind === "other") return l.raw;
      const t = l.tx;
      const abs = (Math.abs(cents(t.amount)) / 100).toFixed(2);
      return (
        `- ${t.date} ${t.amount < 0 ? "-" : "+"}${abs}` +
        (t.text ? ` ${t.text}` : "") +
        (t.category ? ` [cat:: ${t.category}]` : "") +
        (t.bill ? ` [bill:: ${t.bill}]` : "")
      );
    }),
  );
}

export function txsOf(doc: TxDoc): { index: number; tx: Tx }[] {
  return doc.flatMap((l, index) => (l.kind === "tx" ? [{ index, tx: l.tx }] : []));
}

export function sameTx(a: Tx, b: Tx): boolean {
  return (
    a.date === b.date && cents(a.amount) === cents(b.amount) && a.text === b.text &&
    a.category === b.category && a.bill === b.bill
  );
}

export function addTx(doc: TxDoc, tx: Tx): TxDoc {
  let at = doc.length;
  const prev = doc.findLastIndex((l) => l.kind === "tx" && l.tx.date <= tx.date);
  if (prev >= 0) at = prev + 1;
  else {
    const next = doc.findIndex((l) => l.kind === "tx" && l.tx.date > tx.date);
    if (next >= 0) at = next;
  }
  return [...doc.slice(0, at), { kind: "tx", tx }, ...doc.slice(at)];
}

export function updateTxAt(doc: TxDoc, index: number, tx: Tx): TxDoc {
  const l = doc[index];
  if (l?.kind !== "tx") return doc;
  if (l.tx.date === tx.date) return doc.map((x, i) => (i === index ? { kind: "tx", tx } : x));
  return addTx(removeTxAt(doc, index), tx);
}

export function removeTxAt(doc: TxDoc, index: number): TxDoc {
  return doc[index]?.kind === "tx" ? doc.filter((_, i) => i !== index) : doc;
}

export function renameCategoryInTxs(doc: TxDoc, from: string, to: string): TxDoc {
  if (from === to) return doc;
  return doc.map((l) => (l.kind === "tx" && l.tx.category === from ? { kind: "tx", tx: { ...l.tx, category: to } } : l));
}

export function renameBillInTxs(doc: TxDoc, from: string, to: string): TxDoc {
  if (from === to) return doc;
  return doc.map((l) => (l.kind === "tx" && l.tx.bill === from ? { kind: "tx", tx: { ...l.tx, bill: to } } : l));
}

// ---- config ----

const CFG_FIELD = /\[(amount|day|budget|cat)::\s*([^\]]*)\]/gi;
const stripFields = (s: string, keys: string) =>
  s.replace(new RegExp(`\\[(?:${keys})::\\s*[^\\]]*\\]`, "gi"), " ").replace(/\s+/g, " ").trim();

function parseConfigLine(raw: string): ConfigDoc[number] {
  const m = /^- (?!\[[ xX]\](?:\s|$))(.*\S.*)$/.exec(raw);
  if (!m) return { kind: "other", raw };
  const f: Record<string, string> = {};
  for (const x of m[1].matchAll(CFG_FIELD)) f[x[1].toLowerCase()] ??= x[2].trim();
  const amount = f.amount ? Number(f.amount) : 0;
  if (Number.isFinite(amount) && amount !== 0) {
    const name = stripFields(m[1], "amount|day|cat");
    if (!name) return { kind: "other", raw };
    const day = parseInt(f.day ?? "", 10);
    return {
      kind: "bill",
      bill: { name, amount, day: Number.isNaN(day) ? 1 : Math.min(31, Math.max(1, day)), category: f.cat ?? "" },
    };
  }
  const name = stripFields(m[1], "budget");
  if (!name) return { kind: "other", raw };
  const budget = f.budget ? Number(f.budget) : NaN;
  return { kind: "category", category: { name, budget: budget > 0 && Number.isFinite(budget) ? budget : null } };
}

export function parseConfig(md: string): ConfigDoc {
  return md === "" ? [] : lines(md).map(parseConfigLine);
}

export function serializeConfig(doc: ConfigDoc): string {
  return join(
    doc.map((l) => {
      if (l.kind === "other") return l.raw;
      if (l.kind === "category") return `- ${l.category.name}` + (l.category.budget ? ` [budget:: ${l.category.budget}]` : "");
      const b = l.bill;
      return `- ${b.name} [amount:: ${b.amount}] [day:: ${b.day}]` + (b.category ? ` [cat:: ${b.category}]` : "");
    }),
  );
}

export function categoriesOf(doc: ConfigDoc): Category[] {
  return doc.flatMap((l) => (l.kind === "category" ? [l.category] : []));
}

export function billsOf(doc: ConfigDoc): Bill[] {
  return doc.flatMap((l) => (l.kind === "bill" ? [l.bill] : []));
}

/** Replaces the `kind` line named `oldName ?? item.name` (unless renaming onto another one), else appends after the last such line. */
function upsert(doc: ConfigDoc, kind: "category" | "bill", item: Category | Bill, oldName?: string): ConfigDoc {
  const nameOf = (l: ConfigDoc[number]) => (l.kind === "category" ? l.category.name : l.kind === "bill" ? l.bill.name : null);
  const target = oldName ?? item.name;
  if (item.name !== target && doc.some((l) => l.kind === kind && nameOf(l) === item.name)) return doc;
  const line = { kind, [kind]: item } as ConfigDoc[number];
  const at = doc.findIndex((l) => l.kind === kind && nameOf(l) === target);
  if (at >= 0) return doc.map((l, i) => (i === at ? line : l));
  const last = doc.findLastIndex((l) => l.kind === kind);
  const end = last >= 0 ? last + 1 : doc.length;
  return [...doc.slice(0, end), line, ...doc.slice(end)];
}

export function upsertCategory(doc: ConfigDoc, category: Category, oldName?: string): ConfigDoc {
  const out = upsert(doc, "category", category, oldName);
  if (out === doc || oldName === undefined || oldName === category.name) return out;
  return out.map((l) => (l.kind === "bill" && l.bill.category === oldName ? { kind: "bill", bill: { ...l.bill, category: category.name } } : l));
}

export function removeCategory(doc: ConfigDoc, name: string): ConfigDoc {
  return doc.filter((l) => !(l.kind === "category" && l.category.name === name));
}

export function upsertBill(doc: ConfigDoc, bill: Bill, oldName?: string): ConfigDoc {
  return upsert(doc, "bill", bill, oldName);
}

export function removeBill(doc: ConfigDoc, name: string): ConfigDoc {
  return doc.filter((l) => !(l.kind === "bill" && l.bill.name === name));
}

// ---- amounts & stats ----

export function parseAmount(input: string): number | null {
  const s = input.replace(/[^\d.,+-]/g, "");
  if (!/^[+-]?[\d.,]*\d[\d.,]*$/.test(s)) return null;
  const m = /^(.*?)[.,](\d{1,2})$/.exec(s.replace(/^[+-]/, ""));
  const digits = (m ? m[1] : s.replace(/^[+-]/, "")).replace(/[.,]/g, "");
  const n = Number(`${digits || "0"}.${m ? m[2] : "0"}`);
  if (!Number.isFinite(n)) return null;
  return (Math.round(n * 100) / 100) * (s.startsWith("-") ? -1 : 1) || 0;
}

export function totals(txs: Tx[]): { income: number; expense: number; balance: number } {
  let inc = 0;
  let exp = 0;
  for (const t of txs) {
    if (t.amount > 0) inc += cents(t.amount);
    else exp -= cents(t.amount);
  }
  return { income: inc / 100, expense: exp / 100, balance: (inc - exp) / 100 };
}

export function byCategory(txs: Tx[]): { category: string; spent: number }[] {
  const m = new Map<string, number>();
  for (const t of txs) if (t.amount < 0) m.set(t.category, (m.get(t.category) ?? 0) - cents(t.amount));
  return [...m]
    .map(([category, c]) => ({ category, spent: c / 100 }))
    .sort((a, b) => b.spent - a.spent || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
}

export function dueDate(bill: Bill, month: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(bill.day, last)).padStart(2, "0")}`;
}

export function pendingBills(bills: Bill[], monthTxs: Tx[], month: string): { bill: Bill; due: string }[] {
  const paid = new Set(monthTxs.map((t) => t.bill));
  return bills
    .filter((b) => !paid.has(b.name))
    .map((bill) => ({ bill, due: dueDate(bill, month) }))
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.bill.name < b.bill.name ? -1 : a.bill.name > b.bill.name ? 1 : 0));
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + m - 1 + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
