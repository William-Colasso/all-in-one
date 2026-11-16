/** One line of a shopping list note: `- [ ] Milk` / `- [x] Bread`. */
export interface Item {
  text: string;
  done: boolean;
}
export type ItemLine = { kind: "item"; item: Item } | { kind: "other"; raw: string };
export type ItemDoc = ItemLine[];

export interface ItemRef {
  index: number;
  item: Item;
}

/** A shopping list: one note in the lists folder, named after the list. */
export interface ShoppingList {
  /** Note name without extension. Unique id. */
  name: string;
  items: ItemRef[];
}

/**
 * One line of the wishlist file:
 * `- [ ] Mechanical keyboard [price:: 450] [link:: https://example.com/kb]`. Checked = already bought.
 */
export interface Wish {
  text: string;
  done: boolean;
  price: number | null;
  /** "" = none */
  link: string;
}
export type WishLine = { kind: "wish"; wish: Wish } | { kind: "other"; raw: string };
export type WishDoc = WishLine[];

export interface WishRef {
  index: number;
  wish: Wish;
}
