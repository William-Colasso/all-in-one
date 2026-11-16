import { describe, it, expect } from "vitest";
import {
  addMonths, addTx, billsOf, byCategory, categoriesOf, cleanName, dueDate, parseAmount, parseConfig,
  parseTxs, pendingBills, removeBill, removeCategory, removeTxAt, renameCategoryInTxs, sameTx,
  serializeConfig, serializeTxs, totals, txsOf, updateTxAt, upsertBill, upsertCategory,
} from "./parse";
import type { Bill, Tx } from "./types";

const tx = (date: string, amount: number, extra: Partial<Tx> = {}): Tx => ({
  date, amount, text: "", category: "", bill: null, ...extra,
});
const one = (md: string) => txsOf(parseTxs(md))[0]?.tx;
const dates = (md: string) => txsOf(parseTxs(md)).map((x) => x.tx.date);

describe("transactions", () => {
  it("reads signs, comma decimals, no text", () => {
    expect(one("- 2026-11-15 -42.50 Bread")).toEqual(tx("2026-11-15", -42.5, { text: "Bread" }));
    expect(one("- 2026-11-15 +3500.00 Salary")).toMatchObject({ amount: 3500 });
    expect(one("- 2026-11-15 12")).toMatchObject({ amount: 12 });
    expect(one("- 2026-11-15 -1,5 x")).toMatchObject({ amount: -1.5 });
    expect(one("- 2026-11-16 -12.00")).toEqual(tx("2026-11-16", -12));
  });
  it("reads fields in any order and keeps unknown ones in the text", () => {
    expect(one("- 2026-11-05 -1500 [bill:: Rent] Rent  [color:: red] [cat:: Housing]")).toEqual(
      tx("2026-11-05", -1500, { text: "Rent [color:: red]", category: "Housing", bill: "Rent" }),
    );
    expect(one("- 2026-11-05 -1 [bill:: ] [cat:: ]")).toEqual(tx("2026-11-05", -1));
  });
  it("treats zero, garbage and non-matching lines as other", () => {
    const md = "# T\n- 2026-11-15 0 x\n- 2026-11-15 abc\n- 2026-11-15 -5abc\n- 2026-11-15\n- [ ] x\nprose\n";
    expect(parseTxs(md).map((l) => l.kind)).toEqual(Array(7).fill("other"));
    expect(serializeTxs(parseTxs(md))).toBe(md);
  });
  it("round-trips canonical files and normalizes newlines", () => {
    const md =
      "# Nov\n- 2026-11-05 -1500.00 Rent [cat:: Housing] [bill:: Rent]\n- 2026-11-15 -42.50 Bread and milk [cat:: Groceries]\n" +
      "- 2026-11-15 +3500.00 Salary [cat:: Income]\n- 2026-11-16 -12.00\n";
    expect(serializeTxs(parseTxs(md))).toBe(md);
    expect(serializeTxs(parseTxs(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeTxs(parseTxs("- 2026-11-15 5,5 a"))).toBe("- 2026-11-15 +5.50 a\n");
    expect(serializeTxs(parseTxs(""))).toBe("");
  });
  it("addTx keeps date order", () => {
    const add = (md: string, d: string) => serializeTxs(addTx(parseTxs(md), tx(d, -1)));
    expect(add("", "2026-11-10")).toBe("- 2026-11-10 -1.00\n");
    const md = "- 2026-11-05 -1\n- 2026-11-15 -1\n";
    expect(dates(add(md, "2026-11-10"))).toEqual(["2026-11-05", "2026-11-10", "2026-11-15"]);
    expect(dates(add(md, "2026-11-01"))).toEqual(["2026-11-01", "2026-11-05", "2026-11-15"]);
    expect(dates(add(md, "2026-11-20"))).toEqual(["2026-11-05", "2026-11-15", "2026-11-20"]);
    expect(dates(add(md, "2026-11-15")).length).toBe(3);
    expect(add(md, "2026-11-15").endsWith("- 2026-11-15 -1.00\n")).toBe(true);
  });
  it("addTx leaves other lines in place", () => {
    const d = parseTxs("# h\n- 2026-11-05 -1\nnote\n- 2026-11-15 -1\n");
    expect(addTx(d, tx("2026-11-10", -1)).map((l) => l.kind)).toEqual(["other", "tx", "tx", "other", "tx"]);
    expect(addTx(d, tx("2026-11-01", -1)).map((l) => l.kind)).toEqual(["other", "tx", "tx", "other", "tx"]);
    expect(addTx(parseTxs("# h\n"), tx("2026-11-01", -1)).map((l) => l.kind)).toEqual(["other", "tx"]);
  });
  it("updateTxAt edits in place or re-places on date change", () => {
    const d = parseTxs("- 2026-11-05 -1\n- 2026-11-10 -2\n- 2026-11-15 -3\n");
    expect(serializeTxs(updateTxAt(d, 1, tx("2026-11-10", -9)))).toBe("- 2026-11-05 -1.00\n- 2026-11-10 -9.00\n- 2026-11-15 -3.00\n");
    expect(dates(serializeTxs(updateTxAt(d, 0, tx("2026-11-20", -1))))).toEqual(["2026-11-10", "2026-11-15", "2026-11-20"]);
    expect(updateTxAt(parseTxs("# h\n- 2026-11-05 -1\n"), 0, tx("2026-11-05", -1))).toEqual(parseTxs("# h\n- 2026-11-05 -1\n"));
    expect(updateTxAt(d, 9, tx("2026-11-05", -1))).toBe(d);
  });
  it("removeTxAt removes only tx lines", () => {
    const d = parseTxs("# h\n- 2026-11-05 -1\n");
    expect(serializeTxs(removeTxAt(d, 1))).toBe("# h\n");
    expect(removeTxAt(d, 0)).toBe(d);
  });
  it("sameTx compares all fields at cent precision", () => {
    const a = tx("2026-11-05", -0.3, { text: "x", category: "c", bill: "b" });
    expect(sameTx(a, { ...a, amount: -0.1 - 0.2 })).toBe(true);
    for (const o of [{ date: "2026-11-06" }, { amount: -0.31 }, { text: "y" }, { category: "d" }, { bill: null }])
      expect(sameTx(a, { ...a, ...o })).toBe(false);
  });
  it("renameCategoryInTxs renames matching transactions only", () => {
    const d = parseTxs("- 2026-11-05 -1 [cat:: A]\n- 2026-11-06 -1 [cat:: B]\nx\n");
    expect(serializeTxs(renameCategoryInTxs(d, "A", "C"))).toBe("- 2026-11-05 -1.00 [cat:: C]\n- 2026-11-06 -1.00 [cat:: B]\nx\n");
    expect(renameCategoryInTxs(d, "A", "A")).toBe(d);
  });
});

const cfg = "# Config\n\n- Groceries [budget:: 800]\n- Transport\n- Rent [amount:: -1500] [day:: 5] [cat:: Housing]\n- Salary [amount:: 3500] [day:: 1] [cat:: Income]\n";

describe("config", () => {
  it("detects categories and bills", () => {
    const d = parseConfig(cfg);
    expect(categoriesOf(d)).toEqual([{ name: "Groceries", budget: 800 }, { name: "Transport", budget: null }]);
    expect(billsOf(d)[0]).toEqual({ name: "Rent", amount: -1500, day: 5, category: "Housing" });
    expect(d.filter((l) => l.kind === "other").length).toBe(2);
  });
  it("clamps day, validates budget, ignores checkboxes and empty names", () => {
    const b = (s: string) => billsOf(parseConfig(s))[0];
    expect(b("- A [amount:: 5] [day:: 99]")).toMatchObject({ day: 31, category: "" });
    expect(b("- A [amount:: 5] [day:: 0]").day).toBe(1);
    expect(b("- A [amount:: 5] [day:: x]").day).toBe(1);
    expect(b("- A [amount:: 5]").day).toBe(1);
    expect(categoriesOf(parseConfig("- A [budget:: -3]\n- B [budget:: x]\n- C [budget:: 0]"))).toEqual([
      { name: "A", budget: null }, { name: "B", budget: null }, { name: "C", budget: null },
    ]);
    expect(categoriesOf(parseConfig("- A [amount:: 0]"))[0].name).toBe("A [amount:: 0]");
    expect(parseConfig("- [ ] a\n- [x] b\n- [amount:: 5]\n-\n- [budget:: 5]").map((l) => l.kind)).toEqual(Array(5).fill("other"));
    expect(categoriesOf(parseConfig("- A [color:: red]"))[0].name).toBe("A [color:: red]");
  });
  it("round-trips canonical files and normalizes newlines", () => {
    expect(serializeConfig(parseConfig(cfg))).toBe(cfg);
    expect(serializeConfig(parseConfig(cfg.replace(/\n/g, "\r\n")))).toBe(cfg);
    expect(serializeConfig(parseConfig(""))).toBe("");
    expect(serializeConfig(parseConfig("- X [amount:: 12.5] [day:: 3]"))).toBe("- X [amount:: 12.5] [day:: 3]\n");
  });
  it("cleanName strips brackets, :: and whitespace", () => {
    expect(cleanName("  a [b]::  c ")).toBe("a b c");
  });
  it("upserts and removes categories", () => {
    const d = parseConfig(cfg);
    const added = upsertCategory(d, { name: "Fun", budget: 50 });
    expect(serializeConfig(added)).toContain("- Transport\n- Fun [budget:: 50]\n- Rent");
    expect(upsertCategory(parseConfig("# h\n"), { name: "A", budget: null }).map((l) => l.kind)).toEqual(["other", "category"]);
    expect(categoriesOf(upsertCategory(d, { name: "Groceries", budget: 1 }))[0].budget).toBe(1);
    expect(upsertCategory(d, { name: "Transport", budget: null }, "Groceries")).toBe(d);
    const renamed = upsertCategory(d, { name: "Housing2", budget: null }, "Groceries");
    expect(categoriesOf(renamed)[0].name).toBe("Housing2");
    const r2 = upsertCategory(parseConfig(cfg), { name: "Home", budget: null }, "Transport");
    expect(categoriesOf(r2)[1].name).toBe("Home");
    const r3 = upsertCategory(parseConfig("- Housing\n- Rent [amount:: 1] [cat:: Housing]\n"), { name: "Home", budget: null }, "Housing");
    expect(billsOf(r3)[0].category).toBe("Home");
    expect(categoriesOf(removeCategory(d, "Groceries")).map((c) => c.name)).toEqual(["Transport"]);
    expect(billsOf(removeCategory(parseConfig("- Housing\n- Rent [amount:: 1] [cat:: Housing]"), "Housing"))[0].category).toBe("Housing");
  });
  it("upserts and removes bills", () => {
    const d = parseConfig(cfg);
    const bill = (name: string, amount = -1): Bill => ({ name, amount, day: 2, category: "" });
    expect(billsOf(upsertBill(d, bill("Gym"))).map((b) => b.name)).toEqual(["Rent", "Salary", "Gym"]);
    expect(upsertBill(d, bill("Gym")).at(-1)).toMatchObject({ kind: "bill" });
    expect(billsOf(upsertBill(d, bill("Rent", -9)))[0].amount).toBe(-9);
    expect(upsertBill(d, bill("Salary"), "Rent")).toBe(d);
    expect(billsOf(upsertBill(d, bill("Home"), "Rent")).map((b) => b.name)).toEqual(["Home", "Salary"]);
    expect(billsOf(removeBill(d, "Rent")).map((b) => b.name)).toEqual(["Salary"]);
    expect(upsertBill([{ kind: "category", category: { name: "Rent", budget: null } }], bill("Rent")).length).toBe(2);
  });
});

describe("parseAmount", () => {
  it("handles both locales", () => {
    const cases: [string, number][] = [
      ["42", 42], ["42,5", 42.5], ["42.50", 42.5], ["1.234,56", 1234.56], ["1,234.56", 1234.56],
      ["R$ 1.234,56", 1234.56], [" 12 ", 12], ["1.234", 1234], ["1,234", 1234], ["-5,5", -5.5],
      ["+3", 3], ["1.234.567", 1234567], ["0,1", 0.1], ["1.005", 1005],
    ];
    for (const [s, n] of cases) expect(parseAmount(s), s).toBe(n);
  });
  it("returns null for garbage", () => {
    for (const s of ["", "  ", "abc", "-", ".", "R$", "12-3"]) expect(parseAmount(s), s).toBeNull();
  });
});

describe("stats", () => {
  it("totals avoid float drift", () => {
    expect(totals([tx("d", 0.1), tx("d", 0.2), tx("d", -0.3)])).toEqual({ income: 0.3, expense: 0.3, balance: 0 });
    expect(totals([])).toEqual({ income: 0, expense: 0, balance: 0 });
    expect(totals([tx("d", 100), tx("d", -42.5)])).toEqual({ income: 100, expense: 42.5, balance: 57.5 });
  });
  it("byCategory sums expenses, sorted", () => {
    const r = byCategory([
      tx("d", -0.1, { category: "B" }), tx("d", -0.2, { category: "B" }), tx("d", -5, { category: "A" }),
      tx("d", -0.3), tx("d", 99, { category: "A" }), tx("d", -0.3, { category: "C" }),
    ]);
    expect(r).toEqual([
      { category: "A", spent: 5 }, { category: "", spent: 0.3 }, { category: "B", spent: 0.3 }, { category: "C", spent: 0.3 },
    ]);
  });
  it("dueDate clamps to month length", () => {
    const b = (day: number): Bill => ({ name: "x", amount: 1, day, category: "" });
    expect(dueDate(b(31), "2026-02")).toBe("2026-02-28");
    expect(dueDate(b(31), "2028-02")).toBe("2028-02-29");
    expect(dueDate(b(31), "2026-04")).toBe("2026-04-30");
    expect(dueDate(b(5), "2026-11")).toBe("2026-11-05");
  });
  it("pendingBills skips settled bills and sorts", () => {
    const bs: Bill[] = [
      { name: "B", amount: -1, day: 10, category: "" }, { name: "A", amount: -1, day: 10, category: "" },
      { name: "Paid", amount: -1, day: 1, category: "" }, { name: "Early", amount: 1, day: 2, category: "" },
    ];
    const r = pendingBills(bs, [tx("2026-11-01", -1, { bill: "Paid" }), tx("2026-11-02", -1)], "2026-11");
    expect(r.map((x) => [x.bill.name, x.due])).toEqual([["Early", "2026-11-02"], ["A", "2026-11-10"], ["B", "2026-11-10"]]);
  });
  it("addMonths crosses years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 0)).toBe("2026-11");
    expect(addMonths("2026-11", 14)).toBe("2028-01");
    expect(addMonths("2026-03", -15)).toBe("2024-12");
  });
});

describe("immutability", () => {
  it("never mutates inputs", () => {
    const d = parseTxs("- 2026-11-05 -1 [cat:: A]\n- 2026-11-15 -1\n");
    const snap = JSON.stringify(d);
    addTx(d, tx("2026-11-10", -1)); updateTxAt(d, 0, tx("2026-11-20", -2)); removeTxAt(d, 0); renameCategoryInTxs(d, "A", "B");
    expect(JSON.stringify(d)).toBe(snap);
    const c = parseConfig(cfg);
    const csnap = JSON.stringify(c);
    upsertCategory(c, { name: "N", budget: 1 }, "Groceries"); upsertBill(c, { name: "N", amount: 1, day: 1, category: "" }, "Rent");
    removeCategory(c, "Groceries"); removeBill(c, "Rent");
    expect(JSON.stringify(c)).toBe(csnap);
  });
});
