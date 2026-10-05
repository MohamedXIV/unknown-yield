import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  experimentEvidenceKey,
  initializeKnownMarkets,
} from "../src/index";

function unlockProbe(sim: Simulation) {
  const save = sim.serialize();
  const reaction = fixture.reactions.find(
    (entry) => entry.id === "heat-raw-sealed",
  )!;
  if (!save.knowledge.includes(reaction.id)) save.knowledge.push(reaction.id);
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
  initializeKnownMarkets(fixture, save);
  expect(sim.load(save).ok).toBe(true);
}

describe("industrial sensing observations", () => {
  it("exposes only public capability state and never authored survey truth", () => {
    const snapshot = new Simulation(fixture).snapshot();
    expect(snapshot.sensingCapabilities).toEqual([
      {
        id: "survey-scanner",
        nameKey: "sensing.capability.survey-scanner.name",
        mode: "scan",
        range: 8,
        unlocked: true,
      },
      {
        id: "core-probe",
        nameKey: "sensing.capability.core-probe.name",
        mode: "probe",
        range: 1,
        unlocked: false,
      },
      {
        id: "resonance-probe",
        nameKey: "sensing.capability.resonance-probe.name",
        mode: "probe",
        range: 1,
        unlocked: false,
      },
    ]);
    expect(snapshot.map).not.toHaveProperty("surveySignals");
    expect(snapshot.map).not.toHaveProperty("sensingCapabilities");
    expect(snapshot.map).not.toHaveProperty("atmosphericSources");
    const publicJson = JSON.stringify(snapshot);
    expect(publicJson).not.toContain("anomaly-a");
    expect(publicJson).not.toContain('"strength":8');
    expect(publicJson).not.toContain('"depth":14');
  });

  it("records deterministic partial scanner evidence without source identity or depth", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "survey-scanner",
        x: 46,
        y: 18,
      }),
    ).toMatchObject({ ok: true });

    expect(sim.snapshot().sensingObservations).toEqual([
      {
        capabilityId: "survey-scanner",
        mode: "scan",
        x: 46,
        y: 18,
        observedAtTick: 0,
        signalBand: "strong",
        depthBand: "unknown",
      },
    ]);
    expect(JSON.stringify(sim.snapshot())).not.toContain("anomaly-a");

    const saved = sim.serialize();
    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(restored.snapshot().sensingObservations).toEqual(
      sim.snapshot().sensingObservations,
    );
    expect(restored.serialize()).toEqual(saved);
  });

  it("gates probes behind demonstrated capability and reveals only a depth band", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "core-probe",
        x: 46,
        y: 18,
      }),
    ).toMatchObject({ ok: false, message: "Sensing capability is locked" });

    unlockProbe(sim);
    expect(
      sim.snapshot().sensingCapabilities.find(
        (entry) => entry.id === "core-probe",
      )?.unlocked,
    ).toBe(true);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "core-probe",
        x: 46,
        y: 18,
      }),
    ).toMatchObject({ ok: true });
    expect(
      sim.snapshot().sensingObservations.find(
        (entry) => entry.capabilityId === "core-probe",
      ),
    ).toMatchObject({
      signalBand: "strong",
      depthBand: "deep",
    });
    expect(JSON.stringify(sim.snapshot())).not.toContain("anomaly-a");
  });

  it("keeps atmospheric source truth hidden until an exact qualifying probe", () => {
    const sim = new Simulation(fixture);
    expect(JSON.stringify(sim.snapshot())).not.toContain("atmospheric-plume-a");
    expect(JSON.stringify(sim.serialize())).not.toContain("atmospheric-plume-a");

    expect(
      sim.command({
        type: "sense",
        capabilityId: "survey-scanner",
        x: 70,
        y: 26,
      }).ok,
    ).toBe(true);
    expect(JSON.stringify(sim.snapshot())).not.toContain("atmospheric-plume-a");
    expect(JSON.stringify(sim.serialize())).not.toContain("atmospheric-plume-a");

    unlockProbe(sim);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "core-probe",
        x: 70,
        y: 26,
      }).ok,
    ).toBe(true);
    expect(sim.snapshot().atmosphericSources).toEqual([
      expect.objectContaining({
        id: "atmospheric-plume-a",
        material: null,
        remaining: 600,
      }),
    ]);
    expect(sim.serialize().atmosphericSources).toEqual({
      "atmospheric-plume-a": 600,
    });
    expect(JSON.stringify(sim.snapshot())).not.toContain("anomaly-c");
  });

  it("unlocks the manufactured resonance capability before revealing its resource opportunity", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "resonance-probe",
        x: 57,
        y: 10,
      }),
    ).toMatchObject({ ok: false, message: "Sensing capability is locked" });
    expect(JSON.stringify(sim.snapshot())).not.toContain("catalyst-seam-a");
    expect(JSON.stringify(sim.serialize())).not.toContain("catalyst-seam-a");

    const save = sim.serialize();
    const reaction = fixture.reactions.find(
      (entry) => entry.id === "collect-gas-0",
    )!;
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
    initializeKnownMarkets(fixture, save);
    expect(sim.load(save).ok).toBe(true);

    expect(
      sim.snapshot().sensingCapabilities.find(
        (entry) => entry.id === "resonance-probe",
      )?.unlocked,
    ).toBe(true);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "resonance-probe",
        x: 57,
        y: 10,
      }),
    ).toMatchObject({ ok: true });
    expect(sim.serialize().discoveredDeposits).toContain("catalyst-seam-a");
    expect(sim.serialize().deposits["catalyst-seam-a"]).toBe(800);
    expect(JSON.stringify(sim.snapshot())).not.toContain("anomaly-d");
  });

  it("reports none deterministically outside authored signal range", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({
        type: "sense",
        capabilityId: "survey-scanner",
        x: 2,
        y: 2,
      }).ok,
    ).toBe(true);
    expect(sim.snapshot().sensingObservations[0]).toMatchObject({
      signalBand: "none",
      depthBand: "unknown",
    });
  });
});
