import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  parseFactoryBlueprint,
  serializeFactoryBlueprint,
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

function auditOk(sim: Simulation) {
  const report = auditLedger(fixture, sim.serialize());
  expect(report.ok, JSON.stringify(report.mismatches)).toBe(true);
}

function buildPhase12World() {
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
  seeded.deposits["ferrite-field"] -= 38;
  seeded.machines[machineA].input.ferrite = 2;
  seeded.storages[depotId].inventory.ferrite = 36;
  const loaded = sim.load(seeded);
  expect(loaded.ok, loaded.message).toBe(true);
  auditOk(sim);

  return {
    sim,
    factoryA,
    factoryB,
    machineA,
    machineB,
    depotId,
    diverterId: diverter.id,
  };
}

it("closes Phase 12 through one persistent factory lifecycle and district reconfiguration world", () => {
  const {
    sim,
    factoryA,
    factoryB,
    machineA,
    machineB,
    depotId,
    diverterId,
  } = buildPhase12World();

  const originalMachineId = sim.serialize().machines[machineA].id,
    platesBeforeReshape = sim.serialize().stock.plates;

  expect(
    sim.command({
      type: "reshapeFactory",
      factoryId: factoryA,
      x: 24,
      y: 32,
      width: 10,
      height: 11,
    }),
  ).toMatchObject({
    ok: true,
    message: "Factory shell reshaped",
    cost: 10,
    id: factoryA,
  });
  expect(sim.serialize().stock.plates).toBe(platesBeforeReshape - 10);
  expect(sim.serialize().machines[machineA]).toMatchObject({
    id: originalMachineId,
    x: 30,
    y: 36,
    input: { ferrite: 2 },
    enabled: false,
  });
  auditOk(sim);

  const reshapedBlueprintText = serializeFactoryBlueprint(
      fixture,
      sim.serialize(),
      factoryA,
    ),
    reshapedBlueprint = parseFactoryBlueprint(
      fixture,
      reshapedBlueprintText,
    );
  expect(reshapedBlueprint).toMatchObject({
    width: 10,
    height: 11,
    machines: [
      expect.objectContaining({
        definitionId: "crusher",
        x: 6,
        y: 4,
      }),
    ],
  });

  const beforeRelocation = sim.serialize(),
    fuelBeforeRelocation = beforeRelocation.fuel;
  expect(
    sim.command({
      type: "relocateFactory",
      factoryId: factoryA,
      x: 23,
      y: 32,
    }),
  ).toMatchObject({
    ok: true,
    message: "Factory relocated",
    cost: fixture.site.factoryRelocationFuelPerStep,
    id: factoryA,
  });

  const pending = sim.serialize();
  expect(pending.fuel).toBe(
    fuelBeforeRelocation - fixture.site.factoryRelocationFuelPerStep,
  );
  expect(pending.factories[factoryA]).toMatchObject({
    id: factoryA,
    x: 23,
    y: 32,
    width: 10,
    height: 11,
    relocation: {
      requirements: [expect.objectContaining({ kind: "solid" })],
    },
  });
  expect(pending.factories[factoryA].relocation?.requirements).toHaveLength(1);
  expect(pending.machines[machineA]).toMatchObject({
    id: originalMachineId,
    x: 29,
    y: 36,
    input: { ferrite: 2 },
    enabled: false,
  });
  expect(pending.belts["34,37"]).toBeDefined();
  expect(pending.belts["33,37"]).toBeUndefined();
  expect(pending.belts["32,37"]).toBeDefined();
  expect(
    serializeFactoryBlueprint(fixture, pending, factoryA),
  ).toBe(reshapedBlueprintText);
  auditOk(sim);

  const restored = new Simulation(fixture),
    pendingLoad = restored.load(JSON.parse(JSON.stringify(pending)));
  expect(pendingLoad.ok, pendingLoad.message).toBe(true);
  expect(restored.serialize()).toEqual(pending);
  expect(
    serializeFactoryBlueprint(fixture, restored.serialize(), factoryA),
  ).toBe(reshapedBlueprintText);
  auditOk(restored);

  build(
    restored,
    path([{ x: 33, y: 37 }], 2),
  );
  restored.step(
    fixture.tickMs * fixture.site.factoryRelocationDowntimeTicks,
  );
  expect(
    restored.snapshot().factories.find((factory) => factory.id === factoryA)
      ?.relocation,
  ).toEqual({
    remainingTicks: 0,
    connectionsRestored: true,
    requiredConnections: 1,
  });

  const consumedBefore =
    restored.serialize().flows.consumed.ferrite ?? 0;
  expect(
    restored.command({
      type: "setEnabled",
      machineId: machineA,
      enabled: true,
    }),
  ).toMatchObject({
    ok: true,
    message: "Automatic operation enabled",
  });
  expect(restored.serialize().factories[factoryA].relocation).toBeUndefined();

  for (
    let tick = 0;
    tick < 200 &&
    (restored.serialize().flows.consumed.ferrite ?? 0) <= consumedBefore;
    tick++
  ) {
    restored.step(fixture.tickMs);
    auditOk(restored);
  }
  expect(restored.serialize().flows.consumed.ferrite).toBe(
    consumedBefore + 2,
  );
  expect(restored.serialize().machines[machineA].output.plates).toBe(6);
  expect(
    restored.command({
      type: "setEnabled",
      machineId: machineA,
      enabled: false,
    }).ok,
  ).toBe(true);
  expect(restored.serialize().machines[machineA].enabled).toBe(false);

  for (
    let tick = 0;
    tick < 400 &&
    (restored.serialize().machines[machineB].input.ferrite ?? 0) < 3;
    tick++
  ) {
    restored.step(fixture.tickMs);
    auditOk(restored);
  }

  const beforeSwitch = restored.serialize(),
    bBefore = beforeSwitch.machines[machineB].input.ferrite ?? 0,
    depotBefore = beforeSwitch.storages[depotId].inventory.ferrite ?? 0,
    primaryResidual = [40, 41, 42, 43, 44, 45].filter(
      (x) => beforeSwitch.belts[x + ",37"]?.cargo === "ferrite",
    ).length;
  expect(bBefore).toBeGreaterThanOrEqual(3);
  expect(depotBefore).toBeGreaterThan(0);
  expect(primaryResidual).toBeGreaterThan(0);

  expect(
    restored.command({
      type: "setDivertRoute",
      beltId: diverterId,
      route: "alternate",
    }),
  ).toMatchObject({
    ok: true,
    message: "Alternate feed selected",
  });

  for (
    let tick = 0;
    tick < 400 &&
    (restored.serialize().machines[machineA].input.ferrite ?? 0) < 3;
    tick++
  ) {
    restored.step(fixture.tickMs);
    auditOk(restored);
  }

  const reallocated = restored.serialize();
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
  expect(
    reallocated.belts[
      Object.keys(reallocated.belts).find(
        (location) => reallocated.belts[location].id === diverterId,
      )!
    ].switched,
  ).toBe(true);
  expect(
    serializeFactoryBlueprint(fixture, reallocated, factoryA),
  ).toBe(reshapedBlueprintText);
  auditOk(restored);

  const finalReload = new Simulation(fixture),
    finalLoad = finalReload.load(JSON.parse(JSON.stringify(reallocated)));
  expect(finalLoad.ok, finalLoad.message).toBe(true);
  expect(finalReload.serialize()).toEqual(reallocated);
  expect(
    serializeFactoryBlueprint(fixture, finalReload.serialize(), factoryA),
  ).toBe(reshapedBlueprintText);
  auditOk(finalReload);

  restored.step(2000);
  finalReload.step(2000);
  expect(finalReload.serialize()).toEqual(restored.serialize());
  auditOk(finalReload);
  expect(finalReload.serialize().factories[factoryB].id).toBe(factoryB);
});
