import { type App, normalizePath, TFile } from "obsidian";
import { processFile } from "../store";
import type { Bill, ConfigDoc, FinanceState, Tx, TxDoc, TxRef } from "./types";
import {
  addTx,
  billsOf,
  categoriesOf,
  parseConfig,
  parseTxs,
  removeTxAt,
  renameBillInTxs,
  renameCategoryInTxs,
  sameTx,
  serializeConfig,
  serializeTxs,
  txsOf,
  updateTxAt,
} from "./parse";

/**
 * Finance config (categories, fixed bills; one file) plus the monthly transaction
 * files (one folder), exposed as a Svelte-compatible store. Files are the source of
 * truth: every write goes through vault.process and the state is then re-read.
 */
export class FinanceStore {
  private state: FinanceState = { categories: [], bills: [], txs: [] };
  private subs = new Set<(s: FinanceState) => void>();

  constructor(private app: App, private config: () => string, private folder: () => string) {}

  subscribe(fn: (s: FinanceState) => void): () => void {
    fn(this.state);
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  owns(path: string) {
    return path === normalizePath(this.config()) || path.startsWith(normalizePath(this.folder()) + "/");
  }

  private monthFiles(): TFile[] {
    const folder = this.app.vault.getFolderByPath(normalizePath(this.folder()));
    return (folder?.children ?? []).filter(
      (f): f is TFile => f instanceof TFile && /^\d{4}-\d{2}$/.test(f.basename) && f.extension === "md",
    );
  }

  async load() {
    const { vault } = this.app;
    const file = vault.getFileByPath(normalizePath(this.config()));
    const config = file ? parseConfig(await vault.read(file)) : [];
    // ponytail: reads every monthly file on each load; cache per file if years of history get slow.
    const txs: TxRef[] = [];
    for (const f of this.monthFiles()) {
      txsOf(parseTxs(await vault.read(f))).forEach(({ index, tx }) => txs.push({ month: f.basename, index, tx }));
    }
    this.state = { categories: categoriesOf(config), bills: billsOf(config), txs };
    this.subs.forEach((fn) => fn(this.state));
  }

  private monthPath = (month: string) => `${this.folder()}/${month}.md`;

  private async editMonth(month: string, fn: (doc: TxDoc) => TxDoc) {
    await processFile(this.app, this.monthPath(month), (data) => serializeTxs(fn(parseTxs(data))));
  }

  /** Aborts (no write) if the line at ref.index is no longer that transaction, e.g. after a sync. */
  private guard = (ref: TxRef, fn: (doc: TxDoc) => TxDoc) => (doc: TxDoc) => {
    const line = doc[ref.index];
    if (line?.kind !== "tx" || !sameTx(line.tx, ref.tx)) throw new Error("Transaction moved in file");
    return fn(doc);
  };

  async mutateConfig(fn: (doc: ConfigDoc) => ConfigDoc) {
    await processFile(this.app, this.config(), (data) => serializeConfig(fn(parseConfig(data))));
    await this.load();
  }

  async add(tx: Tx) {
    await this.editMonth(tx.date.slice(0, 7), (doc) => addTx(doc, tx));
    await this.load();
  }

  async update(ref: TxRef, tx: Tx) {
    const month = tx.date.slice(0, 7);
    if (month === ref.month) {
      await this.editMonth(month, this.guard(ref, (doc) => updateTxAt(doc, ref.index, tx)));
    } else {
      await this.editMonth(ref.month, this.guard(ref, (doc) => removeTxAt(doc, ref.index)));
      await this.editMonth(month, (doc) => addTx(doc, tx));
    }
    await this.load();
  }

  async remove(ref: TxRef) {
    await this.editMonth(ref.month, this.guard(ref, (doc) => removeTxAt(doc, ref.index)));
    await this.load();
  }

  /** Settles a fixed bill: records its transaction on `date`, tagged so the bill stops being pending that month. */
  pay(bill: Bill, date: string) {
    return this.add({ date, amount: bill.amount, text: bill.name, category: bill.category, bill: bill.name });
  }

  private async rewriteAll(fn: (doc: TxDoc) => TxDoc) {
    for (const f of this.monthFiles()) await this.app.vault.process(f, (data) => serializeTxs(fn(parseTxs(data))));
    await this.load();
  }

  /** Carries a category rename over to every transaction file (the config itself is changed with mutateConfig). */
  renameCategory(from: string, to: string) {
    return this.rewriteAll((doc) => renameCategoryInTxs(doc, from, to));
  }

  /** Carries a fixed-bill rename over to the payments already recorded, so they still settle it. */
  renameBill(from: string, to: string) {
    return this.rewriteAll((doc) => renameBillInTxs(doc, from, to));
  }
}
