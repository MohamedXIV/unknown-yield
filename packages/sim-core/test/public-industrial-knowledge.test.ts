import { fixture } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

describe("P1 player-facing industrial knowledge boundary", () => {
  it("publishes known appearance and mode identity, never exact authored traits or coefficients", () => {
    const sim = new Simulation(fixture);
    const snapshot = sim.snapshot();
    const authoritative = fixture.machines.find((m) => m.id === "extractor")!;
    expect(authoritative.extractionEnvelope).toBeDefined();
    expect(authoritative.operatingModes.find((mode) => mode.id === "force"))
      .toMatchObject({ nominalLoadBonus: 2, maximumLoadBonus: 2, durationBps: 8500, extraFuel: 2 });
    expect(fixture.materials.find((m) => m.id === "raw")!.mechanics)
      .toMatchObject({ hardness: 3, abrasiveness: 2, brittleness: 1 });

    const publicMachine = snapshot.definitions.find((m) => m.id === "extractor")!;
    expect(publicMachine).toMatchObject({
      nameKey: authoritative.nameKey,
      role: "extractor",
      width: authoritative.width,
      height: authoritative.height,
      operatingModes: [
        { id: "steady", nameKey: authoritative.operatingModes[0]!.nameKey },
        { id: "force", nameKey: authoritative.operatingModes[1]!.nameKey },
      ],
    });
    expect(publicMachine).not.toHaveProperty("extractionEnvelope");
    expect(publicMachine.operatingModes[1]).toEqual({
      id: "force", nameKey: authoritative.operatingModes[1]!.nameKey,
    });
    for (const material of snapshot.materials) {
      expect(material).not.toHaveProperty("mechanics");
      expect(material).not.toHaveProperty("known");
      expect(material).toHaveProperty("nameKey");
      expect(material).toHaveProperty("requiredContainment");
    }
    const json = JSON.stringify(snapshot);
    for (const privateKey of [
      "mechanics", "extractionEnvelope", "nominalLoadBonus",
      "maximumLoadBonus", "durationBps", "extraFuel",
      "strainedDurationPerLoadBps", "strainedFuelPerLoad",
    ]) expect(json).not.toContain('"' + privateKey + '"');
    expect(json).not.toContain("catalyst-seam-a"); // undiscovered deposit stays hidden
  });

  it("preserves actual diagnosis, current fuel/duration and public mode selection through a save/load", () => {
    const sim = new Simulation(fixture);
    const placed = sim.command({
      type: "placeMachine", definitionId: "extractor",
      x: 18, y: 36, direction: 0,
    });
    expect(placed.ok, placed.message).toBe(true);
    const id = placed.id!;
    const before = sim.snapshot().machines.find((m) => m.id === id)!;
    expect(before).toMatchObject({
      operatingModeId: "steady", extractionCompatibility: "strained",
      durationTicks: 25, fuelCost: 2,
    });
    const command = { type: "setOperatingMode", machineId: id, modeId: "force" };
    const serializedBefore = sim.serialize();
    expect(sim.preview(command).ok).toBe(true);
    expect(sim.serialize()).toEqual(serializedBefore);
    expect(sim.command(command).ok).toBe(true);
    const after = sim.snapshot().machines.find((m) => m.id === id)!;
    expect(after).toMatchObject({
      operatingModeId: "force", extractionCompatibility: "nominal",
      durationTicks: 17, fuelCost: 3,
    });
    const restored = new Simulation(fixture);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    expect(restored.snapshot()).toEqual(sim.snapshot());
    sim.step(fixture.tickMs);
    restored.step(fixture.tickMs);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("does not disclose private mechanical truth when a fourth material is authored", () => {
    const custom = structuredClone(fixture);
    custom.materials.push({
      id: "probe-matter",
      nameKey: "material.probe-matter.name", color: "#aabbcc", known: true,
      handlingState: "solid", requiredContainment: [],
      mechanics: { hardness: 9, abrasiveness: 8, brittleness: 7 },
    });
    const sim = new Simulation(custom);
    const material = sim.snapshot().materials.find((m) => m.id === "probe-matter");
    expect(material).toEqual({
      id: "probe-matter", nameKey: "material.probe-matter.name",
      color: "#aabbcc", handlingState: "solid", requiredContainment: [],
    });
    expect(custom.materials.find((m) => m.id === "probe-matter")!.mechanics)
      .toEqual({ hardness: 9, abrasiveness: 8, brittleness: 7 });
  });
});
