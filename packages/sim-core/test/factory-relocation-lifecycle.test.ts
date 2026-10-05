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

function lifecycleFactory() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  for (const y of [25, 27, 29])
    build(sim, {
      type: "placePort",
      factoryId,
      x: 24,
      y,
      direction: 0,
    });

  const machineId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  expect(
    sim.command({
      type: "setEnabled",
      machineId,
      enabled: false,
    }).ok,
  ).toBe(true);

  build(sim, {
    type: "placeBelts",
    points: [
      { x: 23, y: 25 },
      { x: 24, y: 25 },
      { x: 25, y: 25 },
    ],
    direction: 0,
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "standard",
    points: [23, 24, 25].map((x) => ({
      x,
      y: 27,
      inlet: 2,
      outlet: 0,
    })),
  });
  build(sim, {
    type: "placePressureLines",
    points: [23, 24, 25].map((x) => ({
      x,
      y: 29,
      inlet: 2,
      outlet: 0,
    })),
  });
  const pumpId = build(sim, {
    type: "placePump",
    containmentProfileId: "standard",
    x: 30,
    y: 30,
    direction: 0,
  });
  const compressorId = build(sim, {
    type: "placeCompressor",
    x: 31,
    y: 30,
    direction: 0,
  });
  expect(
    sim.command({
      type: "setPumpEnabled",
      id: pumpId,
      enabled: false,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "setCompressorEnabled",
      id: compressorId,
      enabled: false,
    }).ok,
  ).toBe(true);

  return { sim, factoryId, machineId, pumpId, compressorId };
}

describe("factory relocation lifecycle", () => {
  it("charges authored fuel, persists downtime and requires real reconnection before resume", () => {
    const { sim, factoryId, machineId, pumpId, compressorId } =
      lifecycleFactory();
    const before = sim.serialize(),
      fuelBefore = before.fuel,
      stepCost = fixture.site.factoryRelocationFuelPerStep,
      downtime = fixture.site.factoryRelocationDowntimeTicks;

    expect(
      sim.preview({
        type: "relocateFactory",
        factoryId,
        x: 25,
        y: 22,
      }),
    ).toMatchObject({
      ok: true,
      message: "Relocate factory",
      cost: stepCost,
    });
    expect(sim.serialize()).toEqual(before);

    expect(
      sim.command({
        type: "relocateFactory",
        factoryId,
        x: 25,
        y: 22,
      }),
    ).toMatchObject({
      ok: true,
      message: "Factory relocated",
      cost: stepCost,
      id: factoryId,
    });

    let state = sim.serialize();
    expect(state.fuel).toBe(fuelBefore - stepCost);
    expect(state.factories[factoryId].relocation).toBeDefined();
    expect(
      state.factories[factoryId].relocation!.requirements.map(
        (requirement) => requirement.kind,
      ),
    ).toEqual(["solid", "liquid", "gas"]);
    expect(auditLedger(fixture, state).ok).toBe(true);

    const restored = new Simulation(fixture);
    const restoredResult = restored.load(JSON.parse(JSON.stringify(state)));
    expect(restoredResult.ok, restoredResult.message).toBe(true);
    expect(restored.serialize()).toEqual(state);

    expect(
      restored.command({
        type: "setEnabled",
        machineId,
        enabled: true,
      }),
    ).toMatchObject({
      ok: false,
      message: "Factory relocation downtime is still active",
    });
    expect(
      restored.command({
        type: "setPumpEnabled",
        id: pumpId,
        enabled: true,
      }),
    ).toMatchObject({
      ok: false,
      message: "Factory relocation downtime is still active",
    });
    expect(
      restored.command({
        type: "setCompressorEnabled",
        id: compressorId,
        enabled: true,
      }),
    ).toMatchObject({
      ok: false,
      message: "Factory relocation downtime is still active",
    });

    restored.step(fixture.tickMs * downtime);
    state = restored.serialize();
    expect(state.factories[factoryId].relocation).toBeDefined();

    expect(
      restored.command({
        type: "setEnabled",
        machineId,
        enabled: true,
      }),
    ).toMatchObject({
      ok: false,
      message: "Reconnect external logistics before restarting factory",
    });

    build(restored, {
      type: "placeBelts",
      points: [{ x: 24, y: 25 }],
      direction: 0,
    });
    expect(
      restored.command({
        type: "setEnabled",
        machineId,
        enabled: true,
      }),
    ).toMatchObject({
      ok: false,
      message: "Reconnect external logistics before restarting factory",
    });

    build(restored, {
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 24, y: 27, inlet: 2, outlet: 0 }],
    });
    build(restored, {
      type: "placePressureLines",
      points: [{ x: 24, y: 29, inlet: 2, outlet: 0 }],
    });

    expect(
      restored.snapshot().factories.find(
        (factory) => factory.id === factoryId,
      )?.relocation,
    ).toEqual({
      remainingTicks: 0,
      connectionsRestored: true,
      requiredConnections: 3,
    });

    expect(
      restored.command({
        type: "setEnabled",
        machineId,
        enabled: true,
      }),
    ).toMatchObject({
      ok: true,
      message: "Automatic operation enabled",
    });
    expect(restored.serialize().factories[factoryId].relocation).toBeUndefined();
    expect(restored.serialize().machines[machineId].enabled).toBe(true);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);

    const final = restored.serialize();
    const finalReload = new Simulation(fixture);
    expect(finalReload.load(JSON.parse(JSON.stringify(final))).ok).toBe(true);
    expect(finalReload.serialize()).toEqual(final);
  });

  it("blocks reshape and repeated relocation until the lifecycle is completed", () => {
    const { sim, factoryId } = lifecycleFactory();
    expect(
      sim.command({
        type: "relocateFactory",
        factoryId,
        x: 25,
        y: 22,
      }).ok,
    ).toBe(true);
    const before = sim.serialize();

    expect(
      sim.command({
        type: "reshapeFactory",
        factoryId,
        x: 25,
        y: 22,
        width: 11,
        height: 10,
      }),
    ).toMatchObject({
      ok: false,
      message: "Finish factory relocation before reshaping",
    });
    expect(
      sim.command({
        type: "relocateFactory",
        factoryId,
        x: 26,
        y: 22,
      }),
    ).toMatchObject({
      ok: false,
      message: "Finish factory relocation before moving again",
    });
    expect(sim.serialize()).toEqual(before);
  });
});
