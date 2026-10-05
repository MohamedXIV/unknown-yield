import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  applyExportCompensation,
  ensureMarket,
  experimentEvidenceKey,
  marketCompensation,
  recordMarketExport,
  recoverMarkets,
} from "../src/index";

function knownGranulesContent() {
  const content = structuredClone(fixture);
  content.materials.find((material) => material.id === "granules")!.known =
    true;
  delete content.economy.exchange[0].requiredTerminalCapabilityId;
  return content;
}

describe("authoritative Materials Exchange", () => {
  it("does not list or expose an undiscovered authored product", () => {
    const simulation = new Simulation(fixture);
    expect(simulation.snapshot().exchange).toEqual([]);
    expect(JSON.stringify(simulation.snapshot())).not.toContain(
      '"materialId":"granules"',
    );

    const save = simulation.serialize(),
      reaction = fixture.reactions.find((entry) => entry.id === "crush-raw")!;
    save.knowledge.push(reaction.id);
    save.evidence[
      experimentEvidenceKey(
        reaction.operation,
        reaction.input,
        reaction.processConditionId ?? null,
      )
    ] = {
      operationId: reaction.operation,
      inputId: reaction.input,
      processConditionId: reaction.processConditionId ?? null,
      state: "confirmed",
    };
    ensureMarket(fixture, save, "granules");
    save.policies.granules = "export";

    expect(simulation.load(save).ok).toBe(true);
    expect(simulation.snapshot().exchange).toEqual([
      {
        materialId: "granules",
        demandBps: 10000,
        saturationBps: 0,
        compensationPerUnit: 12,
        handling: {
          nameKey: "terminal.capability.sealed-sample-outbound.name",
          unlocked: false,
        },
      },
    ]);
  });

  it("reduces compensation from repeated supply to an authored floor and recovers deterministically", () => {
    const content = knownGranulesContent(),
      simulation = new Simulation(content),
      save = simulation.serialize();

    expect(marketCompensation(content, save, "granules")).toBe(12);
    recordMarketExport(content, save, "granules", 3);
    expect(save.market.granules.saturationBps).toBe(3000);
    expect(marketCompensation(content, save, "granules")).toBe(10);

    recordMarketExport(content, save, "granules", 100);
    expect(save.market.granules.saturationBps).toBe(10000);
    expect(marketCompensation(content, save, "granules")).toBe(4);

    for (let i = 0; i < 20; i++) recoverMarkets(content, save);
    expect(save.market.granules.saturationBps).toBe(5000);
    expect(marketCompensation(content, save, "granules")).toBe(8);
  });

  it("persists market memory exactly across save/load", () => {
    const content = knownGranulesContent(),
      source = new Simulation(content),
      save = source.serialize();
    recordMarketExport(content, save, "granules", 4);

    const restored = new Simulation(content);
    expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(22);
    expect(restored.serialize().market).toEqual(save.market);
    expect(restored.snapshot().exchange).toEqual([
      {
        materialId: "granules",
        demandBps: 10000,
        saturationBps: 4000,
        compensationPerUnit: 9,
        handling: null,
      },
    ]);
  });

  it("repays corporate debt before granting net fuel and records saturation", () => {
    const content = knownGranulesContent(),
      simulation = new Simulation(content),
      save = simulation.serialize();
    save.fuel = 0;
    save.debt = 20;

    expect(applyExportCompensation(content, save, "granules", 2)).toEqual({
      perUnit: 12,
      gross: 24,
      repaid: 20,
      net: 4,
    });
    expect(save.debt).toBe(0);
    expect(save.fuel).toBe(4);
    expect(save.market.granules.saturationBps).toBe(2000);
  });
});
