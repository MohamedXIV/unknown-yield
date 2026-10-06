import { historicalFixture } from "./historical-content";
import { describe, it, expect } from "vitest";
import { fixture, validateContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { parseSave } from "../src/save";
describe("protected save boundaries", () => {
  it("checks dry inventory, depot, belt, machine buffers and gas vessel independently of ledger", () => {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "granules")!.known = true;
    draft.materials.find((m) => m.id === "granules")!.requiredContainment = [
      "corrosion-resistant",
    ];
    draft.materials.find((m) => m.id === "gas-0")!.known = true;
    draft.materials.find((m) => m.id === "gas-0")!.requiredContainment = [
      "corrosion-resistant",
    ];
    draft.materials.find((m) => m.id === "liquid-0")!.known = true;
    draft.machines.find((m) => m.id === "precipitator")!.outputContainment = [
      "corrosion-resistant",
    ];
    draft.machines.find((m) => m.id === "gas-collector")!.inputContainment = [
      "corrosion-resistant",
    ];
    draft.machines.find((m) => m.id === "gas-collector")!.outputContainment = [
      "corrosion-resistant",
    ];
    draft.machines.find((m) => m.id === "vaporizer")!.outputContainment = [
      "corrosion-resistant",
    ];
    draft.machines.find((m) => m.id === "crusher")!.inputStates = [
      "solid",
      "liquid",
    ];
    for (const machine of draft.machines)
      machine.outputContainment = ["corrosion-resistant"];
    draft.machines.find(
      (machine) => machine.id === "phase-quencher",
    )!.outputContainment = [
      "cryogenic-rated",
      "hazard-isolated",
      "secure-chain",
    ];
    for (const d of draft.site.terminalModules)
      d.containmentCapabilities = [
        ...new Set(
          draft.materials
            .filter((m) => m.handlingState === d.handlingState)
            .flatMap((m) => m.requiredContainment),
        ),
      ];
    const content = validateContent(draft),
      sim = new Simulation(content);
    const f = sim.command({
      type: "placeFactory",
      x: 20,
      y: 10,
      width: 10,
      height: 10,
    });
    expect(f.ok).toBe(true);
    const m = sim.command({
      type: "placeMachine",
      definitionId: "crusher",
      x: 22,
      y: 12,
      direction: 0,
    });
    expect(m.ok).toBe(true);
    const t = sim.command({
      type: "placeStorage",
      definitionId: "depot",
      x: 10,
      y: 10,
      direction: 0,
    });
    expect(t.ok).toBe(true);
    const v = sim.command({
      type: "placePressureVessel",
      x: 14,
      y: 10,
      direction: 0,
    });
    expect(v.ok).toBe(true);
    sim.command({
      type: "placeBelts",
      points: [{ x: 10, y: 15 }],
      direction: 0,
    });
    const before = sim.serialize();
    const mutations = [
      (s: typeof before) => {
        s.stock.granules = 1;
      },
      (s: typeof before) => {
        s.staging.granules = 1;
      },
      (s: typeof before) => {
        s.storages[t.id!].inventory.granules = 1;
      },
      (s: typeof before) => {
        s.belts["10,15"].cargo = "granules";
      },
      (s: typeof before) => {
        s.machines[m.id!].input["liquid-0"] = 1;
      },
      (s: typeof before) => {
        s.pressureVessels[v.id!].materialId = "gas-0";
        s.pressureVessels[v.id!].quantity = 1;
      },
    ];
    for (const mutate of mutations) {
      const bad = structuredClone(before);
      mutate(bad);
      expect(() => parseSave(bad, content)).toThrow(/containment/i);
      expect(sim.load(bad).ok).toBe(false);
      expect(sim.serialize()).toEqual(before);
    }
  });
  it("roundtrips a protected holding and rejects incompatible profiles atomically", () => {
    const draft = structuredClone(fixture);
    draft.materials.find((m) => m.id === "liquid-0")!.known = true;
    for (const d of draft.site.terminalModules)
      d.containmentCapabilities = [
        ...new Set(
          draft.materials
            .filter((m) => m.handlingState === d.handlingState)
            .flatMap((m) => m.requiredContainment),
        ),
      ];
    const content = validateContent(draft);
    const sim = new Simulation(content);
    sim.command({
      type: "placePipes",
      containmentProfileId: "lined",
      points: [{ x: 10, y: 10, inlet: 2, outlet: 0 }],
    });
    const seeded = sim.serialize();
    seeded.pipes["10,10"].materialId = "liquid-0";
    seeded.pipes["10,10"].quantity = 1;
    seeded.flows.produced["liquid-0"] = 1;
    const restored = sim.load(seeded);
    expect(restored.ok, restored.message).toBe(true);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    const before = sim.serialize();
    for (const profile of ["standard", "missing"]) {
      const bad = structuredClone(before);
      bad.pipes["10,10"].containmentProfileId = profile;
      if (profile === "standard") bad.stock.plates += 2;
      expect(sim.load(bad).ok).toBe(false);
      expect(sim.serialize()).toEqual(before);
    }
    expect(
      sim.command({
        type: "setLiquidContainmentProfile",
        id: before.pipes["10,10"].id,
        containmentProfileId: "standard",
      }).ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });
  it("migrates matching-content empty schema 15 and refuses older historicalFixture content", () => {
    const sim = new Simulation(historicalFixture);
    sim.command({ type: "placePump", x: 10, y: 10, direction: 0 });
    const legacy = structuredClone(sim.serialize()) as Record<string, unknown>;
    legacy.schemaVersion = 15;
    const pumps = legacy.pumps as Record<string, Record<string, unknown>>;
    for (const pump of Object.values(pumps)) delete pump.containmentProfileId;
    expect(sim.load(legacy).ok).toBe(true);
    expect(sim.serialize().schemaVersion).toBe(27);
    expect(Object.values(sim.serialize().pumps)[0].containmentProfileId).toBe(
      "standard",
    );
    const before = sim.serialize();
    legacy.contentVersion = "world-01-v8";
    expect(sim.load(legacy).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });
});
