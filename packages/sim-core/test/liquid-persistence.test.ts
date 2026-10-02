import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import { parseSave } from "../src/save";
import { Simulation, auditLedger } from "../src/index";

describe("liquid persistence foundation", () => {
  it("starts with explicit empty physical liquid locations in schema 14", () => {
    const sim = new Simulation(fixture);
    expect(sim.serialize().schemaVersion).toBe(14);
    expect(sim.serialize().pipes).toEqual({});
    expect(sim.serialize().tanks).toEqual({});
    expect(sim.serialize().pumps).toEqual({});
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
  it("rejects impossible liquid capacity without replacing current state", () => {
    const sim = new Simulation(fixture),
      before = sim.serialize(),
      bad = structuredClone(before);
    bad.pipes = {
      "10,10": {
        id: "l1",
        x: 10,
        y: 10,
        inlet: 2,
        outlet: 0,
        materialId: "raw",
        quantity: 99,
      },
    };
    bad.nextId = 2;
    expect(sim.load(bad).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });
});

describe("handling-state save boundaries", () => {
  function liquidFixture() {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "raw")!.handlingState = "liquid";
    for (const m of draft.machines) {
      m.inputStates = ["solid", "liquid"];
      m.outputStates = ["solid", "liquid"];
    }
    return validateContent(draft);
  }
  it("rejects liquid in dry stock, staging, belt cargo and storage atomically", () => {
    const content = liquidFixture(),
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
