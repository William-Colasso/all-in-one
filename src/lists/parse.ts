import type { Item, ItemDoc, ItemRef, Wish, WishDoc, WishRef } from "./types";

const lines = (md: string) => {
  const ls = md.split(/\r?\n/);
  if (ls[ls.length - 1] === "") ls.pop();
  return ls;
};
const join = (ls: string[]) => (ls.length ? ls.join("\n") + "\n" : "");

const CHECK = /^- \[([ xX])\]\s+(.*)$/;
const box = (done: boolean) => (done ? "[x]" : "[ ]");

// ---- generic line helpers (index-based; no-ops when the index isn't a line of `kind`) ----

type L = { kind: string };
const insertAfterLast = <T extends L>(doc: T[], kind: string, line: T): T[] => {
  const at = doc.findLastIndex((l) => l.kind === kind) + 1 || doc.length;
  return [...doc.slice(0, at), line, ...doc.slice(at)];
};
const replaceAt = <T extends L>(doc: T[], kind: string, i: number, f: (l: T) => T): T[] =>
  doc[i]?.kind === kind ? doc.map((l, j) => (j === i ? f(l) : l)) : doc;
const removeAt = <T extends L>(doc: T[], kind: string, i: number): T[] => (doc[i]?.kind === kind ? doc.filter((_, j) => j !== i) : doc);

// ---- shopping list ----

export function cleanText(text: string): string {
  return text.replace(/::/g, "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
}

function parseItem(raw: string): ItemDoc[number] {
  const m = CHECK.exec(raw);
  const text = m?.[2].trim();
  return m && text ? { kind: "item", item: { text, done: m[1] !== " " } } : { kind: "other", raw };
}

export function parseItems(md: string): ItemDoc {
  return md === "" ? [] : lines(md).map(parseItem);
}

export function serializeItems(doc: ItemDoc): string {
  return join(doc.map((l) => (l.kind === "other" ? l.raw : `- ${box(l.item.done)} ${l.item.text}`)));
}

export function itemsOf(doc: ItemDoc): ItemRef[] {
  return doc.flatMap((l, index) => (l.kind === "item" ? [{ index, item: l.item }] : []));
}

export function sameItem(a: Item, b: Item): boolean {
  return a.text === b.text && a.done === b.done;
}

export function addItem(doc: ItemDoc, text: string): ItemDoc {
  const t = cleanText(text);
  if (!t) return doc;
  const i = doc.findIndex((l) => l.kind === "item" && l.item.text.toLowerCase() === t.toLowerCase());
  if (i >= 0) return (doc[i] as { item: Item }).item.done ? toggleItemAt(doc, i) : doc;
  return insertAfterLast(doc, "item", { kind: "item", item: { text: t, done: false } });
}

export function toggleItemAt(doc: ItemDoc, index: number): ItemDoc {
  return replaceAt(doc, "item", index, (l) => (l.kind === "item" ? { kind: "item", item: { ...l.item, done: !l.item.done } } : l));
}

export function updateItemAt(doc: ItemDoc, index: number, text: string): ItemDoc {
  const t = cleanText(text);
  if (!t) return doc;
  return replaceAt(doc, "item", index, (l) => (l.kind === "item" ? { kind: "item", item: { ...l.item, text: t } } : l));
}

export function removeItemAt(doc: ItemDoc, index: number): ItemDoc {
  return removeAt(doc, "item", index);
}

export function clearDone(doc: ItemDoc): ItemDoc {
  return doc.filter((l) => !(l.kind === "item" && l.item.done));
}

// ---- wishlist ----

export function cleanLink(input: string): string {
  const s = input.trim();
  return /^https?:\/\//.test(s) && !/[\s\]]/.test(s) ? s : "";
}

const FIELD = /\[(price|link)::\s*([^\]]*)\]/gi;

function parseWish(raw: string): WishDoc[number] {
  const m = CHECK.exec(raw);
  if (!m) return { kind: "other", raw };
  let price: number | null = null;
  let link = "";
  const text = m[2]
    .replace(FIELD, (all, k: string, v: string) => {
      if (k.toLowerCase() === "price") {
        const n = /^\d*[.,]?\d+$/.test(v.trim()) ? Number(v.trim().replace(",", ".")) : 0;
        if (n <= 0) return all; // invalid fields stay in the text
        price ??= n;
      } else {
        const u = cleanLink(v);
        if (!u) return all;
        link ||= u;
      }
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return text ? { kind: "wish", wish: { text, done: m[1] !== " ", price, link } } : { kind: "other", raw };
}

export function parseWishes(md: string): WishDoc {
  return md === "" ? [] : lines(md).map(parseWish);
}

export function serializeWishes(doc: WishDoc): string {
  return join(
    doc.map((l) => {
      if (l.kind === "other") return l.raw;
      const w = l.wish;
      return `- ${box(w.done)} ${w.text}` + (w.price !== null ? ` [price:: ${w.price}]` : "") + (w.link ? ` [link:: ${w.link}]` : "");
    }),
  );
}

export function wishesOf(doc: WishDoc): WishRef[] {
  return doc.flatMap((l, index) => (l.kind === "wish" ? [{ index, wish: l.wish }] : []));
}

export function sameWish(a: Wish, b: Wish): boolean {
  return a.text === b.text && a.done === b.done && a.price === b.price && a.link === b.link;
}

export function addWish(doc: WishDoc, wish: Wish): WishDoc {
  return insertAfterLast(doc, "wish", { kind: "wish", wish });
}

export function updateWishAt(doc: WishDoc, index: number, wish: Wish): WishDoc {
  return replaceAt(doc, "wish", index, () => ({ kind: "wish", wish }));
}

export function removeWishAt(doc: WishDoc, index: number): WishDoc {
  return removeAt(doc, "wish", index);
}
