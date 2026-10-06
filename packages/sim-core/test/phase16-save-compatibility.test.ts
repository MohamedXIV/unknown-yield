import { fixture } from "@site/content";
import { describe, expect, it } from "vitest";
import { Simulation, auditLedger } from "../src/index";

const supportedLegacySchemas = [21, 22, 23, 24, 25, 26] as const;

function legacyInitialSave(schemaVersion: (typeof supportedLegacySchemas)[number]) {
  const current = new Simulation(fixture).serialize();
  const legacy = structuredClone(current) as unknown as Record<string, any>;
  legacy.schemaVersion = schemaVersion;

  if (schemaVersion < 22) delete legacy.shipmentManifest;
  if (schemaVersion < 23) delete legacy.terminalImports;
  if (schemaVersion < 24) delete legacy.marketSignals;
  if (schemaVersion < 25) delete legacy.company.importAllocations;
  if (schemaVersion < 26) {
    delete legacy.undergroundSolids;
    delete legacy.undergroundLiquids;
  }
  if (schemaVersion < 27) delete legacy.elevatedSolids;

  return { current, legacy };
}

describe("Phase 16 supported save compatibility", () => {
  for (const schemaVersion of supportedLegacySchemas)
    it(`migrates supported schema ${schemaVersion} atomically to the current save`, () => {
      const { current, legacy } = legacyInitialSave(schemaVersion);
      const restored = new Simulation(fixture);

      expect(restored.load(legacy)).toEqual({
        ok: true,
        message: "Site restored",
      });
      expect(restored.serialize()).toEqual(current);
      expect(restored.serialize().schemaVersion).toBe(27);
      expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
    });

  it("rejects impossible legacy-only state without partially replacing the live site", () => {
    const sim = new Simulation(fixture);
    sim.step(fixture.tickMs * 7);
    const before = sim.serialize();
    const { legacy } = legacyInitialSave(26);

    legacy.elevatedSolids = {
      e1: {
        id: "e1",
        entry: { x: 1, y: 1 },
        exit: { x: 2, y: 1 },
        direction: 0,
        cargo: null,
      },
    };

    const result = sim.load(legacy);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Legacy schema cannot contain elevated routes");
    expect(result.message).toContain("requires schema 27");
    expect(sim.serialize()).toEqual(before);
  });

  it("rejects incompatible content without partially replacing the live site", () => {
    const sim = new Simulation(fixture);
    sim.step(fixture.tickMs * 11);
    const before = sim.serialize();
    const incompatible = structuredClone(before);
    incompatible.contentVersion = "world-01-v13";

    const result = sim.load(incompatible);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Incompatible content or timing");
    expect(sim.serialize()).toEqual(before);
  });
});
