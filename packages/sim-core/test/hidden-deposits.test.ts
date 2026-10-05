import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
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

function probeDeepVein(sim: Simulation) {
  unlockProbe(sim);
  expect(
    sim.command({
      type: "sense",
      capabilityId: "core-probe",
      x: 46,
      y: 18,
    }),
  ).toMatchObject({ ok: true });
}

function provisionAdvancedFuel(sim: Simulation) {
  const save = sim.serialize();
  const reaction = fixture.reactions.find(
    (entry) => entry.id === "vaporize-liquid-0",
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
  expect(
    sim.command({
      type: "installTerminalModule",
      definitionId: "gas-dock",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-propellant-cylinder",
    }).ok,
  ).toBe(true);
}

describe("hidden deposits and authored depth constraints", () => {
  it("does not leak hidden source identity through snapshot or raw save before discovery", () => {
    const sim = new Simulation(fixture);
    expect(JSON.stringify(sim.snapshot())).not.toContain("deep-vein-a");
    expect(JSON.stringify(sim.serialize())).not.toContain("deep-vein-a");

    expect(
      sim.command({
        type: "sense",
        capabilityId: "survey-scanner",
        x: 46,
        y: 18,
      }).ok,
    ).toBe(true);
    expect(JSON.stringify(sim.snapshot())).not.toContain("deep-vein-a");
    expect(JSON.stringify(sim.serialize())).not.toContain("deep-vein-a");

    expect(
      sim.command({
        type: "placeMachine",
        definitionId: "extractor",
        x: 44,
        y: 16,
        direction: 0,
      }),
    ).toMatchObject({
      ok: false,
      message: "Place the extractor entirely over a deposit",
    });
  });

  it("persists source identity/location only after qualifying probe evidence", () => {
    const sim = new Simulation(fixture);
    probeDeepVein(sim);

    const discovered = sim
      .snapshot()
      .deposits.find((deposit) => deposit.id === "deep-vein-a");
    expect(discovered).toMatchObject({
      id: "deep-vein-a",
      material: "raw",
      x: 43,
      y: 15,
      width: 5,
      height: 7,
      units: 1200,
      remaining: 1200,
    });
    expect(discovered).not.toHaveProperty("surveySignalId");
    expect(discovered).not.toHaveProperty("requiredSensingCapabilityId");

    const save = sim.serialize();
    expect(save.discoveredDeposits).toEqual(["deep-vein-a"]);
    expect(save.deposits["deep-vein-a"]).toBe(1200);

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    expect(restored.serialize()).toEqual(save);
    expect(
      restored.snapshot().deposits.some((deposit) => deposit.id === "deep-vein-a"),
    ).toBe(true);
  });

  it("rejects extraction that cannot reach the discovered authored depth", () => {
    const sim = new Simulation(fixture);
    probeDeepVein(sim);
    expect(
      sim.command({
        type: "placeMachine",
        definitionId: "extractor",
        x: 44,
        y: 16,
        direction: 0,
      }),
    ).toMatchObject({
      ok: false,
      message: "Extraction capability insufficient for deposit depth",
    });
  });

  it("extracts a discovered deep source only with the authored deep capability", () => {
    const sim = new Simulation(fixture);
    probeDeepVein(sim);
    provisionAdvancedFuel(sim);
    const before = sim.snapshot();

    expect(
      sim.command({
        type: "placeMachine",
        definitionId: "deep-extractor",
        x: 44,
        y: 16,
        direction: 0,
      }),
    ).toMatchObject({ ok: true });

    sim.step(fixture.tickMs);
    expect(
      sim.snapshot().deposits.find((deposit) => deposit.id === "deep-vein-a")
        ?.remaining,
    ).toBe(1199);
    expect(sim.snapshot().fuel).toBe(before.fuel);
    expect(sim.serialize().terminalModules["gas-dock"]).toEqual({
      materialId: "orbital-propellant",
      quantity: 3,
    });
    expect(sim.serialize().flows.consumed["orbital-propellant"]).toBe(1);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

    const machineId = sim
      .snapshot()
      .machines.find((machine) => machine.definitionId === "deep-extractor")!.id;
    expect(
      sim.command({ type: "setEnabled", machineId, enabled: false }).ok,
    ).toBe(true);
    sim.step(30 * fixture.tickMs);

    const machine = sim
      .snapshot()
      .machines.find((entry) => entry.id === machineId)!;
    expect(machine.output.raw).toBe(1);
    expect(machine.status).toBe("disabled");
  });

  it("rejects forged discovery state without the qualifying probe observation", () => {
    const sim = new Simulation(fixture);
    const forged = sim.serialize();
    forged.discoveredDeposits = ["deep-vein-a"];
    forged.deposits["deep-vein-a"] = 1200;
    expect(sim.load(forged).ok).toBe(false);
    expect(JSON.stringify(sim.snapshot())).not.toContain("deep-vein-a");
  });
});
