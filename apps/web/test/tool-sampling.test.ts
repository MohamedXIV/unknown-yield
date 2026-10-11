import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation } from "@site/sim-core";
import { sampleBuildTool } from "../game/tool-sampling";

describe("P6 world pipette — pure tool sampling", () => {
  it("samples a real belt, including an occupied one, without copying cargo or changing save", () => {
    const sim = new Simulation(fixture);
    const build = sim.command({
      type: "placeBelts", points: [{ x: 30, y: 10 }], direction: 1,
    });
    expect(build.ok).toBe(true);
    const save = sim.serialize();
    save.stock[fixture.site.buildMaterial] -= 1;
    save.belts["30,10"].cargo = fixture.site.buildMaterial;
    expect(sim.load(save).ok).toBe(true);
    const before = JSON.stringify(sim.serialize());
    const beltId = sim.snapshot().belts.find((b) => b.x === 30 && b.y === 10)!.id;
    expect(sampleBuildTool(sim.snapshot(), beltId)).toEqual({
      tool: "belt",
      direction: 1,
    });
    expect(JSON.stringify(sim.serialize())).toBe(before);
    expect(sampleBuildTool(sim.snapshot(), "terminal")).toBeNull();
    expect(sampleBuildTool(sim.snapshot(), "stale-id")).toBeNull();
    expect(sampleBuildTool(sim.snapshot(), fixture.site.deposits[0].id)).toBeNull();
  });

  it("samples directed liquid and gas without copying fluids or gas", () => {
    const sim = new Simulation(fixture);
    expect(sim.command({
      type: "placePipes", containmentProfileId: "standard",
      points: [{ x: 34, y: 10, inlet: 2, outlet: 0 }],
    }).ok).toBe(true);
    expect(sim.command({
      type: "placePressureLines",
      points: [{ x: 36, y: 10, inlet: 2, outlet: 0 }],
    }).ok).toBe(true);
    const before = JSON.stringify(sim.serialize());
    const snapshot = sim.snapshot();
    const pipe = snapshot.pipes.find((p) => p.x === 34 && p.y === 10)!;
    const gas = snapshot.pressureLines.find((p) => p.x === 36 && p.y === 10)!;
    expect(sampleBuildTool(snapshot, pipe.id)).toEqual({
      tool: "pipe", direction: 0, containmentProfileId: "standard",
    });
    expect(sampleBuildTool(snapshot, gas.id)).toEqual({
      tool: "pressure-line", direction: 0,
    });
    expect(JSON.stringify(sim.serialize())).toBe(before);
  });

  it("samples valid imported machine IDs via live definitions, without inventing unlocks", () => {
    const sim = new Simulation(fixture);
    const placement = sim.command({
      type: "placeMachine", definitionId: "extractor", x: 15, y: 25, direction: 2,
    });
    expect(placement.ok, placement.message).toBe(true);
    const snapshot = structuredClone(sim.snapshot());
    const extractor = snapshot.machines.find((m) => m.id === placement.id)!;
    expect(sampleBuildTool(snapshot, extractor.id)).toEqual({
      tool: "extractor", direction: 2,
    });
    // Authoring/import adds a machine definition with a stable identifier.
    // The sampler uses the live validated list, not a hard-coded Tool union.
    const definition = snapshot.definitions.find((d) => d.id === "extractor")!;
    snapshot.definitions.push({
      ...definition, id: "imported-press-v2",
    });
    extractor.definitionId = "imported-press-v2";
    expect(sampleBuildTool(snapshot, extractor.id)).toEqual({
      tool: "imported-press-v2", direction: 2,
    });
    snapshot.definitions.pop();
    expect(sampleBuildTool(snapshot, extractor.id)).toBeNull();
  });

  it("refuses ambiguous colocated IDs rather than choosing arbitrary structure", () => {
    const sim = new Simulation(fixture);
    expect(sim.command({
      type: "placeBelts", points: [{ x: 30, y: 10 }], direction: 0,
    }).ok).toBe(true);
    const snapshot = structuredClone(sim.snapshot());
    snapshot.belts.push({ ...snapshot.belts[0] });
    expect(sampleBuildTool(snapshot, snapshot.belts[0].id)).toBeNull();
  });
});
