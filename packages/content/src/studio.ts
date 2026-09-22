import { createStore, type Store } from "tinybase";
import { validateContent, type Content } from "./schema";
export function createContentStore(content: Content) {
  return createStore().setTable(
    "materials",
    Object.fromEntries(content.materials.map(({ id, ...row }) => [id, row])),
  );
}
export function contentFromStore(store: Store, base: Content): Content {
  return validateContent({
    ...base,
    materials: Object.entries(store.getTable("materials")).map(([id, row]) => ({
      id,
      ...row,
    })),
  });
}
