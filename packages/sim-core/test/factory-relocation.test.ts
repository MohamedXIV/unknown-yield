import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  serializeFactoryBlueprint,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function horizontal(x: number, y: number, endX: number) {
  const points = [{ x, y }];
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction: 0 };
}

function populatedAsset() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 27,
    direction: 0,
  });
  const machineId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, horizontal(22, 27, 26));

  build(sim, {
    type: "placePipes",
    containmentProfileId: "standard",
    points: [{ x: 30, y: 24, inlet: 2, outlet: 0 }],
  });
  build(sim, {
    type: "placePressureLines",
    points: [{ x: 31, y: 24, inlet: 2, outlet: 0 }],
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
  expect(sim.command({ type: "setPumpEnabled", id: pumpId, enabled: false }).ok).toBe(
    true,
  );
  expect(
    sim.command({
      type: "setCompressorEnabled",
      id: compressorId,
      enabled: false,
    }).ok,
  ).toBe(true);

  const state = sim.serialize();
  state.deposits["ferrite-field"] -= 3;
  state.machines[machineId].enabled = false;
  state.machines[machineId].input.ferrite = 1;
  state.belts["23,27"].cargo = "ferrite";
  state.belts["25,27"].cargo = "ferrite";
  expect(sim.load(state).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  return { sim, factoryId, machineId, pumpId, compressorId };
}

describe("intact factory relocation", () => {
  it("requires the persistent asset to be suspended before moving", () => {
    const { sim, factoryId, machineId } = populatedAsset();
    expect(
      sim.command({
        type: "setEnabled",
        machineId,
        enabled: true,
      }).ok,
    ).toBe(true);
    const before = sim.serialize();
    expect(
      sim.command({
        type: "relocateFactory",
        factoryId,
        x: 40,
        y: 40,
      }),
    ).toMatchObject({
      ok: false,
      message: "Suspend internal equipment before relocation",
    });
    expect(sim.serialize()).toEqual(before);
  });

  it("translates one persistent asset while leaving external cargo at the source", () => {
    const { sim, factoryId, machineId, pumpId, compressorId } =
      populatedAsset();
    const before = sim.serialize();
    const blueprintBefore = serializeFactoryBlueprint(
      fixture,
      before,
      factoryId,
    );
    const machineBefore = structuredClone(before.machines[machineId]);
    const externalBeltBefore = structuredClone(before.belts["23,27"]);
    const wallBeltBefore = structuredClone(before.belts["24,27"]);
    const internalBeltBefore = structuredClone(before.belts["25,27"]);
    const pipeBefore = structuredClone(before.pipes["30,24"]);
    const lineBefore = structuredClone(before.pressureLines["31,24"]);
    const pumpBefore = structuredClone(before.pumps[pumpId]);
    const compressorBefore = structuredClone(before.compressors[compressorId]);

    const relocationCost =
      (Math.abs(40 - before.factories[factoryId].x) +
        Math.abs(40 - before.factories[factoryId].y)) *
      fixture.site.factoryRelocationFuelPerStep;
    expect(
      sim.preview({
        type: "relocateFactory",
        factoryId,
        x: 40,
        y: 40,
      }),
    ).toMatchObject({ ok: true, cost: relocationCost });
    expect(sim.serialize()).toEqual(before);

    expect(
      sim.command({
        type: "relocateFactory",
        factoryId,
        x: 40,
        y: 40,
      }),
    ).toMatchObject({
      ok: true,
      message: "Factory relocated",
      cost: relocationCost,
      id: factoryId,
    });

    const moved = sim.serialize();
    expect(moved.factories[factoryId]).toMatchObject({
      id: factoryId,
      x: 40,
      y: 40,
      width: 10,
      height: 10,
      ports: [
        expect.objectContaining({
          x: 40,
          y: 45,
          direction: 0,
        }),
      ],
    });
    expect(moved.machines[machineId]).toEqual({
      ...machineBefore,
      x: machineBefore.x + 16,
      y: machineBefore.y + 18,
    });

    expect(moved.belts["23,27"]).toEqual(externalBeltBefore);
    expect(moved.belts["23,27"].cargo).toBe("ferrite");
    expect(moved.belts["24,27"]).toBeUndefined();
    expect(moved.belts["25,27"]).toBeUndefined();
    expect(moved.belts["40,45"]).toEqual({
      ...wallBeltBefore,
      x: 40,
      y: 45,
    });
    expect(moved.belts["41,45"]).toEqual({
      ...internalBeltBefore,
      x: 41,
      y: 45,
    });

    expect(moved.pipes["30,24"]).toBeUndefined();
    expect(moved.pipes["46,42"]).toEqual({
      ...pipeBefore,
      x: 46,
      y: 42,
    });
    expect(moved.pressureLines["31,24"]).toBeUndefined();
    expect(moved.pressureLines["47,42"]).toEqual({
      ...lineBefore,
      x: 47,
      y: 42,
    });
    expect(moved.pumps[pumpId]).toEqual({
      ...pumpBefore,
      x: pumpBefore.x + 16,
      y: pumpBefore.y + 18,
    });
    expect(moved.compressors[compressorId]).toEqual({
      ...compressorBefore,
      x: compressorBefore.x + 16,
      y: compressorBefore.y + 18,
    });

    expect(
      serializeFactoryBlueprint(fixture, moved, factoryId),
    ).toBe(blueprintBefore);
    expect(auditLedger(fixture, moved).ok).toBe(true);

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(moved))).ok).toBe(true);
    expect(restored.serialize()).toEqual(moved);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("rejects invalid targets and never swallows source-side external cargo", () => {
    const { sim, factoryId } = populatedAsset();

    for (const command of [
      {
        type: "relocateFactory" as const,
        factoryId,
        x: 23,
        y: 22,
        message: "Space is already occupied",
      },
      {
        type: "relocateFactory" as const,
        factoryId,
        x: 35,
        y: 24,
        message: "Keep buildings clear of the terminal and deposits",
      },
    ]) {
      const { message, ...input } = command;
      const before = sim.serialize();
      expect(sim.command(input)).toMatchObject({ ok: false, message });
      expect(sim.serialize()).toEqual(before);
      expect(sim.serialize().belts["23,27"].cargo).toBe("ferrite");
    }
  });
});
