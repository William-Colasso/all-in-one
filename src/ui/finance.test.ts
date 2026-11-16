import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: class {}, getLanguage: () => "en" }));

import type { Tx, TxRef } from "../finance/types";
import { amountInput, byDay, categoryRows, money } from "./finance";

const tx = (date: string, amount: number, category = ""): Tx => ({ date, amount, text: "", category, bill: null });
const ref = (index: number, t: Tx): TxRef => ({ month: t.date.slice(0, 7), index, tx: t });

describe("finance ui helpers", () => {
  it("formats signed amounts", () => {
    expect(money(-42.5, "USD", true)).toBe("-$42.50");
    expect(money(10, "USD", true)).toBe("+$10.00");
    expect(money(-3, "USD")).toBe("-$3.00");
    expect(amountInput(1234.5)).toBe("1234.5");
  });

  it("lists budgeted and spent categories, most spent first", () => {
    const rows = categoryRows(
      [
        { name: "Food", budget: 100 },
        { name: "Fun", budget: 50 },
        { name: "Car", budget: null },
      ],
      [tx("2026-11-01", -30, "Food"), tx("2026-11-02", -80, "Car"), tx("2026-11-03", 500, "Salary"), tx("2026-11-04", -5)],
    );
    expect(rows).toEqual([
      { category: "Car", spent: 80, budget: null },
      { category: "Food", spent: 30, budget: 100 },
      { category: "", spent: 5, budget: null },
      { category: "Fun", spent: 0, budget: 50 },
    ]);
  });

  it("groups by day, newest first", () => {
    const refs = [ref(0, tx("2026-11-01", -1)), ref(1, tx("2026-11-03", -2)), ref(2, tx("2026-11-01", -3))];
    expect(byDay(refs).map(([d, rs]) => [d, rs.map((r) => r.index)])).toEqual([
      ["2026-11-03", [1]],
      ["2026-11-01", [2, 0]],
    ]);
  });
});
