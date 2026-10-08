import { enCatalog, fixture } from "@site/content";
import { createContentStore, serializeStudioBundle } from "@site/content/studio";
import { describe, expect, it } from "vitest";
import { createStudioEntity } from "../game/studio-workbench";
import {
  clearStudioDraft,
  restoreStudioDraft,
  saveStudioDraft,
  STUDIO_DRAFT_STORAGE_KEY,
  STUDIO_DRAFT_SCHEMA_VERSION,
} from "../game/studio-draft";

describe("Studio draft persistence and explicit publish separation", () => {
  it("preserves invalid in-progress edits, including new entities, through a reload", () => {
    const records = new Map<string, string>();
    const storage = {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => { records.set(key, value); },
      removeItem: (key: string) => { records.delete(key); },
    };
    const store = createContentStore(fixture, enCatalog);
    createStudioEntity(store, "material", "unfinished");
    createStudioEntity(store, "reaction", "new-reaction");
    store.setCell("reactions", "new-reaction", "output", "missing-material");
    expect(() => serializeStudioBundle(store, fixture)).toThrow();
    saveStudioDraft(storage, fixture, store);
    expect(records.has(STUDIO_DRAFT_STORAGE_KEY)).toBe(true);

    const restored = restoreStudioDraft(storage)!;
    expect(restored.base).toEqual(fixture);
    expect(restored.store.getTables()).toEqual(store.getTables());
    expect(restored.store.hasRow("materials", "unfinished")).toBe(true);
    expect(() => serializeStudioBundle(restored.store, restored.base)).toThrow();

    clearStudioDraft(storage);
    expect(restoreStudioDraft(storage)).toBeNull();
  });

  it("rejects a corrupt draft without modifying valid published content", () => {
    expect(() => restoreStudioDraft({
      getItem: () => "{broken",
    })).toThrow(/JSON/);
    expect(() => restoreStudioDraft({
      getItem: () => JSON.stringify({ schema: 1, base: fixture, tables: "invalid" }),
    })).toThrow(/metadata/);
    expect(fixture.machines.find((item) => item.id === "crusher")).toBeTruthy();
  });
  it("upgrades a pre-#254 v1 draft missing deposits without discarding authored edits", () => {
    const store = createContentStore(fixture, enCatalog);
    store.setCell("machines", "crusher", "cost", 57);
    createStudioEntity(store, "material", "saved-ore");
    const oldTables = { ...store.getTables() };
    delete oldTables.deposits;
    const oldValue = JSON.stringify({ schema: 1, base: fixture, tables: oldTables });
    const recovered = restoreStudioDraft({
      getItem: (key) => key === STUDIO_DRAFT_STORAGE_KEY ? oldValue : null,
    })!;
    expect(recovered.store.getRowIds("deposits")).toEqual(
      fixture.site.deposits.map((deposit) => deposit.id),
    );
    expect(recovered.store.getCell("machines", "crusher", "cost")).toBe(57);
    expect(recovered.store.hasRow("materials", "saved-ore")).toBe(true);
    const bundle = JSON.parse(serializeStudioBundle(recovered.store, recovered.base));
    expect(bundle.content.site.deposits).toEqual(fixture.site.deposits);
    expect(bundle.content.machines.find((m: { id: string }) => m.id === "crusher").cost).toBe(57);
  });

  it("keeps deliberately empty deposits absent in new v2 drafts", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const store = createContentStore(fixture, enCatalog);
    for (const id of store.getRowIds("deposits")) store.delRow("deposits", id);
    expect(store.getRowIds("deposits")).toEqual([]);
    saveStudioDraft(storage, fixture, store);
    const raw = JSON.parse(values.get(STUDIO_DRAFT_STORAGE_KEY)!);
    expect(raw.schema).toBe(STUDIO_DRAFT_SCHEMA_VERSION);
    const restored = restoreStudioDraft(storage)!;
    expect(restored.store.getRowIds("deposits")).toEqual([]);
    expect(restored.store.getTables()).toEqual(store.getTables());
  });

  it("preserves an explicitly authored deposits table in a legacy v1 draft", () => {
    const store = createContentStore(fixture, enCatalog);
    store.setCell("deposits", "ferrite-field", "units", 420);
    const raw = JSON.stringify({ schema: 1, base: fixture, tables: store.getTables() });
    const restored = restoreStudioDraft({ getItem: () => raw })!;
    expect(restored.store.getCell("deposits", "ferrite-field", "units")).toBe(420);
  });

  it("rejects unsupported draft payload versions", () => {
    const tables = createContentStore(fixture, enCatalog).getTables();
    expect(() => restoreStudioDraft({
      getItem: () => JSON.stringify({ schema: 99, base: fixture, tables }),
    })).toThrow(/metadata/);
  });

});
