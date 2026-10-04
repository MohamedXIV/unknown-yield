import { describe, it, expect } from "vitest";
import { fixture, validateContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
describe("physical containment profiles", () => {
  it("embodies exact profile costs and refunds only empty infrastructure", () => {
    const sim = new Simulation(fixture),
      before = sim.serialize();
    const path = {
      type: "placePipes" as const,
      containmentProfileId: "lined",
      points: [{ x: 10, y: 10, inlet: 2, outlet: 0 }],
    };
    expect(sim.preview(path).cost).toBe(4);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(path).ok).toBe(true);
    const pipe = sim.serialize().pipes["10,10"];
    expect(pipe.containmentProfileId).toBe("lined");
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    expect(
      sim.command({
        type: "setLiquidContainmentProfile",
        id: pipe.id,
        containmentProfileId: "standard",
      }).ok,
    ).toBe(true);
    expect(sim.serialize().stock.plates).toBe(before.stock.plates - 2);
    const standard = sim.serialize();
    expect(
      sim.command({
        type: "setLiquidContainmentProfile",
        id: pipe.id,
        containmentProfileId: "standard",
      }).ok,
    ).toBe(true);
    expect(sim.serialize()).toEqual(standard);
    expect(sim.command({ type: "dismantle", id: pipe.id }).ok).toBe(true);
    expect(sim.serialize().stock.plates).toBe(before.stock.plates);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
  it("builds profiled tank/pump and guards active, loaded, invalid or unaffordable changes", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.preview({
        type: "placeTank",
        x: 10,
        y: 10,
        direction: 0,
        containmentProfileId: "lined",
      }).cost,
    ).toBe(34);
    expect(
      sim.preview({
        type: "placePump",
        x: 13,
        y: 11,
        direction: 0,
        containmentProfileId: "lined",
      }).cost,
    ).toBe(16);
    const result = sim.command({
      type: "placePump",
      x: 13,
      y: 11,
      direction: 0,
    });
    expect(result.ok).toBe(true);
    const cmd = {
      type: "setLiquidContainmentProfile" as const,
      id: result.id!,
      containmentProfileId: "lined",
    };
    const active = sim.serialize();
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(active);
    expect(
      sim.command({ type: "setPumpEnabled", id: result.id!, enabled: false })
        .ok,
    ).toBe(true);
    expect(sim.command(cmd).ok).toBe(true);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    const before = sim.serialize();
    expect(sim.command({ ...cmd, containmentProfileId: "missing" }).ok).toBe(
      false,
    );
    expect(sim.serialize()).toEqual(before);
    const draft = structuredClone(fixture);
    draft.site.startStock = 3;
    const poor = new Simulation(validateContent(draft)),
      poorBefore = poor.serialize();
    expect(
      poor.command({
        type: "placePipes",
        containmentProfileId: "lined",
        points: [{ x: 10, y: 20, inlet: 2, outlet: 0 }],
      }).ok,
    ).toBe(false);
    expect(poor.serialize()).toEqual(poorBefore);
  });
});
