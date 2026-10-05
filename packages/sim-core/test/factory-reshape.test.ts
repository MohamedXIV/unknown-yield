import { describe, expect, it } from "vitest";
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

function makePopulatedFactory() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  const machineId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: [{ x: 30, y: 29 }],
    direction: 0,
  });

  const state = sim.serialize();
  state.deposits["ferrite-field"] -= 2;
  state.machines[machineId].enabled = false;
  state.machines[machineId].input.ferrite = 1;
  state.belts["30,29"].cargo = "ferrite";
  expect(sim.load(state).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  return { sim, factoryId, machineId };
}

describe("post-build factory shell reshape", () => {
  it("reshapes a populated shell without moving or resetting its interior", () => {
    const { sim, factoryId, machineId } = makePopulatedFactory();
    const before = sim.serialize();
    const machineBefore = structuredClone(before.machines[machineId]);
    const beltBefore = structuredClone(before.belts["30,29"]);
    const stockBefore = before.stock.plates;

    expect(
      sim.preview({
        type: "reshapeFactory",
        factoryId,
        x: 23,
        y: 21,
        width: 12,
        height: 12,
      }),
    ).toMatchObject({ ok: true, cost: 44 });
    expect(sim.serialize()).toEqual(before);

    expect(
      sim.command({
        type: "reshapeFactory",
        factoryId,
        x: 23,
        y: 21,
        width: 12,
        height: 12,
      }),
    ).toMatchObject({
      ok: true,
      message: "Factory shell reshaped",
      cost: 44,
      id: factoryId,
    });

    const reshaped = sim.serialize();
    expect(reshaped.factories[factoryId]).toMatchObject({
      id: factoryId,
      x: 23,
      y: 21,
      width: 12,
      height: 12,
    });
    expect(reshaped.machines[machineId]).toEqual(machineBefore);
    expect(reshaped.belts["30,29"]).toEqual(beltBefore);
    expect(reshaped.stock.plates).toBe(stockBefore - 44);
    expect(auditLedger(fixture, reshaped).ok).toBe(true);

    const blueprint = parseFactoryBlueprint(
      fixture,
      serializeFactoryBlueprint(fixture, reshaped, factoryId),
    );
    expect(blueprint).toMatchObject({
      width: 12,
      height: 12,
      machines: [
        expect.objectContaining({
          definitionId: "crusher",
          x: 4,
          y: 5,
        }),
      ],
      belts: [
        expect.objectContaining({
          x: 7,
          y: 8,
        }),
      ],
    });

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(reshaped))).ok).toBe(true);
    expect(restored.serialize()).toEqual(reshaped);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("refunds reclaimed shell area without creating material", () => {
    const sim = new Simulation(fixture);
    const factoryId = build(sim, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 12,
      height: 12,
    });
    const before = sim.serialize().stock.plates;

    expect(
      sim.command({
        type: "reshapeFactory",
        factoryId,
        x: 25,
        y: 23,
        width: 10,
        height: 10,
      }),
    ).toMatchObject({ ok: true, cost: -44 });
    expect(sim.serialize().stock.plates).toBe(before + 44);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });

  it("rejects relocation, excluded contents, invalid ports and external collisions atomically", () => {
    const { sim, factoryId } = makePopulatedFactory();

    const rejected = [
      {
        type: "reshapeFactory" as const,
        factoryId,
        x: 40,
        y: 10,
        width: 10,
        height: 10,
        message: "Factory reshape must overlap its existing footprint",
      },
      {
        type: "reshapeFactory" as const,
        factoryId,
        x: 24,
        y: 22,
        width: 6,
        height: 6,
        message: "Factory reshape would exclude existing equipment",
      },
    ];

    for (const { message, ...command } of rejected) {
      const before = sim.serialize();
      expect(sim.command(command)).toMatchObject({ ok: false, message });
      expect(sim.serialize()).toEqual(before);
    }

    const portSim = new Simulation(fixture);
    const portFactory = build(portSim, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    build(portSim, {
      type: "placePort",
      factoryId: portFactory,
      x: 24,
      y: 27,
      direction: 0,
    });
    const beforePort = portSim.serialize();
    expect(
      portSim.command({
        type: "reshapeFactory",
        factoryId: portFactory,
        x: 23,
        y: 22,
        width: 11,
        height: 10,
      }),
    ).toMatchObject({
      ok: false,
      message: "Existing ports must remain valid on factory walls",
    });
    expect(portSim.serialize()).toEqual(beforePort);

    const collisionSim = new Simulation(fixture);
    const collisionFactory = build(collisionSim, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    build(collisionSim, {
      type: "placeBelts",
      points: [{ x: 34, y: 27 }],
      direction: 0,
    });
    const beforeCollision = collisionSim.serialize();
    expect(
      collisionSim.command({
        type: "reshapeFactory",
        factoryId: collisionFactory,
        x: 24,
        y: 22,
        width: 11,
        height: 10,
      }),
    ).toMatchObject({ ok: false, message: "Space is already occupied" });
    expect(collisionSim.serialize()).toEqual(beforeCollision);
  });
});
