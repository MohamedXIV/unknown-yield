import { enCatalog, fixture } from "@site/content";
import {
  createContentStore,
  referencesTo,
  serializeStudioBundle,
  parseStudioBundle,
} from "@site/content/studio";
import { createStudioEntity, studioEntityIds } from "../game/studio-workbench";
import { describe, expect, it } from "vitest";
import { Simulation } from "@site/sim-core";
import { Session } from "../game/session";
import { parseRuntimePack } from "../game/runtime-content";

describe("Phase19 targeted surface-deposit authoring", () => {
  it("authors material + exposed deposit + processor + operation + reaction as one runtime pack", async () => {
    const source = structuredClone(fixture);
    const store = createContentStore(source, enCatalog);
    createStudioEntity(store, "material", "sample-ore");
    store.setCell("materials", "sample-ore", "known", true);
    createStudioEntity(store, "deposit", "southern-field");
    for (const [key, value] of Object.entries({
      material: "sample-ore", x: 5, y: 46, width: 3, height: 3, units: 370,
    })) store.setCell("deposits", "southern-field", key, value);
    createStudioEntity(store, "operation", "polish");
    createStudioEntity(store, "machine", "polisher");
    createStudioEntity(store, "reaction", "polish-sample-ore");
    store.setCell("machines", "polisher", "role", "processor");
    store.setCell("machines", "polisher", "operationsJson", '["polish"]');
    store.setCell("reactions", "polish-sample-ore", "input", "sample-ore");
    store.setCell("reactions", "polish-sample-ore", "operation", "polish");
    store.setCell("reactions", "polish-sample-ore", "output", "granules");
    expect(studioEntityIds(store, "deposit")).toContain("southern-field");
    expect(referencesTo(
      parseStudioBundle(serializeStudioBundle(store, source)).content,
      "material", "sample-ore",
    )).toContainEqual({
      targetType: "material", targetId: "sample-ore", sourceType: "deposit",
      sourceId: "southern-field", field: "material",
    });
    const packed = parseStudioBundle(serializeStudioBundle(store, source));
    // Only the explicitly authored surface-deposit table is rebuilt. No
    // implicit hidden-source, survey, terminal or economy mutations.
    const { deposits: authoredDeposits, ...otherSite } = packed.content.site;
    const { deposits: originalDeposits, ...originalSite } = source.site;
    expect(otherSite).toEqual(originalSite);
    expect(packed.content.economy).toEqual(source.economy);
    expect(packed.content.site.deposits.slice(0, originalDeposits.length)).toEqual(originalDeposits);
    expect(authoredDeposits).toHaveLength(originalDeposits.length + 1);
    expect(packed.content.site.deposits.find((d) => d.id === "southern-field")).toEqual({
      id: "southern-field", material: "sample-ore", x: 5, y: 46, width: 3,
      height: 3, units: 370,
    });
    expect(packed.content.machines.some((m) => m.id === "polisher")).toBe(true);
    expect(packed.content.operations.some((o) => o.id === "polish")).toBe(true);
    expect(packed.content.reactions.some((rx) => rx.id === "polish-sample-ore")).toBe(true);
    const runtimePack = await parseRuntimePack(serializeStudioBundle(store, source));
    const session = new Session();
    session.usePack(runtimePack);
    expect(session.snapshot().definitions.some((d) => d.id === "polisher")).toBe(true);
    // Confirm authored material can actually be extracted and the newly
    // defined processor placed through the authoritative command path.
    const extractor = session.command({
      type: "placeMachine", definitionId: "extractor", x: 5, y: 46, direction: 0,
    });
    expect(extractor.ok, extractor.message).toBe(true);
    const factory = session.command({
      type: "placeFactory", x: 32, y: 40, width: 8, height: 8,
    });
    expect(factory.ok, factory.message).toBe(true);
    const processor = session.command({
      type: "placeMachine", definitionId: "polisher", x: 34, y: 43, direction: 0,
    });
    expect(processor.ok, processor.message).toBe(true);
    expect(session.snapshot().machines.some((m) => m.definitionId === "polisher")).toBe(true);
    expect(new Simulation(packed.content).snapshot().deposits).toContainEqual(
      expect.objectContaining({ id: "southern-field", material: "sample-ore", remaining: 370 }),
    );
    expect(session.snapshot().deposits.some((d) => d.id === "southern-field" && d.remaining === 370)).toBe(true);
    expect(fixture.site.deposits.some((d) => d.id === "southern-field")).toBe(false);
  });

  it("rejects invalid site geometry, unknown ores and overlapping deposits before export", () => {
    const store = createContentStore(fixture, enCatalog);
    createStudioEntity(store, "deposit", "bad-placement");
    store.setCell("deposits", "bad-placement", "x", 79);
    store.setCell("deposits", "bad-placement", "width", 4);
    expect(() => serializeStudioBundle(store, fixture)).toThrow(/outside map/);
    store.setCell("deposits", "bad-placement", "x", 15);
    store.setCell("deposits", "bad-placement", "y", 25);
    store.setCell("deposits", "bad-placement", "width", 3);
    expect(() => serializeStudioBundle(store, fixture)).toThrow(/Overlapping site regions/);
    store.setCell("deposits", "bad-placement", "x", 5);
    store.setCell("deposits", "bad-placement", "y", 46);
    store.setCell("deposits", "bad-placement", "material", "granules");
    expect(() => serializeStudioBundle(store, fixture)).toThrow(/Deposit material must be known/);
  });
});
