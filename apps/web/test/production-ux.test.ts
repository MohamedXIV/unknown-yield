import { fixture } from "@site/content";
import { Simulation } from "@site/sim-core";
import { describe, expect, it } from "vitest";
import {
  knowledgeOverview,
  knowledgeVisible,
  selectionOverview,
  terminalOverview,
} from "../game/production-ux";

describe("production context UX", () => {
  it("filters public notebook evidence without inventing hidden truth", () => {
    const snapshot = new Simulation(fixture).snapshot(),
      summary = knowledgeOverview(snapshot);

    expect(summary.open).toBeGreaterThan(0);
    expect(summary.hazards).toBe(0);
    expect(knowledgeVisible("all", "hazard")).toBe(true);
    expect(knowledgeVisible("open", "hinted")).toBe(true);
    expect(knowledgeVisible("open", "insight-branch")).toBe(true);
    expect(knowledgeVisible("open", "confirmed")).toBe(false);
    expect(knowledgeVisible("hazards", "hazard")).toBe(true);
    expect(knowledgeVisible("confirmed", "confirmed")).toBe(true);
    expect(knowledgeVisible("confirmed", "insight-other")).toBe(true);
    expect(knowledgeVisible("confirmed", "hinted")).toBe(false);

    const publicCopy = JSON.stringify({
      summary,
      insights: snapshot.knowledgeInsights,
    });
    for (const hiddenId of [
      "heat-ferrite",
      "sinter-catalyst",
      "sinter-resonance-seed",
      "liquefy-raw",
    ])
      expect(publicCopy).not.toContain(hiddenId);
  });

  it("prioritizes physical terminal cargo and manifest state", () => {
    const base = new Simulation(fixture).snapshot(),
      materialId = base.materials[0]!.id,
      staged = structuredClone(base);
    staged.exchange = [
      {
        materialId,
        compensationPerUnit: 5,
        demandBps: 10000,
        saturationBps: 0,
        handling: null,
      },
    ];
    staged.staging[materialId] = 4;
    expect(terminalOverview(staged)).toMatchObject({
      tone: "good",
      eyebrow: "PHYSICAL CARGO",
      exportableStaged: 4,
      manifestSelected: 0,
    });

    staged.shipmentManifest[materialId] = 2;
    expect(terminalOverview(staged)).toMatchObject({
      tone: "good",
      eyebrow: "SHIPMENT READY",
      manifestSelected: 2,
      exportableStaged: 4,
    });

    const obligation = structuredClone(base);
    obligation.staging = {};
    obligation.shipmentManifest = {};
    obligation.opportunities = [];
    obligation.debt = 12;
    for (const module of obligation.terminalModules)
      module.contents = { materialId: null, quantity: 0 };
    expect(terminalOverview(obligation)).toMatchObject({
      tone: "warn",
      eyebrow: "OBLIGATION OPEN",
      title: "12 fuel owed",
    });
  });

  it("turns semantic machine status into a readable diagnosis", () => {
    const sim = new Simulation(fixture),
      placed = sim.command({
        type: "placeMachine",
        definitionId: "extractor",
        x: 18,
        y: 26,
        direction: 0,
      });
    expect(placed.ok).toBe(true);

    const snapshot = structuredClone(sim.snapshot()),
      machine = snapshot.machines.find((entry) => entry.id === placed.id)!;
    machine.status = "output-full";

    expect(selectionOverview(snapshot, machine.id)).toEqual({
      tone: "warn",
      eyebrow: "MACHINE · OUTPUT FULL",
      title: "Output blocked",
      detail:
        "Downstream capacity is full or disconnected. Clear or reroute the physical output.",
    });
    expect(selectionOverview(snapshot, null)).toMatchObject({
      eyebrow: "WORLD INSPECTOR",
      title: "Select something in the world",
    });
  });
});
