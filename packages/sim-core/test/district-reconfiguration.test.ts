import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function path(points: { x: number; y: number }[], direction: number) {
  return { type: "placeBelts" as const, points, direction };
}

function district() {
  const sim = new Simulation(fixture);

  const factoryA = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  const factoryB = build(sim, {
    type: "placeFactory",
    x: 44,
    y: 33,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId: factoryA,
    x: 33,
    y: 37,
    direction: 2,
  });
  build(sim, {
    type: "placePort",
    factoryId: factoryB,
    x: 44,
    y: 37,
    direction: 0,
  });

  const machineA = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 30,
    y: 36,
    direction: 2,
  });
  const machineB = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 46,
    y: 36,
    direction: 0,
  });
  expect(
    sim.command({ type: "setEnabled", machineId: machineA, enabled: false }).ok,
  ).toBe(true);
  expect(
    sim.command({ type: "setEnabled", machineId: machineB, enabled: false }).ok,
  ).toBe(true);

  const depotId = build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 34,
    y: 44,
    direction: 0,
  });

  const feeder = [
    { x: 37, y: 45 },
    { x: 38, y: 45 },
    { x: 39, y: 45 },
    ...Array.from({ length: 8 }, (_, index) => ({
      x: 39,
      y: 44 - index,
    })),
  ];
  build(sim, path(feeder, 0));
  build(
    sim,
    path(
      Array.from({ length: 7 }, (_, index) => ({
        x: 38 - index,
        y: 37,
      })),
      2,
    ),
  );
  build(
    sim,
    path(
      Array.from({ length: 6 }, (_, index) => ({
        x: 40 + index,
        y: 37,
      })),
      0,
    ),
  );

  const diverter = sim
    .snapshot()
    .belts.find((belt) => belt.x === 39 && belt.y === 37)!;
  expect(diverter).toBeDefined();
  expect(
    sim.command({ type: "rotateDivert", beltId: diverter.id }).ok,
  ).toBe(true);
  expect(
    sim.command({ type: "rotateDivert", beltId: diverter.id }).ok,
  ).toBe(true);
  expect(
    sim.snapshot().belts.find((belt) => belt.id === diverter.id)?.alternate,
  ).toBe(2);

  const seeded = sim.serialize();
  seeded.deposits["ferrite-field"] -= 36;
  seeded.storages[depotId].inventory.ferrite = 36;
  const load = sim.load(seeded);
  expect(load.ok, load.message).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  return { sim, depotId, diverterId: diverter.id, machineA, machineB };
}

describe("district feed switching and physical storage reconfiguration", () => {
  it("selects routes idempotently without moving cargo already past the diverter", () => {
    const { sim, depotId, diverterId, machineA, machineB } = district();

    const primaryBefore = sim.serialize();
    expect(
      sim.command({
        type: "setDivertRoute",
        beltId: diverterId,
        route: "primary",
      }),
    ).toMatchObject({
      ok: true,
      message: "Primary feed selected",
    });
    expect(sim.serialize()).toEqual(primaryBefore);

    for (
      let ticks = 0;
      ticks < 300 &&
      (sim.serialize().machines[machineB].input.ferrite ?? 0) < 3;
      ticks++
    ) {
      sim.step(fixture.tickMs);
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }

    const beforeSwitch = sim.serialize(),
      bBefore = beforeSwitch.machines[machineB].input.ferrite ?? 0,
      depotBefore = beforeSwitch.storages[depotId].inventory.ferrite ?? 0,
      primaryResidual = [40, 41, 42, 43, 44, 45].filter(
        (x) => beforeSwitch.belts[x + ",37"]?.cargo === "ferrite",
      ).length;
    expect(bBefore).toBeGreaterThanOrEqual(3);
    expect(depotBefore).toBeGreaterThan(0);
    expect(primaryResidual).toBeGreaterThan(0);

    expect(
      sim.command({
        type: "setDivertRoute",
        beltId: diverterId,
        route: "alternate",
      }),
    ).toMatchObject({
      ok: true,
      message: "Alternate feed selected",
    });
    expect(
      sim.snapshot().belts.find((belt) => belt.id === diverterId)?.switched,
    ).toBe(true);

    for (
      let ticks = 0;
      ticks < 300 &&
      (sim.serialize().machines[machineA].input.ferrite ?? 0) < 3;
      ticks++
    ) {
      sim.step(fixture.tickMs);
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }

    const reallocated = sim.serialize();
    expect(reallocated.machines[machineA].input.ferrite ?? 0).toBeGreaterThanOrEqual(
      3,
    );
    expect(reallocated.machines[machineB].input.ferrite ?? 0).toBe(
      bBefore + primaryResidual,
    );
    expect(reallocated.storages[depotId].inventory.ferrite ?? 0).toBeLessThan(
      depotBefore,
    );
    expect(reallocated.stock.ferrite ?? 0).toBe(0);
    expect(auditLedger(fixture, reallocated).ok).toBe(true);

    const restored = new Simulation(fixture);
    const load = restored.load(JSON.parse(JSON.stringify(reallocated)));
    expect(load.ok, load.message).toBe(true);
    expect(restored.serialize()).toEqual(reallocated);
    expect(
      restored.snapshot().belts.find((belt) => belt.id === diverterId)?.switched,
    ).toBe(true);

    sim.step(2000);
    restored.step(2000);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("rejects an explicit alternate route until an alternate exit exists", () => {
    const sim = new Simulation(fixture);
    build(sim, path([{ x: 10, y: 10 }], 0));
    const beltId = sim.snapshot().belts[0].id,
      before = sim.serialize();
    expect(
      sim.command({
        type: "setDivertRoute",
        beltId,
        route: "alternate",
      }),
    ).toMatchObject({
      ok: false,
      message: "No alternate exit to select",
    });
    expect(sim.serialize()).toEqual(before);
  });
});
