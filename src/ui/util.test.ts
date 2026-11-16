import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: class {}, getLanguage: () => "en" }));

import { parseDoc, toggleTask } from "../tasks/parse";
import { addDays, onRef, refs } from "./util";

describe("ui util", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("filters by list and sorts by priority", () => {
    const doc = parseDoc("- [ ] a\n## Home\n- [ ] b\n- [ ] c ⏫\n");
    expect(refs(doc, "Home", (t) => !t.done).map((r) => r.task.text)).toEqual(["c", "b"]);
    expect(refs(doc, null, () => true)).toHaveLength(3);
  });

  it("refuses to mutate a task that moved in the file", () => {
    const doc = parseDoc("- [ ] a\n- [ ] b\n");
    const ref = refs(doc, null, (t) => t.text === "b")[0];
    const toggle = onRef(ref, (d) => toggleTask(d, ref.index, "2026-11-15"));
    expect(() => toggle(doc)).not.toThrow();
    expect(() => toggle(parseDoc("- [ ] b\n- [ ] a\n"))).toThrow();
  });
});
