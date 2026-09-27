import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  parseFactoryBlueprint,
  serializeFactoryBlueprint,
  type GameCommand,
  type Save,
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

function makeFactory(
  originX: number,
  originY: number,
  shiftIds = false,
): { state: Save; factoryId: string; machineId: string } {
  const sim = new Simulation(fixture);
  if (shiftIds)
    expect(
      sim.command({
        type: "placeBelts",
        points: [{ x: 2, y: 2 }],
        direction: 0,
      }).ok,
    ).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: originX,
    y: originY,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: originX,
    y: originY + 5,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: originX + 9,
    y: originY + 5,
    direction: 0,
  });
  const machineId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: originX + 3,
    y: originY + 4,
    direction: 0,
  });
  build(sim, horizontal(originX, originY + 5, originX + 2));
  build(sim, horizontal(originX + 5, originY + 5, originX + 9));

  const state = sim.serialize();
  const divert = state.belts[originX + 1 + "," + (originY + 5)];
  divert.alternate = 1;
  divert.switched = true;
  return { state, factoryId, machineId };
}

describe("factory blueprint serialization", () => {
  it("serializes equivalent detailed layouts identically without runtime state", () => {
    const a = makeFactory(24, 10);
    const b = makeFactory(30, 40, true);

    a.state.fuel = 1;
    a.state.knowledge.push("crush-raw");
    a.state.machines[a.machineId].enabled = false;
    a.state.machines[a.machineId].incident = "test-incident";
    a.state.machines[a.machineId].input = { ferrite: 1 };
    a.state.machines[a.machineId].output = { plates: 2 };
    a.state.machines[a.machineId].job = {
      remaining: 7,
      reaction: "press-ferrite",
    };
    const cargo = a.state.belts["24,15"];
    cargo.cargo = "ferrite";

    b.state.fuel = 999;
    b.state.machines[b.machineId].input = {};
    b.state.machines[b.machineId].output = {};
    b.state.machines[b.machineId].job = null;

    const before = structuredClone(a.state);
    const first = serializeFactoryBlueprint(fixture, a.state, a.factoryId);
    const second = serializeFactoryBlueprint(fixture, b.state, b.factoryId);

    expect(first).toBe(second);
    expect(a.state).toEqual(before);

    const parsed = parseFactoryBlueprint(fixture, first);
    expect(JSON.stringify(parsed)).toBe(first);
    expect(parsed).toEqual({
      schemaVersion: 1,
      width: 10,
      height: 10,
      ports: [
        { x: 0, y: 5, direction: 0 },
        { x: 9, y: 5, direction: 0 },
      ],
      machines: [
        {
          definitionId: "crusher",
          x: 3,
          y: 4,
          direction: 0,
          operation: "crush",
        },
      ],
      belts: [
        { x: 0, y: 5, direction: 0, alternate: null, switched: false },
        { x: 1, y: 5, direction: 0, alternate: 1, switched: true },
        { x: 2, y: 5, direction: 0, alternate: null, switched: false },
        { x: 5, y: 5, direction: 0, alternate: null, switched: false },
        { x: 6, y: 5, direction: 0, alternate: null, switched: false },
        { x: 7, y: 5, direction: 0, alternate: null, switched: false },
        { x: 8, y: 5, direction: 0, alternate: null, switched: false },
        { x: 9, y: 5, direction: 0, alternate: null, switched: false },
      ],
    });
    expect(first).not.toContain(a.factoryId);
    expect(first).not.toContain(a.machineId);
    expect(first).not.toContain("test-incident");
    expect(first).not.toContain("press-ferrite");
    expect(first).not.toContain('"cargo"');
    expect(first).not.toContain('"fuel"');
  });

  it("canonicalizes input ordering on parse", () => {
    const { state, factoryId } = makeFactory(24, 10);
    const canonical = serializeFactoryBlueprint(fixture, state, factoryId);
    const shuffled = JSON.parse(canonical) as {
      ports: unknown[];
      machines: unknown[];
      belts: unknown[];
    };
    shuffled.ports.reverse();
    shuffled.machines.reverse();
    shuffled.belts.reverse();

    expect(JSON.stringify(parseFactoryBlueprint(fixture, shuffled))).toBe(
      canonical,
    );
  });

  it("rejects malformed, unknown and runtime-bearing blueprint data", () => {
    const { state, factoryId } = makeFactory(24, 10);
    const valid = JSON.parse(
      serializeFactoryBlueprint(fixture, state, factoryId),
    ) as {
      schemaVersion: number;
      width: number;
      height: number;
      ports: Record<string, unknown>[];
      machines: Record<string, unknown>[];
      belts: Record<string, unknown>[];
    };

    const unknownMachine = structuredClone(valid);
    unknownMachine.machines[0].definitionId = "missing-machine";
    expect(() => parseFactoryBlueprint(fixture, unknownMachine)).toThrow(
      "Unknown blueprint machine definition",
    );

    const unknownOperation = structuredClone(valid);
    unknownOperation.machines[0].operation = "missing-operation";
    expect(() => parseFactoryBlueprint(fixture, unknownOperation)).toThrow(
      "Unknown or unsupported blueprint machine operation",
    );

    const runtimeCargo = structuredClone(valid);
    runtimeCargo.belts[0].cargo = "ferrite";
    expect(() => parseFactoryBlueprint(fixture, runtimeCargo)).toThrow(
      "unknown or missing fields",
    );

    const invalidWall = structuredClone(valid);
    invalidWall.ports[0].direction = 1;
    expect(() => parseFactoryBlueprint(fixture, invalidWall)).toThrow(
      "direction must cross its wall",
    );

    expect(() => parseFactoryBlueprint(fixture, "{nope")).toThrow(
      "not valid JSON",
    );
  });
});
