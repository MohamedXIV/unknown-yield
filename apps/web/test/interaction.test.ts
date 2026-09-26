import { it, expect } from "vitest";
import {
  beltPath,
  buildCommand,
  hitTest,
  structureKey,
  DEFAULT_MODE,
  TOOL_HOTKEYS,
} from "../game/interaction";
import { Simulation } from "@site/sim-core";
import { fixture } from "@site/content";
it("draws orthogonal paths including turns and reversed drags", () => {
  const p = beltPath({ x: 5, y: 5 }, { x: 2, y: 7 });
  expect(p).toHaveLength(6);
  for (let i = 1; i < p.length; i++)
    expect(Math.abs(p[i].x - p[i - 1].x) + Math.abs(p[i].y - p[i - 1].y)).toBe(
      1,
    );
  expect(p[0]).toEqual({ x: 5, y: 5 });
  expect(p.at(-1)).toEqual({ x: 2, y: 7 });
});
it("uses the current rotation for single belts and handles factory drag in all directions", () => {
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "belt", direction: 3 },
      s,
      { x: 3, y: 4 },
      null,
    ),
  ).toEqual({ type: "placeBelts", points: [{ x: 3, y: 4 }], direction: 3 });
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "factory" },
      s,
      { x: 24, y: 22 },
      { x: 33, y: 31 },
    ),
  ).toEqual({ type: "placeFactory", x: 24, y: 22, width: 10, height: 10 });
});
it("keeps toolbar hotkeys stable and maps the depot tool to placeStorage", () => {
  expect(TOOL_HOTKEYS).toMatchObject({
    extractor: "1",
    belt: "5",
    port: "6",
    depot: "7",
  });
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "depot", direction: 1 },
      s,
      { x: 10, y: 20 },
      null,
    ),
  ).toEqual({
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 1,
  });
});
it("selects the sealed furnace as a condition-bearing machine tool", () => {
  expect(TOOL_HOTKEYS["sealed-furnace"]).toBe("8");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "sealed-furnace" },
      s,
      { x: 27, y: 26 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "sealed-furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
});
it("selects the oversealed furnace as the hazardous condition tool", () => {
  expect(TOOL_HOTKEYS["oversealed-furnace"]).toBe("9");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "oversealed-furnace" },
      s,
      { x: 27, y: 26 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "oversealed-furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
});

it("hit-tests storage footprints by id", () => {
  const sim = new Simulation(fixture);
  const placed = sim.command({
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 0,
  });
  expect(placed.ok).toBe(true);
  const s = sim.snapshot();
  expect(hitTest(s, { x: 11, y: 21 }, [])).toBe(placed.id);
  expect(hitTest(s, { x: 0, y: 0 }, [])).toBeNull();
});
it("invalidates world geometry on storage-only topology edits", () => {
  const sim = new Simulation(fixture);
  const before = structureKey(sim.snapshot());
  const first = sim.command({
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 0,
  });
  expect(first.ok).toBe(true);
  const one = structureKey(sim.snapshot());
  expect(one).not.toBe(before);
  const second = sim.command({
    type: "placeStorage",
    definitionId: "depot",
    x: 30,
    y: 40,
    direction: 1,
  });
  expect(second.ok).toBe(true);
  const two = structureKey(sim.snapshot());
  expect(two).not.toBe(one);
  expect(sim.command({ type: "dismantle", id: second.id! }).ok).toBe(true);
  // Back to exactly the one-depot key: removal invalidates too.
  expect(structureKey(sim.snapshot())).toBe(one);
  // Cargo-only changes must not rebuild geometry.
  sim.step(5000);
  expect(structureKey(sim.snapshot())).toBe(one);
});
it("invalidates world geometry on diverter switch/rotate", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({
      type: "placeBelts",
      points: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      direction: 0,
    }).ok,
  ).toBe(true);
  const plain = structureKey(sim.snapshot());
  const id = sim.snapshot().belts[0].id;
  expect(sim.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
  const diverted = structureKey(sim.snapshot());
  expect(diverted).not.toBe(plain);
  expect(sim.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
  expect(structureKey(sim.snapshot())).not.toBe(diverted);
});
