import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation } from "../src/index";
import {
  factoryBlueprint,
  validateFactoryBlueprint,
} from "../src/factory-blueprint";
it("exports profiled liquid layout in v5 and rejects unknown profiles without copying holdings", () => {
  const sim = new Simulation(fixture);
  const f = sim.command({
    type: "placeFactory",
    x: 10,
    y: 10,
    width: 8,
    height: 8,
  });
  expect(f.ok).toBe(true);
  expect(
    sim.command({
      type: "placePipes",
      points: [{ x: 12, y: 12, inlet: 2, outlet: 0 }],
      containmentProfileId: "lined",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placePressureLines",
      points: [{ x: 14, y: 12, inlet: 2, outlet: 0 }],
    }).ok,
  ).toBe(true);
  const b = factoryBlueprint(fixture, sim.serialize(), f.id!);
  expect(b.schemaVersion).toBe(5);
  expect(b.pipes![0]).toEqual({
    x: 2,
    y: 2,
    inlet: 2,
    outlet: 0,
    containmentProfileId: "lined",
  });
  expect(b.pressureLines).toEqual([{ x: 4, y: 2, inlet: 2, outlet: 0 }]);
  expect(validateFactoryBlueprint(fixture, b)).toEqual(b);
  const bad = structuredClone(b);
  Object.assign(bad.pipes![0], { containmentProfileId: "missing" });
  expect(() => validateFactoryBlueprint(fixture, bad)).toThrow(/profile/i);
  expect(JSON.stringify(b)).not.toMatch(
    /materialId|quantity|knowledge|certificate/,
  );
  const legacy = structuredClone(b);
  legacy.schemaVersion = 4;
  for (const p of legacy.pipes!) delete p.containmentProfileId;
  expect(validateFactoryBlueprint(fixture, legacy)).toEqual(legacy);
  Object.assign(legacy.pipes![0], { containmentProfileId: "lined" });
  expect(() => validateFactoryBlueprint(fixture, legacy)).toThrow(/fields/i);
});
