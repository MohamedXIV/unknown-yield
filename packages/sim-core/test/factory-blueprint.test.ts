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

describe("junction blueprint version boundary", () => {
  it("round-trips T topology in v2 while excluding fairness and cargo", () => {
    const { state, factoryId } = makeFactory(24, 22);
    const sim = new Simulation(fixture);
    expect(sim.load(state).ok).toBe(true);
    const belt = state.belts["25,27"];
    expect(
      sim.command({
        type: "configureJunction",
        beltId: belt.id,
        definitionId: "splitter",
        direction: 0,
        branch: -1,
      }).ok,
    ).toBe(true);
    const save = sim.serialize();
    const text = serializeFactoryBlueprint(fixture, save, factoryId);
    const bp = parseFactoryBlueprint(fixture, text);
    expect(bp.schemaVersion).toBe(2);
    expect(bp.belts.find((b) => b.x === 1 && b.y === 5)?.junction).toEqual({
      definitionId: "splitter",
      branch: -1,
    });
    save.belts["25,27"].junction!.cursor = 1;
    save.belts["25,27"].cargo = "plates";
    expect(serializeFactoryBlueprint(fixture, save, factoryId)).toBe(text);
    const legacy = parseFactoryBlueprint(
      fixture,
      serializeFactoryBlueprint(fixture, state, factoryId),
    );
    expect(legacy.schemaVersion).toBe(1);
    for (const junction of [
      { definitionId: "missing", branch: 1 },
      { definitionId: "splitter", branch: 0 },
      { definitionId: "splitter", branch: 1, cursor: 0 },
    ]) {
      const bad = structuredClone(bp);
      bad.belts.find((b) => b.x === 1 && b.y === 5)!.junction =
        junction as (typeof bp.belts)[number]["junction"];
      expect(() => parseFactoryBlueprint(fixture, bad)).toThrow();
    }
    const wall = structuredClone(bp);
    wall.belts.find((b) => b.x === 0 && b.y === 5)!.junction = {
      definitionId: "splitter",
      branch: 1,
    };
    expect(() => parseFactoryBlueprint(fixture, wall)).toThrow();
    expect(() =>
      parseFactoryBlueprint(fixture, { ...bp, schemaVersion: 1 }),
    ).toThrow();
  });
});

it("round-trips crossing topology in generic v2 without runtime scheduling", () => {
  const { state, factoryId } = makeFactory(24, 22);
  const sim = new Simulation(fixture);
  expect(sim.load(state).ok).toBe(true);
  expect(
    sim.command({
      type: "configureJunction",
      beltId: state.belts["25,27"].id,
      definitionId: "crossing",
      direction: 2,
      branch: -1,
    }).ok,
  ).toBe(true);
  const save = sim.serialize(),
    text = serializeFactoryBlueprint(fixture, save, factoryId),
    bp = parseFactoryBlueprint(fixture, text);
  expect(bp.schemaVersion).toBe(2);
  expect(bp.belts.find((b) => b.x === 1 && b.y === 5)).toMatchObject({
    direction: 2,
    junction: { definitionId: "crossing", branch: -1 },
  });
  expect(text).not.toContain("remaining");
  expect(text).not.toContain("held");
  save.belts["25,27"].junction!.crossing = {
    axis: 1,
    remaining: 0,
    pending: 0,
    held: 1,
  };
  save.belts["25,27"].cargo = "raw";
  expect(serializeFactoryBlueprint(fixture, save, factoryId)).toBe(text);
  const bad = structuredClone(bp);
  Object.assign(bad.belts.find((b) => b.x === 1 && b.y === 5)!.junction!, {
    remaining: 4,
  });
  expect(() => parseFactoryBlueprint(fixture, bad)).toThrow();
});

describe("liquid factory blueprints", () => {
  it("exports relative liquid layout/settings without duplicating contents", () => {
    const sim = new Simulation(fixture);
    const id = build(sim, {
      type: "placeFactory",
      x: 25,
      y: 10,
      width: 12,
      height: 10,
    });
    const tank = build(sim, { type: "placeTank", x: 27, y: 12, direction: 0 });
    const pump = build(sim, { type: "placePump", x: 29, y: 13, direction: 0 });
    build(sim, {
      type: "placePipes",
      points: [{ x: 30, y: 13, inlet: 2, outlet: 0 }],
    });
    const state = sim.serialize();
    state.tanks[tank].materialId = "liquid-0";
    state.tanks[tank].quantity = 8;
    state.pumps[pump].enabled = false;
    const encoded = serializeFactoryBlueprint(fixture, state, id),
      bp = parseFactoryBlueprint(fixture, encoded);
    expect(bp.schemaVersion).toBe(3);
    expect(bp.tanks).toEqual([{ x: 2, y: 2, direction: 0 }]);
    expect(bp.pumps).toEqual([{ x: 4, y: 3, direction: 0, enabled: false }]);
    expect(bp.pipes).toEqual([{ x: 5, y: 3, inlet: 2, outlet: 0 }]);
    expect(encoded).not.toContain("liquid-0");
    expect(encoded).not.toContain("quantity");
    const bad = structuredClone(bp);
    bad.pipes![0].x = 2;
    bad.pipes![0].y = 2;
    expect(() => parseFactoryBlueprint(fixture, bad)).toThrow(/overlap/i);
  });
});

describe("gas factory blueprints", () => {
  it("exports relative gas layout/settings without duplicating contents", () => {
    const sim = new Simulation(fixture);
    const id = build(sim, {
      type: "placeFactory",
      x: 25,
      y: 10,
      width: 12,
      height: 10,
    });
    const tank = build(sim, {
      type: "placePressureVessel",
      x: 27,
      y: 12,
      direction: 0,
    });
    const pump = build(sim, {
      type: "placeCompressor",
      x: 29,
      y: 13,
      direction: 0,
    });
    build(sim, {
      type: "placePressureLines",
      points: [{ x: 30, y: 13, inlet: 2, outlet: 0 }],
    });
    const state = sim.serialize();
    state.pressureVessels[tank].materialId = "gas-0";
    state.pressureVessels[tank].quantity = 8;
    state.compressors[pump].enabled = false;
    const encoded = serializeFactoryBlueprint(fixture, state, id),
      bp = parseFactoryBlueprint(fixture, encoded);
    expect(bp.schemaVersion).toBe(4);
    expect(bp.pressureVessels).toEqual([{ x: 2, y: 2, direction: 0 }]);
    expect(bp.compressors).toEqual([
      { x: 4, y: 3, direction: 0, enabled: false },
    ]);
    expect(bp.pressureLines).toEqual([{ x: 5, y: 3, inlet: 2, outlet: 0 }]);
    expect(encoded).not.toContain("gas-0");
    expect(encoded).not.toContain("quantity");
    const bad = structuredClone(bp);
    bad.pressureLines![0].x = 2;
    bad.pressureLines![0].y = 2;
    expect(() => parseFactoryBlueprint(fixture, bad)).toThrow(/overlap/i);
  });
});
