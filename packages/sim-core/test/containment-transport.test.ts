import { describe, it, expect } from "vitest";
import { fixture, validateContent } from "@site/content";
import { Simulation } from "../src/index";
import { transportLiquids } from "../src/liquids";
import { transportGases } from "../src/gases";
import { transport } from "../src/production";
import { liquidDiagnostics } from "../src/liquids";
describe("containment admission", () => {
  function liquidRoute() {
    const sim = new Simulation(fixture);
    const source = sim.command({
      type: "placeTank",
      x: 10,
      y: 10,
      direction: 0,
      containmentProfileId: "lined",
    }).id!;
    const pump = sim.command({
      type: "placePump",
      x: 12,
      y: 11,
      direction: 0,
      containmentProfileId: "lined",
    }).id!;
    sim.command({
      type: "placePipes",
      points: [{ x: 13, y: 11, inlet: 2, outlet: 0 }],
      containmentProfileId: "lined",
    });
    const target = sim.command({
      type: "placeTank",
      x: 14,
      y: 10,
      direction: 0,
      containmentProfileId: "lined",
    }).id!;
    const state = sim.serialize();
    state.tanks[source].materialId = "liquid-0";
    state.tanks[source].quantity = 3;
    return { state, source, pump, target };
  }
  it("requires containment independently, with only authored pump exposure trapping cargo", () => {
    for (const kind of ["pump", "pipe", "tank"] as const) {
      const { state, source, pump, target } = liquidRoute();
      if (kind === "pump") state.pumps[pump].containmentProfileId = "standard";
      if (kind === "pipe")
        state.pipes["13,11"].containmentProfileId = "standard";
      if (kind === "tank") {
        state.tanks[source].quantity = 0;
        state.tanks[source].materialId = null;
        state.pipes["13,11"].quantity = 1;
        state.pipes["13,11"].materialId = "liquid-0";
        state.tanks[target].containmentProfileId = "standard";
      }
      const before = structuredClone(state);
      const events: unknown[] = [];
      transportLiquids(fixture, state, (e) => events.push(e));
      const diagnostic = liquidDiagnostics(fixture, before)[
        kind === "tank" ? before.pipes["13,11"].id : pump
      ];
      expect(diagnostic.reason).toBe("missing-containment");
      expect(diagnostic.missingContainment).toEqual(["corrosion-resistant"]);
      if(kind==="pump"){
        expect(state.tanks[source].quantity).toBe(before.tanks[source].quantity-1);
        expect(state.pumps[pump].incident?.quantity).toBe(1);
        expect(state.pumps[pump].enabled).toBe(false);
        expect(state.pipes).toEqual(before.pipes);expect(state.fuel).toBe(before.fuel);
      }else expect(state).toEqual(before);
      expect(events).toEqual([]);
    }
    const { state, target } = liquidRoute();
    transportLiquids(fixture, state);
    expect(state.pipes["13,11"].quantity).toBe(1);
    transportLiquids(fixture, state);
    expect(state.tanks[target].quantity).toBe(1);
  });
  it("requires every capability, including the receiving machine interface", () => {
    const draft = structuredClone(fixture);
    draft.containmentCapabilities.push({
      id: "heat-resistant",
      nameKey: "containment.corrosion-resistant.name",
    });
    draft.materials
      .find((m) => m.id === "liquid-0")!
      .requiredContainment.push("heat-resistant");
    draft
      .liquidLogistics!.containmentProfiles.find((p) => p.id === "lined")!
      .capabilities.push("heat-resistant");
    for (const m of draft.machines) {
      if (m.inputContainment.length) m.inputContainment.push("heat-resistant");
      if (m.outputContainment.length)
        m.outputContainment.push("heat-resistant");
    }
    for (const d of draft.site.terminalModules)
      d.containmentCapabilities = [
        ...new Set(
          draft.materials
            .filter((m) => m.handlingState === d.handlingState)
            .flatMap((m) => m.requiredContainment),
        ),
      ];
    const c = validateContent(draft),
      sim = new Simulation(c);
    sim.command({ type: "placeFactory", x: 10, y: 10, width: 10, height: 8 });
    sim.command({
      type: "placePipes",
      points: [{ x: 12, y: 13, inlet: 2, outlet: 0 }],
      containmentProfileId: "lined",
    });
    const m = sim.command({
      type: "placeMachine",
      definitionId: "precipitator",
      x: 13,
      y: 12,
      direction: 0,
    });
    expect(m.ok).toBe(true);
    const s = sim.serialize();
    s.pipes["12,13"].materialId = "liquid-0";
    s.pipes["12,13"].quantity = 1;
    c.machines.find((m) => m.id === "precipitator")!.inputContainment = [
      "corrosion-resistant",
    ];
    const before = structuredClone(s);
    transportLiquids(c, s);
    expect(s).toEqual(before);
    c.machines
      .find((m) => m.id === "precipitator")!
      .inputContainment.push("heat-resistant");
    transportLiquids(c, s);
    expect(s.machines[m.id!].input["liquid-0"]).toBe(1);
  });
  it("protects ordinary solid emission and terminal admission", () => {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "ferrite")!.requiredContainment = [
      "corrosion-resistant",
    ];
    for (const m of draft.machines) {
      m.inputContainment = ["corrosion-resistant"];
      m.outputContainment = ["corrosion-resistant"];
    }
    for (const d of draft.site.terminalModules)
      d.containmentCapabilities = [
        ...new Set(
          draft.materials
            .filter((m) => m.handlingState === d.handlingState)
            .flatMap((m) => m.requiredContainment),
        ),
      ];
    const c = validateContent(draft),
      state = new Simulation(c).serialize();
    state.belts["10,10"] = {
      id: "b1",
      x: 10,
      y: 10,
      direction: 0,
      cargo: "ferrite",
      alternate: null,
      switched: false,
    };
    state.belts["11,10"] = {
      id: "b2",
      x: 11,
      y: 10,
      direction: 0,
      cargo: null,
      alternate: null,
      switched: false,
    };
    const before = structuredClone(state);
    transport(c, state);
    expect(state).toEqual(before);
    c.site.beltContainment = ["corrosion-resistant"];
    transport(c, state);
    expect(state.belts["11,10"].cargo).toBe("ferrite");
    state.belts = {
      "37,27": {
        id: "b3",
        x: 37,
        y: 27,
        direction: 0,
        cargo: "ferrite",
        alternate: null,
        switched: false,
      },
    };
    const blocked = structuredClone(state);
    transport(c, state);
    expect(state).toEqual(blocked);
    c.site.dryContainment = ["corrosion-resistant"];
    transport(c, state);
    expect(state.staging.ferrite).toBe(1);
  });
  it("protects gas lines, receivers and compressor admission", () => {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "gas-0")!.requiredContainment = [
      "corrosion-resistant",
    ];
    draft.machines.find((m) => m.id === "vaporizer")!.outputContainment = [
      "corrosion-resistant",
    ];
    draft.machines.find((m) => m.id === "gas-collector")!.inputContainment = [
      "corrosion-resistant",
    ];
    for (const d of draft.site.terminalModules)
      d.containmentCapabilities = [
        ...new Set(
          draft.materials
            .filter((m) => m.handlingState === d.handlingState)
            .flatMap((m) => m.requiredContainment),
        ),
      ];
    const c = validateContent(draft),
      state = new Simulation(c).serialize();
    state.pressureLines = {
      "10,10": {
        id: "g1",
        x: 10,
        y: 10,
        inlet: 2,
        outlet: 0,
        materialId: "gas-0",
        quantity: 2,
      },
      "11,10": {
        id: "g2",
        x: 11,
        y: 10,
        inlet: 2,
        outlet: 0,
        materialId: null,
        quantity: 0,
      },
    };
    const before = structuredClone(state);
    transportGases(c, state);
    expect(state).toEqual(before);
    c.gasLogistics!.line.containmentCapabilities = ["corrosion-resistant"];
    transportGases(c, state);
    expect(state.pressureLines["11,10"].quantity).toBe(1);
    state.pressureLines = {
      "13,11": {
        id: "g3",
        x: 13,
        y: 11,
        inlet: 2,
        outlet: 0,
        materialId: null,
        quantity: 0,
      },
    };
    state.pressureVessels = {
      v4: {
        id: "v4",
        x: 10,
        y: 10,
        direction: 0,
        materialId: "gas-0",
        quantity: 2,
      },
    };
    c.gasLogistics!.vessel.containmentCapabilities = ["corrosion-resistant"];
    state.compressors = {
      c5: { id: "c5", x: 12, y: 11, direction: 0, enabled: true },
    };
    const compressorBlocked = structuredClone(state);
    transportGases(c, state);
    expect(state).toEqual(compressorBlocked);
    c.gasLogistics!.compressor.containmentCapabilities = [
      "corrosion-resistant",
    ];
    transportGases(c, state);
    expect(state.pressureLines["13,11"].quantity).toBe(1);
  });
});
