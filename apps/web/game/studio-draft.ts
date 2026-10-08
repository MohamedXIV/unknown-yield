import {
  enCatalog,
  validateSimulationContent,
  type Content,
} from "@site/content";
import { createContentStore } from "@site/content/studio";

export const STUDIO_DRAFT_STORAGE_KEY = "unknown-yield-studio-draft-v1";
// Draft payload versions are independent of both the player save schema and
// the storage key. v1 predates surface-deposit authoring; v2 records whether
// a missing deposits table is an intentional empty edit.
export const STUDIO_DRAFT_SCHEMA_VERSION = 2 as const;
const MAX_STUDIO_DRAFT_BYTES = 2 * 1024 * 1024;
type DraftStore = ReturnType<typeof createContentStore>;
type Reader = { getItem(key: string): string | null };
type Writer = { setItem(key: string, value: string): void };
type Remover = { removeItem(key: string): void };

/**
 * Drafts may be incomplete and intentionally DO NOT pass publish validation.
 * Capture TinyBase tables and the last *validated* base independently of
 * expedition saves. Importing a published bundle updates that base explicitly.
 */
export function saveStudioDraft(storage: Writer, base: Content, store: DraftStore): void {
  const raw = JSON.stringify({
    schema: STUDIO_DRAFT_SCHEMA_VERSION,
    base,
    tables: store.getTables(),
  });
  if (new TextEncoder().encode(raw).byteLength > MAX_STUDIO_DRAFT_BYTES)
    throw new Error("Studio draft exceeds the 2 MiB local storage limit");
  storage.setItem(STUDIO_DRAFT_STORAGE_KEY, raw);
}

export function restoreStudioDraft(
  storage: Reader,
): { base: Content; store: DraftStore } | null {
  const raw = storage.getItem(STUDIO_DRAFT_STORAGE_KEY);
  if (raw === null) return null;
  if (new TextEncoder().encode(raw).byteLength > MAX_STUDIO_DRAFT_BYTES)
    throw new Error("Stored Studio draft exceeds the 2 MiB limit");
  let input: unknown;
  try {
    input = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Stored Studio draft is not valid JSON");
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Stored Studio draft is not an object");
  const record = input as Record<string, unknown>;
  if ((record.schema !== 1 && record.schema !== STUDIO_DRAFT_SCHEMA_VERSION) ||
    !record.tables || typeof record.tables !== "object" ||
    Array.isArray(record.tables))
    throw new Error("Stored Studio draft has invalid metadata");
  // The base is an accepted content snapshot. Draft tables themselves may
  // contain incomplete/invalid edits and are validated only on publish.
  const base = validateSimulationContent(record.base);
  const store = createContentStore(base, enCatalog);
  const tables = record.tables as Parameters<typeof store.setTables>[0];
  // Older (schema 1) drafts were written before deposits became an editable
  // Studio table in #254. setTables() replaces every table, so simply loading
  // those records would erase the original site resource fields on export.
  // In schema 2, however, a missing table can mean the designer deliberately
  // deleted ALL surface deposits. Never resurrect them in that case.
  const legacyMissingDeposits =
    record.schema === 1 && !Object.prototype.hasOwnProperty.call(tables, "deposits");
  store.setTables(tables);
  if (legacyMissingDeposits) {
    store.setTable(
      "deposits",
      Object.fromEntries(base.site.deposits.map(({ id, ...row }) => [id, row])),
    );
  }
  return { base, store };
}

export function clearStudioDraft(storage: Remover): void {
  storage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
}
