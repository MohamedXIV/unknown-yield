import { it, expect } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  serializeFactoryBlueprint,
  parseFactoryBlueprint,
  type GameCommand,
} from "../src/index";
function build(sim: Simulation, c: GameCommand) {
  const r = sim.command(c);
  expect(r.ok, r.message).toBe(true);
  return r.id!;
}
function line(
  sim: Simulation,
  x: number,
  y: number,
  toX: number,
  toY: number,
  direction = 0,
) {
  const points = [{ x, y }];
  while (x !== toX) {
    x += Math.sign(toX - x);
    points.push({ x, y });
  }
  while (y !== toY) {
    y += Math.sign(toY - y);
    points.push({ x, y });
  }
  build(sim, { type: "placeBelts", points, direction });
}
function beltId(sim: Simulation, x: number, y: number) {
  return sim.snapshot().belts.find((b) => b.x === x && b.y === y)!.id;
}
it("keeps a productive T factory and two-material crossing conservative through blocked restore, suspension and reclaim", () => {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(sim, { type: "placePort", factoryId, x, y: 27, direction: 0 });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  line(sim, 20, 27, 26, 27);
  line(sim, 29, 27, 37, 27);
  line(sim, 30, 28, 32, 28, 3);
  for (const [x, definitionId] of [
    [30, "splitter"],
    [32, "merger"],
  ] as const)
    build(sim, {
      type: "configureJunction",
      beltId: beltId(sim, x, 27),
      definitionId,
      direction: 0,
      branch: 1,
    });
  const ferrite = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 16,
    y: 28,
    direction: 0,
  });
  const raw = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 35,
    direction: 0,
  });
  line(sim, 18, 29, 22, 29, 1);
  line(sim, 22, 30, 22, 35, 1);
  line(sim, 20, 36, 20, 35, 0);
  line(sim, 21, 35, 21, 35);
  const crossing = beltId(sim, 22, 35);
  build(sim, {
    type: "configureJunction",
    beltId: crossing,
    definitionId: "crossing",
    direction: 0,
    branch: 1,
  });
  line(sim, 23, 35, 24, 35);
  const rawDepot = build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 25,
    y: 34,
    direction: 0,
  });
  const ferriteDepot = build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 21,
    y: 38,
    direction: 1,
  });
  let blocked = false;
  for (let i = 0; i < 300; i++) {
    sim.step(100);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    const b = sim.serialize().belts["22,35"];
    if (b.cargo === "ferrite" && b.junction!.crossing!.pending === 0) {
      blocked = true;
      break;
    }
  }
  expect(blocked).toBe(true);
  build(sim, { type: "setEnabled", machineId: ferrite, enabled: false });
  build(sim, { type: "setEnabled", machineId: raw, enabled: false });
  const blockedSave = sim.serialize(),
    restored = new Simulation(fixture);
  expect(restored.load(blockedSave).ok).toBe(true);
  expect(restored.serialize()).toEqual(blockedSave);
  for (const world of [sim, restored]) {
    const before = world.serialize();
    expect(
      world.command({
        type: "configureJunction",
        beltId: crossing,
        definitionId: null,
        direction: 0,
        branch: 1,
      }).ok,
    ).toBe(false);
    expect(world.serialize()).toEqual(before);
    line(world, 22, 36, 22, 37, 1);
  }
  for (let i = 0; i < 220; i++) {
    sim.step(100);
    restored.step(100);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  }
  const state = sim.serialize();
  expect(state.storages[rawDepot].inventory.raw).toBeGreaterThan(0);
  expect(Object.keys(state.storages[rawDepot].inventory)).toEqual(["raw"]);
  expect(state.storages[ferriteDepot].inventory.ferrite).toBeGreaterThan(0);
  expect(Object.keys(state.storages[ferriteDepot].inventory)).toEqual([
    "ferrite",
  ]);
  expect(state.flows.produced.plates).toBeGreaterThan(0);
  expect(state.flows.discarded).toEqual({});
  expect(state.machines[processorId].factoryId).toBe(factoryId);
  const bp = serializeFactoryBlueprint(fixture, state, factoryId);
  expect(parseFactoryBlueprint(fixture, bp).schemaVersion).toBe(2);
  expect(bp).not.toContain("cursor");
  expect(sim.snapshot().materials.map((m) => m.id)).not.toContain("granules");
  const stock = sim.snapshot().stock.plates;
  build(sim, {
    type: "configureJunction",
    beltId: crossing,
    definitionId: null,
    direction: 0,
    branch: 1,
  });
  expect(sim.snapshot().stock.plates).toBe(
    stock + fixture.junctions.find((j) => j.id === "crossing")!.cost,
  );
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});
