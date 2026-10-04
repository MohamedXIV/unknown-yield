import { historicalFixture } from "./historical-content";
import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import { parseSave } from "../src/save";
import { Simulation, auditLedger } from "../src/index";

describe("gas persistence foundation", () => {
  it("rejects malformed gas identity and occupancy without mutating the world", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({
        type: "placePressureLines",
        points: [{ x: 10, y: 10, inlet: 2, outlet: 0 }],
      }).ok,
    ).toBe(true);
    const before = sim.serialize();
    for (const mutation of [
      (s: typeof before) => {
        s.pressureLines["10,10"].quantity = 1;
      },
      (s: typeof before) => {
        s.pressureLines["10,10"].materialId = "raw";
      },
      (s: typeof before) => {
        s.pressureLines["10,10"].outlet = 2;
      },
      (s: typeof before) => {
        s.pressureLines["10,10"].x = 11;
      },
      (s: typeof before) => {
        s.belts["10,10"] = {
          id: "b2",
          x: 10,
          y: 10,
          direction: 0,
          cargo: null,
          alternate: null,
          switched: false,
        };
        s.nextId = 3;
        s.stock.plates -= fixture.site.beltCost;
      },
    ]) {
      const bad = structuredClone(before);
      mutation(bad);
      expect(sim.load(bad).ok).toBe(false);
      expect(sim.serialize()).toEqual(before);
    }
  });
  it("starts with explicit empty physical gas locations in schema 15", () => {
    const sim = new Simulation(fixture);
    expect(sim.serialize().schemaVersion).toBe(18);
    expect(sim.serialize().pressureLines).toEqual({});
    expect(sim.serialize().pressureVessels).toEqual({});
    expect(sim.serialize().compressors).toEqual({});
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
  it("rejects impossible gas capacity without replacing current state", () => {
    const sim = new Simulation(fixture),
      before = sim.serialize(),
      bad = structuredClone(before);
    bad.pressureLines = {
      "10,10": {
        id: "g1",
        x: 10,
        y: 10,
        inlet: 2,
        outlet: 0,
        materialId: "gas-0",
        quantity: 99,
      },
    };
    bad.nextId = 2;
    expect(() => parseSave(bad, fixture)).toThrow(/gas quantity/i);
    expect(sim.load(bad).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });
  it("migrates schema 14 with empty gas records and rejects old content atomically", () => {
    const sim = new Simulation(historicalFixture);
    const legacy = structuredClone(sim.serialize()) as Record<string, unknown>;
    legacy.schemaVersion = 14;
    delete legacy.pressureLines;
    delete legacy.pressureVessels;
    delete legacy.compressors;
    expect(sim.load(legacy).ok).toBe(true);
    expect(sim.serialize().schemaVersion).toBe(18);
    expect(sim.serialize().pressureLines).toEqual({});
    const before = sim.serialize();
    legacy.contentVersion = "world-01-v7";
    expect(sim.load(legacy).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });
});

describe("handling-state save boundaries", () => {
  function gasFixture() {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "raw")!.handlingState = "gas";
    for (const m of draft.machines) {
      m.inputStates = ["solid", "liquid", "gas"];
      m.outputStates = ["solid", "liquid", "gas"];
    }
    return validateContent(draft);
  }
  it("rejects gas in dry stock, staging, belt cargo and storage atomically", () => {
    const content = gasFixture(),
      sim = new Simulation(content);
    // Parser boundary is checked separately from the conservation audit.
    const base = sim.serialize();
    const dry = structuredClone(base);
    expect(sim.load(dry).ok).toBe(true);
    const before = sim.serialize();
    for (const location of ["stock", "staging"] as const) {
      const bad = structuredClone(before);
      bad[location] = { raw: 1 };
      expect(() => parseSave(bad, content)).toThrow(/handling/i);
      expect(sim.load(bad).ok).toBe(false);
      expect(sim.serialize()).toEqual(before);
    }
    const belt = structuredClone(before);
    belt.nextId = 2;
    belt.belts["10,10"] = {
      id: "b1",
      x: 10,
      y: 10,
      direction: 0,
      cargo: "raw",
      alternate: null,
      switched: false,
    };
    expect(() => parseSave(belt, content)).toThrow(/handling/i);
    expect(sim.load(belt).ok).toBe(false);
    const storage = structuredClone(before);
    storage.nextId = 2;
    storage.storages.s1 = {
      id: "s1",
      definitionId: "depot",
      x: 10,
      y: 10,
      direction: 0,
      inventory: { raw: 1 },
    };
    expect(() => parseSave(storage, content)).toThrow(/handling/i);
    expect(sim.load(storage).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });
});
