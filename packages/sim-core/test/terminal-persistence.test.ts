import { it, expect } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  serializeFactoryBlueprint,
} from "../src/index";
import { terminalState } from "./terminal-helpers";
it("rejects old schema and tampered dock holdings atomically", () => {
  const sim = new Simulation(fixture);
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 2 },
  };
  s.stock.plates -= 30;
  s.flows.produced["liquid-0"] = 2;
  expect(sim.load(s).ok).toBe(true);
  expect(
    sim.command({ type: "removeTerminalModule", definitionId: "liquid-dock" })
      .ok,
  ).toBe(false);
  const before = sim.serialize();
  const mutations = [
    (v: typeof s) => {
      v.schemaVersion = 16;
    },
    (v: typeof s) => {
      v.terminalModules["liquid-dock"].quantity = 25;
    },
    (v: typeof s) => {
      v.terminalModules["liquid-dock"].materialId = "gas-0";
    },
    (v: typeof s) => {
      v.terminalModules["liquid-dock"].materialId = null;
    },
    (v: typeof s) => {
      v.terminalModules.missing = { materialId: null, quantity: 0 };
    },
    (v: typeof s) => {
      v.knowledge = v.knowledge.filter((k) => k !== "liquefy-raw");
    },
    (v: typeof s) => {
      delete (v as Partial<typeof s>).terminalModules;
    },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(before);
    mutate(bad);
    expect(sim.load(bad).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  }
});

it("restores simultaneous dock holdings, upstream cargo and policies without reward replay", () => {
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 2 },
    "gas-dock": { materialId: "gas-0", quantity: 3 },
  };
  s.pipes["39,30"] = {
    id: "l1",
    x: 39,
    y: 30,
    inlet: 1,
    outlet: 3,
    materialId: "liquid-0",
    quantity: 2,
    containmentProfileId: "lined",
  };
  s.pressureLines["42,27"] = {
    id: "g1",
    x: 42,
    y: 27,
    inlet: 0,
    outlet: 2,
    materialId: "gas-0",
    quantity: 2,
  };
  s.nextId = 3;
  s.stock.plates -= 73;
  s.flows.produced["liquid-0"] = 4;
  s.flows.produced["gas-0"] = 5;
  s.policies["gas-0"] = "export";
  s.debt = 20;
  s.company = {
    standing: "recovery",
    interventionStreak: 1,
    recoveryPackageId: "emergency-fuel",
    recoveryNetFuel: 0,
    repaidSinceAssistanceFuel: 0,
    importAllocations: {},
  };
  const sim = new Simulation(fixture),
    restored = new Simulation(fixture);
  const loaded = sim.load(s);
  expect(loaded.ok, loaded.message).toBe(true);
  expect(restored.load(sim.serialize()).ok).toBe(true);
  for (let i = 0; i < 60; i++) {
    sim.step(100);
    restored.step(100);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  }
  expect(sim.serialize().flows.exported["gas-0"]).toBe(5);
  expect(sim.serialize().terminalModules["liquid-dock"].quantity).toBe(4);
});

it("keeps site terminal modules outside factory blueprint schema 5", () => {
  const sim = new Simulation(fixture);
  expect(sim.load(terminalState()).ok).toBe(true);
  expect(
    sim.command({ type: "installTerminalModule", definitionId: "gas-dock" }).ok,
  ).toBe(true);
  const factory = sim.command({
    type: "placeFactory",
    x: 23,
    y: 33,
    width: 10,
    height: 6,
  });
  expect(factory.ok).toBe(true);
  expect(
    sim.command({
      type: "placePipes",
      points: [{ x: 25, y: 35, inlet: 2, outlet: 0 }],
      containmentProfileId: "lined",
    }).ok,
  ).toBe(true);
  const blueprint = JSON.parse(
    serializeFactoryBlueprint(fixture, sim.serialize(), factory.id!),
  );
  expect(blueprint.schemaVersion).toBe(5);
  expect(JSON.stringify(blueprint)).not.toContain("terminalModule");
  expect(JSON.stringify(blueprint)).not.toContain("gas-dock");
});
