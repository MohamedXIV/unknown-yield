import { fixture } from "@site/content";
import { describe, expect, it } from "vitest";
import {
  Simulation, assessMineralExtraction, auditLedger, experimentEvidenceKey,
  initializeKnownMarkets, refreshMilestones,
} from "../src/index";

function machineAt(sim: Simulation, id: string) {
  return sim.snapshot().machines.find((m) => m.id === id)!;
}

/** A post-research fixture state: validated through the ordinary save loader.
 * Confirmation is granted as a test precondition; sensing, construction,
 * module install, imports and extraction run through real player commands. */
function researchCertified(sim: Simulation) {
  const save = sim.serialize();
  for (const reactionId of [
    "heat-raw-sealed", "vaporize-liquid-0", "collect-gas-0",
  ]) {
    const reaction = fixture.reactions.find((r) => r.id === reactionId)!;
    if (!save.knowledge.includes(reactionId)) save.knowledge.push(reactionId);
    save.evidence[experimentEvidenceKey(
      reaction.operation, reaction.input, reaction.processConditionId ?? null,
    )] = {
      operationId: reaction.operation, inputId: reaction.input,
      processConditionId: reaction.processConditionId ?? null, state: "confirmed",
    };
  }
  refreshMilestones(fixture, save);
  initializeKnownMarkets(fixture, save);
  const outcome = sim.load(save);
  expect(outcome.ok, outcome.message).toBe(true);
}

describe("P1c — third real mineral, discovery and physical extraction", () => {
  it("three differently behaving authored on-map materials, no material-ID branch", () => {
    const siteDeposits = fixture.site.deposits;
    const samples = [
      ["ferrite-field", "ferrite", "nominal", 20, 1],
      ["veined-field", "raw", "strained", 25, 2],
      ["catalyst-outcrop", "catalyst", "impossible", 20, 1],
    ] as const;
    for (const [depositId, materialId, compatibility, ticks, fuel] of samples) {
      expect(siteDeposits.find((d) => d.id === depositId)?.material).toBe(materialId);
      expect(assessMineralExtraction(fixture, {
        definitionId: "extractor", depositId, operatingModeId: "steady",
      })).toMatchObject({
        compatibility, durationTicks: ticks, fuelCost: fuel,
      });
    }
    expect(new Set(samples.map((s) => s[1])).size).toBe(3);
    expect(assessMineralExtraction(fixture, {
      definitionId: "extractor", depositId: "catalyst-outcrop",
      operatingModeId: "force",
    }).compatibility).toBe("impossible");
    expect(assessMineralExtraction(fixture, {
      definitionId: "deep-extractor", depositId: "catalyst-outcrop",
    })).toMatchObject({
      compatibility: "strained", durationTicks: 36, fuelCost: 1, stressLoad: 15,
    });
    expect(assessMineralExtraction(fixture, {
      definitionId: "deep-extractor", depositId: "veined-field",
    })).toMatchObject({
      compatibility: "nominal", durationTicks: 30, fuelCost: 1,
    });
  });

  it("physically blocks both basic modes on the real surface outcrop with no ore or fuel loss", () => {
    const sim = new Simulation(fixture);
    expect(sim.snapshot().deposits.some((d) => d.id === "catalyst-outcrop")).toBe(true);
    expect(JSON.stringify(sim.snapshot())).not.toContain("catalyst-seam-a");
    expect(JSON.stringify(sim.serialize())).not.toContain("catalyst-seam-a");
    const basic = sim.command({
      type: "placeMachine", definitionId: "extractor", x: 5, y: 49, direction: 0,
    });
    expect(basic.ok, basic.message).toBe(true);
    const id = basic.id!;
    expect(machineAt(sim, id)).toMatchObject({
      status: "material-too-hard", extractionCompatibility: "impossible",
    });
    const before = sim.serialize();
    sim.step(5000);
    expect(sim.serialize().fuel).toBe(before.fuel);
    expect(sim.serialize().deposits).toEqual(before.deposits);
    expect(machineAt(sim, id).job).toBeNull();
    expect(sim.command({
      type: "setOperatingMode", machineId: id, modeId: "force",
    }).ok).toBe(true);
    expect(machineAt(sim, id)).toMatchObject({
      status: "material-too-hard", extractionCompatibility: "impossible",
    });
    sim.step(5000);
    expect(sim.serialize().fuel).toBe(before.fuel);
    expect(sim.serialize().deposits).toEqual(before.deposits);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    expect(sim.command({ type: "dismantle", id }).ok).toBe(true);
  });

  it("discovers the hidden larger vein, unlocks a capable machine, imports real fuel, mines and reloads", () => {
    const sim = new Simulation(fixture);
    expect(sim.preview({
      type: "placeMachine", definitionId: "deep-extractor",
      x: 5, y: 49, direction: 0,
    }).ok).toBe(false);
    expect(sim.command({
      type: "sense", capabilityId: "resonance-probe", x: 57, y: 10,
    }).ok).toBe(false);
    researchCertified(sim);
    expect(sim.snapshot().sensingCapabilities.find(
      (c) => c.id === "resonance-probe",
    )?.unlocked).toBe(true);
    expect(sim.command({
      type: "sense", capabilityId: "resonance-probe", x: 57, y: 10,
    }).ok).toBe(true);
    expect(sim.snapshot().deposits.some((d) => d.id === "catalyst-seam-a")).toBe(true);
    expect(sim.preview({
      type: "placeMachine", definitionId: "extractor",
      x: 55, y: 8, direction: 0,
    }).ok).toBe(false); // Existing depth gate, separate from hardness.

    const deep = sim.command({
      type: "placeMachine", definitionId: "deep-extractor",
      x: 5, y: 49, direction: 0,
    });
    expect(deep.ok, deep.message).toBe(true);
    const id = deep.id!;
    expect(machineAt(sim, id)).toMatchObject({
      status: "needs-special-fuel", extractionCompatibility: "strained",
      durationTicks: 36, fuelCost: 1,
    });
    expect(sim.command({ type: "installTerminalModule", definitionId: "gas-dock" }).ok)
      .toBe(true);
    const importResult = sim.command({
      type: "requestImport", supplyId: "orbital-propellant-cylinder",
    });
    expect(importResult.ok, importResult.message).toBe(true);
    const preBatch = sim.serialize();
    expect(preBatch.terminalModules["gas-dock"]).toMatchObject({
      materialId: "orbital-propellant", quantity: 4,
    });
    sim.step(fixture.tickMs);
    const inBatch = sim.serialize();
    expect(inBatch.deposits["catalyst-outcrop"]).toBe(
      preBatch.deposits["catalyst-outcrop"] - 1,
    );
    expect(inBatch.terminalModules["gas-dock"].quantity).toBe(3);
    expect(machineAt(sim, id)).toMatchObject({
      status: "processing", job: { remaining: 36 },
    });
    expect(sim.command({ type: "setEnabled", machineId: id, enabled: false }).ok)
      .toBe(true);
    const restored = new Simulation(fixture);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    sim.step(36 * fixture.tickMs);
    restored.step(36 * fixture.tickMs);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(machineAt(sim, id).output.catalyst).toBe(1);
    expect(machineAt(sim, id).status).toBe("disabled");
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);

    // The older underground vein also takes the same authored tool after discovery.
    const second = sim.command({
      type: "placeMachine", definitionId: "deep-extractor",
      x: 55, y: 8, direction: 0,
    });
    expect(second.ok, second.message).toBe(true);
    expect(machineAt(sim, second.id!)).toMatchObject({
      depositId: "catalyst-seam-a", extractionCompatibility: "strained",
    });
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
});
