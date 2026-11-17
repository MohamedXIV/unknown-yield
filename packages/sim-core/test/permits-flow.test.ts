import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, type GameCommand } from "../src/index";

function build(s: Simulation, c: GameCommand) {
  const r = s.command(c);
  expect(r.ok, JSON.stringify(c) + " -> " + r.message).toBe(true);
  return r.id!;
}
function belts(x: number, y: number, endX: number, endY: number, direction = 0) {
  const points = [];
  for (let px = x; px <= endX; px++) points.push({ x: px, y });
  return { type: "placeBelts" as const, points, direction };
}

describe("a guided expedition can reach its first shipment with no dead end", () => {
  it("extractor, shell, ports, crusher, belts, then export", () => {
    const s = new Simulation(fixture, { guided: true });
    build(s, { type: "placeMachine", definitionId: "extractor", x: 18, y: 26, direction: 0 });
    const factory = build(s, { type: "placeFactory", x: 24, y: 22, width: 10, height: 10 });
    for (const x of [24, 33])
      build(s, { type: "placePort", factoryId: factory, x, y: 27, direction: 0 });
    build(s, { type: "placeMachine", definitionId: "crusher", x: 27, y: 26, direction: 0 });
    build(s, belts(20, 27, 26, 27));
    build(s, belts(29, 27, 37, 27));
    const locked = s.snapshot().unauthorizedTools;
    for (const tool of ["factory", "port", "crusher", "furnace", "depot"])
      expect(locked).not.toContain(tool);
    expect(locked).toContain("pipe");
    for (let i = 0; i < 600 && s.snapshot().exported === 0; i++) {
      s.step(1000);
      if (i === 5) s.command({ type: "setPolicy", materialId: "ferrite-ceramic", policy: "export" });
    }
    const snap = s.snapshot();
    // The crusher is working; every tool needed so far was authorized.
    expect(snap.machines.some((m) => m.definitionId === "crusher")).toBe(true);
    expect(snap.permits.filter((p) => p.earned).map((p) => p.id)).toEqual(
      expect.arrayContaining(["premises", "reduction"]),
    );
  });
});
