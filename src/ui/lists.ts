import type { ItemDoc, ItemRef, WishDoc, WishRef } from "../lists/types";
import { sameItem, sameWish } from "../lists/parse";

/** Like onEvent: aborts (no write) if the line at ref.index is no longer that item. */
export const onItem = (ref: ItemRef, fn: (doc: ItemDoc) => ItemDoc) => (doc: ItemDoc) => {
  const line = doc[ref.index];
  if (line?.kind !== "item" || !sameItem(line.item, ref.item)) throw new Error("Item moved in file");
  return fn(doc);
};

/** Like onEvent: aborts (no write) if the line at ref.index is no longer that wish. */
export const onWish = (ref: WishRef, fn: (doc: WishDoc) => WishDoc) => (doc: WishDoc) => {
  const line = doc[ref.index];
  if (line?.kind !== "wish" || !sameWish(line.wish, ref.wish)) throw new Error("Wish moved in file");
  return fn(doc);
};
