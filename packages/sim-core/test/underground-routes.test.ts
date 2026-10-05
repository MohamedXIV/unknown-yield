import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { auditLedger } from "../src/ledger";
import { Simulation } from "../src/simulation";
import type { GameCommand } from "../src/types";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

const cadence = fixture.tickMs * fixture.site.transportEveryTicks;

it("moves solid cargo through a persisted buried span and retains it under exit backpressure", () => {
  let sim = new Simulation(fixture);
  const routeId = build(sim, {
    type: "placeUndergroundSolid",
    entry: { x: 10, y: 10 },
    exit: { x: 15, y: 10 },
  });
  build(sim, {
    type: "placeBelts",
    points: [{ x: 9, y: 10 }],
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: [{ x: 16, y: 10 }],
    direction: 0,
  });

  // Only the portals occupy surface space. A normal belt may cross the buried
  // middle span without becoming part of the underground route.
  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 12, y: 10 }],
      direction: 1,
    }).ok,
  ).toBe(true);

  const loaded = sim.serialize();
  loaded.stock.plates -= 1;
  loaded.belts["9,10"].cargo = "plates";
  expect(sim.load(loaded).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  sim.step(cadence);
  expect(sim.serialize().belts["9,10"].cargo).toBeNull();
  expect(sim.serialize().undergroundSolids[routeId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 5,
  });
  expect(sim.serialize().belts["16,10"].cargo).toBeNull();

  const checkpoint = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(checkpoint)).ok).toBe(true);
  expect(restored.serialize()).toEqual(checkpoint);
  sim = restored;

  sim.step(cadence * 4);
  expect(sim.serialize().undergroundSolids[routeId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 1,
  });
  expect(sim.serialize().belts["16,10"].cargo).toBeNull();

  // Fill the exit belt before arrival. The in-flight unit reaches the portal
  // but stays physically held underground until downstream clears.
  const blocked = sim.serialize();
  blocked.stock.plates -= 1;
  blocked.belts["16,10"].cargo = "plates";
  expect(sim.load(blocked).ok).toBe(true);
  sim.step(cadence);
  expect(sim.serialize().undergroundSolids[routeId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 0,
  });
  expect(sim.serialize().belts["16,10"].cargo).toBe("plates");
  expect(sim.command({ type: "dismantle", id: routeId }).ok).toBe(false);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});

it("moves protected liquid through a contained buried span without occupying its surface cells", () => {
  let sim = new Simulation(fixture);
  const routeId = build(sim, {
    type: "placeUndergroundLiquid",
    entry: { x: 10, y: 20 },
    exit: { x: 15, y: 20 },
    containmentProfileId: "sealed-cold",
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "sealed-cold",
    points: [{ x: 9, y: 20, inlet: 2, outlet: 0 }],
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "sealed-cold",
    points: [{ x: 16, y: 20, inlet: 2, outlet: 0 }],
  });
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 12, y: 20, inlet: 3, outlet: 1 }],
    }).ok,
  ).toBe(true);

  const loaded = sim.serialize();
  loaded.flows.produced["orbital-coolant"] = 1;
  loaded.pipes["9,20"].materialId = "orbital-coolant";
  loaded.pipes["9,20"].quantity = 1;
  expect(sim.load(loaded).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  sim.step(cadence);
  const inTransit = sim.serialize().undergroundLiquids[routeId];
  expect(inTransit).toMatchObject({
    materialId: "orbital-coolant",
    quantity: 1,
    remainingSteps: 5,
    containmentProfileId: "sealed-cold",
  });
  expect(sim.serialize().pipes["9,20"].quantity).toBe(0);

  const checkpoint = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(checkpoint)).ok).toBe(true);
  expect(restored.serialize()).toEqual(checkpoint);
  sim = restored;

  sim.step(cadence * 5);
  expect(sim.serialize().undergroundLiquids[routeId]).toMatchObject({
    materialId: null,
    quantity: 0,
    remainingSteps: 0,
  });
  expect(sim.serialize().pipes["16,20"]).toMatchObject({
    materialId: "orbital-coolant",
    quantity: 1,
  });
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});

it("rejects protected liquid when the buried route lacks required containment", () => {
  const sim = new Simulation(fixture);
  const routeId = build(sim, {
    type: "placeUndergroundLiquid",
    entry: { x: 10, y: 22 },
    exit: { x: 15, y: 22 },
    containmentProfileId: "standard",
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "sealed-cold",
    points: [{ x: 9, y: 22, inlet: 2, outlet: 0 }],
  });

  const loaded = sim.serialize();
  loaded.flows.produced["orbital-coolant"] = 1;
  loaded.pipes["9,22"].materialId = "orbital-coolant";
  loaded.pipes["9,22"].quantity = 1;
  expect(sim.load(loaded).ok).toBe(true);

  sim.step(cadence);
  expect(sim.serialize().pipes["9,22"].quantity).toBe(1);
  expect(sim.serialize().undergroundLiquids[routeId]).toMatchObject({
    materialId: null,
    quantity: 0,
    remainingSteps: 0,
  });
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});

it("migrates schema 25 to empty underground route records and requires them in schema 26", () => {
  const current = new Simulation(fixture).serialize();
  expect(current.schemaVersion).toBe(26);

  const legacy = structuredClone(current) as Record<string, unknown>;
  legacy.schemaVersion = 25;
  delete legacy.undergroundSolids;
  delete legacy.undergroundLiquids;
  const migrated = new Simulation(fixture);
  expect(migrated.load(legacy).ok).toBe(true);
  expect(migrated.serialize().schemaVersion).toBe(26);
  expect(migrated.serialize().undergroundSolids).toEqual({});
  expect(migrated.serialize().undergroundLiquids).toEqual({});

  const missing = structuredClone(current) as Record<string, unknown>;
  delete missing.undergroundSolids;
  expect(new Simulation(fixture).load(missing).ok).toBe(false);

  const impossibleLegacy = structuredClone(current);
  impossibleLegacy.schemaVersion = 25;
  impossibleLegacy.undergroundSolids = {
    q1: {
      id: "q1",
      entry: { x: 10, y: 10 },
      exit: { x: 15, y: 10 },
      direction: 0,
      cargo: null,
    },
  };
  impossibleLegacy.nextId = 2;
  expect(new Simulation(fixture).load(impossibleLegacy).ok).toBe(false);
});
