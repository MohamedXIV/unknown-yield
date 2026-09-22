import { it, expect } from "vitest";
import { beltPath, buildCommand, DEFAULT_MODE } from "../game/interaction";
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
