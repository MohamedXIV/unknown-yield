import { describe, it, expect } from "vitest";
import { fixture, validateContent } from "@site/content";
import { Simulation } from "../src/index";
import { publicTransportDiagnostic } from "../src/containment";
describe("containment knowledge boundary", () => {
  it("shows equipment capabilities without revealing unknown material requirements", () => {
    const s = new Simulation(fixture).snapshot();
    expect(s.materials.some((m) => m.id === "liquid-0")).toBe(false);
    expect(
      s.containmentCapabilities.some((c) => c.id === "corrosion-resistant"),
    ).toBe(true);
    expect(s.transportDiagnostics).toEqual({});
    expect(s.definitions).not.toHaveProperty("requiredMaterials");
  });
  it("sanitizes unknown cargo diagnostics but retains known requirements", () => {
    const diagnostic = {
      reason: "missing-containment" as const,
      materialId: "liquid-0",
      missingContainment: ["corrosion-resistant"],
      containmentProfileId: "standard",
    };
    expect(publicTransportDiagnostic(diagnostic, new Set())).toEqual({
      reason: "incompatible",
      containmentProfileId: "standard",
    });
    expect(
      publicTransportDiagnostic(diagnostic, new Set(["liquid-0"])),
    ).toEqual(diagnostic);
  });
  it("reports current held cargo without revealing a hinted next output and detaches diagnostics", () => {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "liquid-0")!.known = true;
    const content = validateContent(draft),
      sim = new Simulation(content);
    sim.command({
      type: "placePipes",
      points: [{ x: 10, y: 10, inlet: 2, outlet: 0 }],
      containmentProfileId: "lined",
    });
    sim.command({
      type: "placePipes",
      points: [{ x: 11, y: 10, inlet: 2, outlet: 0 }],
    });
    const state = sim.serialize();
    state.pipes["10,10"].materialId = "liquid-0";
    state.pipes["10,10"].quantity = 1;
    state.flows.produced["liquid-0"] = 1;
    expect(sim.load(state).ok).toBe(true);
    const snapshot = sim.snapshot(),
      id = state.pipes["10,10"].id;
    expect(snapshot.transportDiagnostics[id]).toMatchObject({
      reason: "missing-containment",
      materialId: "liquid-0",
      missingContainment: ["corrosion-resistant"],
    });
    snapshot.transportDiagnostics[id].missingContainment!.push("fake");
    snapshot.pipes[0].containmentProfileId = "standard";
    expect(sim.serialize()).toEqual(state);
    expect(sim.snapshot().transportDiagnostics[id].missingContainment).toEqual([
      "corrosion-resistant",
    ]);
    expect(JSON.stringify(sim.snapshot().observations)).not.toContain("gas-0");
  });
});
