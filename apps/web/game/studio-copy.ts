import { localeKeySchema } from "@site/content/locale";
import {
  setStudioLocaleText,
  studioLocaleText,
  type ContentStore,
} from "./studio-workbench";

export type CopyEntry = {
  key: string;
  text: string;
  namespace: string;
  /** True when authored content refers to this key, so it must keep existing. */
  inContent: boolean;
};

export const namespaceOf = (key: string) => key.split(".")[0] ?? key;

export function copyEntries(
  store: ContentStore,
  contentKeys: ReadonlySet<string>,
): CopyEntry[] {
  return store
    .getRowIds("locale")
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      text: studioLocaleText(store, key),
      namespace: namespaceOf(key),
      inContent: contentKeys.has(key),
    }));
}

export function filterCopy(
  entries: readonly CopyEntry[],
  query: string,
  namespace: string,
): CopyEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (!namespace || entry.namespace === namespace) &&
      (!needle ||
        entry.key.toLowerCase().includes(needle) ||
        entry.text.toLowerCase().includes(needle)),
  );
}

export function addStudioCopyKey(
  store: ContentStore,
  key: string,
  text: string,
): string {
  const clean = key.trim();
  if (!localeKeySchema.safeParse(clean).success)
    throw new Error(
      "Key must be dotted lowercase segments, for example ui.menu.new.title",
    );
  if (store.hasRow("locale", clean))
    throw new Error("Copy key already exists: " + clean);
  if (!text.trim()) throw new Error("New copy needs some text");
  setStudioLocaleText(store, clean, text);
  return clean;
}
