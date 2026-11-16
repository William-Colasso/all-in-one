import { describe, it, expect } from "vitest";
import {
  addItem, addWish, clearDone, cleanLink, cleanText, itemsOf, parseItems, parseWishes, removeItemAt, removeWishAt, sameItem,
  sameWish, serializeItems, serializeWishes, toggleItemAt, updateItemAt, updateWishAt, wishesOf,
} from "./parse";
import type { Wish } from "./types";

const w = (text: string, extra: Partial<Wish> = {}): Wish => ({ text, done: false, price: null, link: "", ...extra });
const items = (md: string) => itemsOf(parseItems(md)).map((r) => r.item);
const wishes = (md: string) => wishesOf(parseWishes(md)).map((r) => r.wish);

describe("shopping list", () => {
  it("parses items and leaves everything else as other", () => {
    expect(items("- [ ] Milk\n- [x] Bread\n- [X] Eggs")).toEqual([
      { text: "Milk", done: false }, { text: "Bread", done: true }, { text: "Eggs", done: true },
    ]);
    const md = "# Shop\n- plain\n- [ ]\n- [ ] \n  - [ ] nested\n1. [ ] x\n\n";
    expect(items(md)).toEqual([]);
    expect(serializeItems(parseItems(md))).toBe(md);
  });
  it("round-trips canonical files and normalizes newlines", () => {
    const md = "# Shop\n- [ ] Milk\ntext\n- [x] Bread\n";
    expect(serializeItems(parseItems(md))).toBe(md);
    expect(serializeItems(parseItems(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeItems(parseItems(""))).toBe("");
    expect(serializeItems(parseItems("- [ ] A"))).toBe("- [ ] A\n");
    expect(serializeItems(parseItems("- [X] A\n"))).toBe("- [x] A\n");
  });
  it("sameItem", () => {
    expect(sameItem({ text: "a", done: false }, { text: "a", done: false })).toBe(true);
    expect(sameItem({ text: "a", done: false }, { text: "a", done: true })).toBe(false);
  });
  it("cleanText", () => {
    expect(cleanText("  Milk [2L]:: \n whole ")).toBe("Milk 2L whole");
  });
  it("addItem appends after the last item", () => {
    const doc = parseItems("# S\n- [ ] A\nnote\n- [x] B\nend\n");
    expect(serializeItems(addItem(doc, " C "))).toBe("# S\n- [ ] A\nnote\n- [x] B\n- [ ] C\nend\n");
    expect(serializeItems(addItem([], "C"))).toBe("- [ ] C\n");
    expect(serializeItems(addItem(parseItems("# S\n"), "C"))).toBe("# S\n- [ ] C\n");
    expect(addItem(doc, "  ")).toBe(doc);
  });
  it("addItem duplicate rules", () => {
    const doc = parseItems("- [ ] Milk\n- [x] Bread\n");
    expect(addItem(doc, "milk")).toBe(doc);
    expect(serializeItems(addItem(doc, "BREAD"))).toBe("- [ ] Milk\n- [ ] Bread\n");
  });
  it("toggle, update, remove, clearDone", () => {
    const doc = parseItems("# S\n- [ ] A\n- [x] B\n- [x] C\n");
    expect(serializeItems(toggleItemAt(doc, 1))).toBe("# S\n- [x] A\n- [x] B\n- [x] C\n");
    expect(serializeItems(toggleItemAt(doc, 2))).toBe("# S\n- [ ] A\n- [ ] B\n- [x] C\n");
    expect(serializeItems(updateItemAt(doc, 2, " Bb "))).toBe("# S\n- [ ] A\n- [x] Bb\n- [x] C\n");
    expect(updateItemAt(doc, 2, " ")).toBe(doc);
    expect(serializeItems(removeItemAt(doc, 1))).toBe("# S\n- [x] B\n- [x] C\n");
    expect(serializeItems(clearDone(doc))).toBe("# S\n- [ ] A\n");
    for (const f of [toggleItemAt, removeItemAt]) {
      expect(f(doc, 0)).toBe(doc);
      expect(f(doc, 99)).toBe(doc);
    }
    expect(updateItemAt(doc, 0, "x")).toBe(doc);
  });
  it("does not mutate", () => {
    const doc = parseItems("- [ ] A\n- [x] B\n");
    const s = JSON.stringify(doc);
    addItem(doc, "C"); addItem(doc, "b"); toggleItemAt(doc, 0); updateItemAt(doc, 0, "z"); removeItemAt(doc, 0); clearDone(doc);
    expect(JSON.stringify(doc)).toBe(s);
  });
});

describe("wishlist", () => {
  it("parses price and link in any order", () => {
    expect(wishes("- [ ] Keyboard [price:: 450] [link:: https://example.com/kb]")).toEqual([
      w("Keyboard", { price: 450, link: "https://example.com/kb" }),
    ]);
    expect(wishes("- [x] [link:: http://a.b/c?x=1,2] Mouse [price:: 19,90]")).toEqual([
      w("Mouse", { done: true, price: 19.9, link: "http://a.b/c?x=1,2" }),
    ]);
    expect(wishes("- [ ] Plain")).toEqual([w("Plain")]);
  });
  it("keeps invalid and unknown fields in the text", () => {
    expect(wishes("- [ ] A [price:: abc]")).toEqual([w("A [price:: abc]")]);
    expect(wishes("- [ ] A [price:: 0]")).toEqual([w("A [price:: 0]")]);
    expect(wishes("- [ ] A [price:: -5]")).toEqual([w("A [price:: -5]")]);
    expect(wishes("- [ ] A [link:: ftp://x]")).toEqual([w("A [link:: ftp://x]")]);
    expect(wishes("- [ ] A [link:: https://x y]")).toEqual([w("A [link:: https://x y]")]);
    expect(wishes("- [ ] A [color:: red]")).toEqual([w("A [color:: red]")]);
  });
  it("treats empty text and non-checkbox lines as other", () => {
    const md = "# W\n- [ ] [price:: 5]\n- [ ]\n- text\n\n";
    expect(wishes(md)).toEqual([]);
    expect(serializeWishes(parseWishes(md))).toBe(md);
  });
  it("round-trips canonical files and prints numbers cleanly", () => {
    const md = "# W\n- [ ] Keyboard [price:: 450] [link:: https://example.com/kb]\n- [x] Mouse [price:: 199.9]\nnote\n- [ ] Pen [price:: 2.5]\n";
    expect(serializeWishes(parseWishes(md))).toBe(md);
    expect(serializeWishes(parseWishes(md.replace(/\n/g, "\r\n")))).toBe(md);
    expect(serializeWishes(parseWishes("- [ ] A [price:: 450.00]"))).toBe("- [ ] A [price:: 450]\n");
    expect(serializeWishes(parseWishes(""))).toBe("");
  });
  it("add, update, remove with index guards", () => {
    const doc = parseWishes("# W\n- [ ] A\nnote\n");
    const added = addWish(doc, w("B", { price: 3 }));
    expect(serializeWishes(added)).toBe("# W\n- [ ] A\n- [ ] B [price:: 3]\nnote\n");
    expect(serializeWishes(addWish([], w("B")))).toBe("- [ ] B\n");
    expect(serializeWishes(updateWishAt(doc, 1, w("A", { done: true, link: "https://x.y" })))).toBe("# W\n- [x] A [link:: https://x.y]\nnote\n");
    expect(serializeWishes(removeWishAt(doc, 1))).toBe("# W\nnote\n");
    expect(updateWishAt(doc, 0, w("x"))).toBe(doc);
    expect(updateWishAt(doc, 9, w("x"))).toBe(doc);
    expect(removeWishAt(doc, 2)).toBe(doc);
    expect(JSON.stringify(doc)).toBe(JSON.stringify(parseWishes("# W\n- [ ] A\nnote\n")));
  });
  it("sameWish", () => {
    expect(sameWish(w("a", { price: 1 }), w("a", { price: 1 }))).toBe(true);
    for (const o of [w("b"), w("a", { done: true }), w("a", { price: 2 }), w("a", { link: "https://x" })]) expect(sameWish(w("a"), o)).toBe(false);
  });
  it("cleanLink", () => {
    expect(cleanLink("  https://a.b/c  ")).toBe("https://a.b/c");
    expect(cleanLink("http://a.b")).toBe("http://a.b");
    for (const bad of ["", "a.b", "ftp://a", "https://a b", "https://a]b"]) expect(cleanLink(bad)).toBe("");
  });
});
