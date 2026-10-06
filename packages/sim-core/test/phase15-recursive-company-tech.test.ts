import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function confirm(save: ReturnType<Simulation["serialize"]>, reactionId: string) {
  const reaction = fixture.reactions.find((entry) => entry.id === reactionId)!;
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
}

it("turns player matrix discovery into company R&D and a deeper local phase seam", () => {
  let sim = new Simulation(fixture);
  const seeded = sim.serialize();
  seeded.fuel = 500;
  for (const id of [
    "sinter-catalyst",
    "collect-gas-0",
    "heat-raw-sealed",
    "vaporize-liquid-0",
  ])
    confirm(seeded, id);
  initializeKnownMarkets(fixture, seeded);
  expect(sim.load(seeded).ok).toBe(true);

  sim.step(fixture.tickMs * fixture.economy.marketEveryTicks);

  expect(
    sim.snapshot().opportunities.find(
      (entry) => entry.id === "matrix-orbital-application",
    ),
  ).toMatchObject({
    kind: "property-directive",
    targetMaterialId: "matrix",
  });
  expect(
    sim.snapshot().importSupplies.some(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    ),
  ).toBe(false);
  expect(
    sim.snapshot().sensingCapabilities.some(
      (entry) => entry.id === "phase-probe",
    ),
  ).toBe(false);
  expect(
    sim.command({
      type: "sense",
      capabilityId: "phase-probe",
      x: 73,
      y: 50,
    }),
  ).toMatchObject({ ok: false, message: "Unknown sensing capability" });
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-resonance-seed-crate",
    }),
  ).toMatchObject({ ok: false, message: "Unknown import supply" });

  build(sim, { type: "installTerminalModule", definitionId: "cryo-dock" });
  build(sim, { type: "installTerminalModule", definitionId: "gas-dock" });
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-coolant-canister",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-propellant-cylinder",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-binder-crate",
    }).ok,
  ).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 10,
    y: 10,
    width: 6,
    height: 6,
  });
  expect(factoryId).toBeTruthy();
  const sintererId = build(sim, {
    type: "placeMachine",
    definitionId: "sinterer",
    x: 12,
    y: 12,
    direction: 0,
  });

  const binderFeed = sim.serialize();
  binderFeed.terminalImports.staging["orbital-binder"] -= 2;
  binderFeed.machines[sintererId].input["orbital-binder"] = 2;
  expect(sim.load(binderFeed).ok).toBe(true);

  sim.step(fixture.tickMs);
  expect(sim.serialize().machines[sintererId].job?.reaction).toBe(
    "sinter-orbital-binder",
  );
  sim.step(
    fixture.tickMs *
      fixture.machines.find((entry) => entry.id === "sinterer")!.durationTicks,
  );

  expect(sim.serialize().knowledge).toContain("sinter-orbital-binder");
  expect(
    sim.serialize().opportunities["matrix-orbital-application"],
  ).toMatchObject({
    status: "completed",
    progress: 1,
  });
  expect(
    sim.serialize().company.importAllocations[
      "orbital-resonance-seed-crate"
    ],
  ).toBe(1);
  expect(
    sim.snapshot().importSupplies.find(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    ),
  ).toMatchObject({
    allocations: 1,
    eligible: true,
  });
  expect(
    sim.snapshot().materials.some(
      (entry) => entry.id === "orbital-resonance-seed",
    ),
  ).toBe(true);

  const fuelBeforeSeed = sim.serialize().fuel;
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-resonance-seed-crate",
    }).ok,
  ).toBe(true);
  expect(sim.serialize().fuel).toBe(fuelBeforeSeed);

  const seedFeed = sim.serialize();
  seedFeed.terminalImports.staging["orbital-resonance-seed"] -= 1;
  seedFeed.machines[sintererId].input["orbital-resonance-seed"] = 1;
  expect(sim.load(seedFeed).ok).toBe(true);

  sim.step(fixture.tickMs);
  expect(sim.serialize().machines[sintererId].job?.reaction).toBe(
    "sinter-resonance-seed",
  );
  sim.step(
    fixture.tickMs *
      fixture.machines.find((entry) => entry.id === "sinterer")!.durationTicks,
  );

  expect(sim.serialize().knowledge).toContain("sinter-resonance-seed");
  expect(
    sim.snapshot().milestones.find(
      (entry) => entry.id === "phase-lattice-certified",
    )?.completed,
  ).toBe(true);
  expect(
    sim.snapshot().sensingCapabilities.find(
      (entry) => entry.id === "phase-probe",
    )?.unlocked,
  ).toBe(true);
  expect(JSON.stringify(sim.snapshot())).not.toContain("phase-lattice-seam-a");

  expect(
    sim.command({
      type: "sense",
      capabilityId: "phase-probe",
      x: 73,
      y: 50,
    }).ok,
  ).toBe(true);
  expect(sim.serialize().discoveredDeposits).toContain("phase-lattice-seam-a");
  expect(
    sim.snapshot().deposits.find(
      (entry) => entry.id === "phase-lattice-seam-a",
    ),
  ).toMatchObject({
    material: "phase-lattice",
    remaining: 480,
  });

  const extractorId = build(sim, {
    type: "placeMachine",
    definitionId: "deep-extractor",
    x: 71,
    y: 49,
    direction: 0,
  });
  sim.step(fixture.tickMs);
  expect(sim.serialize().machines[extractorId].job).not.toBeNull();
  sim.step(
    fixture.tickMs *
      fixture.machines.find((entry) => entry.id === "deep-extractor")!
        .durationTicks,
  );

  expect(sim.serialize().deposits["phase-lattice-seam-a"]).toBe(479);
  expect(sim.serialize().machines[extractorId].output["phase-lattice"]).toBe(1);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  const checkpoint = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(checkpoint)).ok).toBe(true);
  sim.step(fixture.tickMs * 5);
  restored.step(fixture.tickMs * 5);
  expect(restored.serialize()).toEqual(sim.serialize());
});
