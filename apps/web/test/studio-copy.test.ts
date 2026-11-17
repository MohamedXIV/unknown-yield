import { enCatalog, fixture } from "@site/content";
import { createContentStore } from "@site/content/studio";
import { describe, expect, it } from "vitest";
import {
  addStudioCopyKey,
  copyEntries,
  filterCopy,
  namespaceOf,
} from "../game/studio-copy";
import { setStudioLocaleText, studioLocaleText } from "../game/studio-workbench";

const fresh = () => createContentStore(fixture, enCatalog);

describe("Studio copy browser", () => {
  it("lists every catalog key, sorted, and marks the ones content refers to", () => {
    const store = fresh();
    const used = new Set(["material.gas-0.name"]);
    const entries = copyEntries(store, used);
    expect(entries).toHaveLength(Object.keys(enCatalog).length);
    const keys = entries.map((entry) => entry.key);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
    expect(entries.find((e) => e.key === "material.gas-0.name")?.inContent).toBe(true);
    expect(entries.find((e) => e.key === "ui.menu.new.designation")?.inContent).toBe(false);
  });

  it("filters by namespace and by key or wording", () => {
    const entries = copyEntries(fresh(), new Set());
    expect(namespaceOf("ui.menu.new.title")).toBe("ui");
    const menu = filterCopy(entries, "", "ui").length;
    expect(menu).toBeGreaterThan(0);
    expect(filterCopy(entries, "", "").length).toBe(entries.length);
    const byWording = filterCopy(entries, "PROCESS VAPOR", "");
    expect(byWording.some((entry) => entry.key === "material.gas-0.name")).toBe(true);
    expect(filterCopy(entries, "zzzz-no-such-text", "")).toEqual([]);
  });

  it("edits wording in place and adds new keys with validation", () => {
    const store = fresh();
    setStudioLocaleText(store, "material.gas-0.name", "Still vapor");
    expect(studioLocaleText(store, "material.gas-0.name")).toBe("Still vapor");

    expect(addStudioCopyKey(store, " ui.test.added ", "Hello")).toBe("ui.test.added");
    expect(studioLocaleText(store, "ui.test.added")).toBe("Hello");
    expect(() => addStudioCopyKey(store, "ui.test.added", "Again")).toThrow(/already exists/);
    expect(() => addStudioCopyKey(store, "Bad Key", "x")).toThrow(/dotted lowercase/);
    expect(() => addStudioCopyKey(store, "ui.test.empty", "  ")).toThrow(/needs some text/);
  });
});
