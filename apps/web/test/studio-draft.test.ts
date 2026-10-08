import { enCatalog, fixture } from "@site/content";
import { createContentStore, serializeStudioBundle } from "@site/content/studio";
import { describe, expect, it } from "vitest";
import { createStudioEntity } from "../game/studio-workbench";
import {
  clearStudioDraft,
  restoreStudioDraft,
  saveStudioDraft,
  STUDIO_DRAFT_STORAGE_KEY,
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
});
