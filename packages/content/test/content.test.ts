import { describe, it, expect } from "vitest";
import { fixture, validateContent } from "../src/index";
import { createContentStore, contentFromStore } from "../src/studio";

describe("content boundary", () => {
  it("accepts the complete tiny scenario", () => {
    expect(validateContent(fixture).machines).toHaveLength(3);
  });
  it.each([
    "duplicate",
    "reference",
    "capability",
    "capacity",
    "fuel",
    "export",
  ] as const)("rejects invalid %s", (kind) => {
    const c = structuredClone(fixture);
    if (kind === "duplicate") c.materials.push(c.materials[0]);
    if (kind === "reference") c.reactions[0].output = "missing";
    if (kind === "capability") c.operations[0].id = "unavailable";
    if (kind === "capacity") c.machines[0].capacity = 0;
    if (kind === "fuel") c.economy.grant = -1;
    if (kind === "export") c.materials[1].exportValue = -1;
    expect(() => validateContent(c)).toThrow();
  });
  it("round-trips a material edit through TinyBase and validation", () => {
    const store = createContentStore(fixture);
    store.setCell("materials", "raw", "name", "Edited ore");
    const exported = contentFromStore(store, fixture);
    expect(exported.materials.find((m) => m.id === "raw")?.name).toBe(
      "Edited ore",
    );
    expect(fixture.materials.find((m) => m.id === "raw")?.name).not.toBe(
      "Edited ore",
    );
    expect(validateContent(JSON.parse(JSON.stringify(exported)))).toEqual(
      exported,
    );
    store.setCell("materials", "raw", "exportValue", -5);
    expect(() => contentFromStore(store, fixture)).toThrow();
  });
});
