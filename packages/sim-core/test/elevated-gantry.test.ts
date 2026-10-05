import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { elevatedSolidCost } from "../src/elevated";
import { elevatedSupportPoints } from "../src/geometry";
import { auditLedger } from "../src/ledger";
import { Simulation } from "../src/simulation";
import type { GameCommand } from "../src/types";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

const cadence = fixture.tickMs * fixture.site.transportEveryTicks;

it("uses authored support spacing and lets low logistics cross only between supports", () => {
  const sim = new Simulation(fixture);
  const entry = { x: 10, y: 8 },
    exit = { x: 20, y: 8 };

  expect(elevatedSupportPoints(fixture, entry, exit)).toEqual([
    { x: 10, y: 8 },
    { x: 14, y: 8 },
    { x: 18, y: 8 },
    { x: 20, y: 8 },
  ]);

  build(sim, { type: "placeElevatedSolid", entry, exit });

  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 12, y: 8 }],
      direction: 1,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 14, y: 8 }],
      direction: 1,
    }).ok,
  ).toBe(false);
});

it("rejects a gantry when a required ground support is already occupied", () => {
  const sim = new Simulation(fixture);
  build(sim, {
    type: "placeBelts",
    points: [{ x: 14, y: 8 }],
    direction: 1,
  });
  expect(
    sim.command({
      type: "placeElevatedSolid",
      entry: { x: 10, y: 8 },
      exit: { x: 20, y: 8 },
    }).ok,
  ).toBe(false);
});

it("moves one physical solid unit across a raised span and preserves exit backpressure", () => {
  let sim = new Simulation(fixture);
  const routeId = build(sim, {
    type: "placeElevatedSolid",
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

  const loaded = sim.serialize();
  loaded.stock.plates -= 1;
  loaded.belts["9,10"].cargo = "plates";
  expect(sim.load(loaded).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  sim.step(cadence);
  expect(sim.serialize().belts["9,10"].cargo).toBeNull();
  expect(sim.serialize().elevatedSolids[routeId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 5,
  });

  const checkpoint = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(checkpoint)).ok).toBe(true);
  expect(restored.serialize()).toEqual(checkpoint);
  sim = restored;

  sim.step(cadence * 4);
  expect(sim.serialize().elevatedSolids[routeId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 1,
  });

  const blocked = sim.serialize();
  blocked.stock.plates -= 1;
  blocked.belts["16,10"].cargo = "plates";
  expect(sim.load(blocked).ok).toBe(true);
  sim.step(cadence);
  expect(sim.serialize().elevatedSolids[routeId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 0,
  });
  expect(sim.serialize().belts["16,10"].cargo).toBe("plates");
  expect(sim.command({ type: "dismantle", id: routeId }).ok).toBe(false);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});

it("charges and refunds authored deck plus support cost exactly", () => {
  const sim = new Simulation(fixture),
    before = sim.serialize().stock.plates,
    draft = {
      entry: { x: 10, y: 12 },
      exit: { x: 15, y: 12 },
    },
    expected = elevatedSolidCost(fixture, draft),
    placed = sim.command({ type: "placeElevatedSolid", ...draft });

  expect(placed.ok).toBe(true);
  expect(placed.cost).toBe(expected);
  expect(sim.serialize().stock.plates).toBe(before - expected);
  expect(sim.command({ type: "dismantle", id: placed.id! }).ok).toBe(true);
  expect(sim.serialize().stock.plates).toBe(before);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});

it("migrates schema 26 exactly to empty elevated routes and requires them in schema 27", () => {
  const current = new Simulation(fixture).serialize();
  expect(current.schemaVersion).toBe(27);

  const legacy = structuredClone(current) as Record<string, unknown>;
  legacy.schemaVersion = 26;
  delete legacy.elevatedSolids;
  const migrated = new Simulation(fixture);
  expect(migrated.load(legacy).ok).toBe(true);
  expect(migrated.serialize().schemaVersion).toBe(27);
  expect(migrated.serialize().elevatedSolids).toEqual({});

  const missing = structuredClone(current) as Record<string, unknown>;
  delete missing.elevatedSolids;
  expect(new Simulation(fixture).load(missing).ok).toBe(false);

  const impossibleLegacy = structuredClone(current);
  impossibleLegacy.schemaVersion = 26;
  impossibleLegacy.elevatedSolids = {
    e1: {
      id: "e1",
      entry: { x: 10, y: 10 },
      exit: { x: 15, y: 10 },
      direction: 0,
      cargo: null,
    },
  };
  impossibleLegacy.nextId = 2;
  expect(new Simulation(fixture).load(impossibleLegacy).ok).toBe(false);
});
