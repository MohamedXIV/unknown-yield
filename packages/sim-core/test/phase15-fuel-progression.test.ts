import { describe, expect, it } from "vitest";
import { fixture, validateContent, type Content } from "@site/content";
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

function contentWithExtractorFuel(fuelClassId: string): Content {
  const content = structuredClone(fixture);
  const extractor = content.machines.find((entry) => entry.id === "extractor")!;
  extractor.fuelClassId = fuelClassId;
  extractor.fuel = 1;
  return validateContent(content);
}

function withConfirmedKnowledge(
  content: Content,
  reactionIds: string[],
): Simulation {
  const sim = new Simulation(content);
  const save = sim.serialize();
  for (const reactionId of reactionIds) {
    const reaction = content.reactions.find((entry) => entry.id === reactionId)!;
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
  initializeKnownMarkets(content, save);
  expect(sim.load(save).ok).toBe(true);
  return sim;
}

function placeSurfaceExtractor(sim: Simulation) {
  return build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
}

describe("Phase 15 advanced and research-grade fuel progression", () => {
  it("keeps ordinary equipment on the existing company fuel allocation", () => {
    const sim = new Simulation(fixture);
    const id = placeSurfaceExtractor(sim);
    const before = sim.serialize().fuel;
    sim.step(fixture.tickMs);
    const after = sim.serialize();

    expect(after.machines[id].job).not.toBeNull();
    expect(after.fuel).toBe(before - 1);
    expect(after.flows.consumed["orbital-propellant"]).toBeUndefined();
    expect(after.flows.consumed["orbital-coolant"]).toBeUndefined();
    expect(auditLedger(fixture, after).ok).toBe(true);
  });

  it("gates advanced operation by certification and consumes physical propellant from the gas dock", () => {
    const content = contentWithExtractorFuel("advanced-propellant");

    const locked = new Simulation(content);
    const lockedId = placeSurfaceExtractor(locked);
    expect(
      locked.snapshot().machines.find((entry) => entry.id === lockedId)?.status,
    ).toBe("fuel-class-locked");

    const sim = withConfirmedKnowledge(content, ["vaporize-liquid-0"]);
    expect(
      sim.snapshot().milestones.find(
        (entry) => entry.id === "gas-study-certified",
      )?.completed,
    ).toBe(true);
    expect(
      sim.command({
        type: "installTerminalModule",
        definitionId: "gas-dock",
      }).ok,
    ).toBe(true);

    const machineId = placeSurfaceExtractor(sim);
    expect(
      sim.snapshot().machines.find((entry) => entry.id === machineId)?.status,
    ).toBe("needs-special-fuel");

    expect(
      sim.command({
        type: "requestImport",
        supplyId: "orbital-propellant-cylinder",
      }).ok,
    ).toBe(true);

    const afterImport = sim.serialize();
    const genericFuel = afterImport.fuel;
    expect(afterImport.terminalModules["gas-dock"]).toEqual({
      materialId: "orbital-propellant",
      quantity: 4,
    });
    expect(
      sim.snapshot().machines.find((entry) => entry.id === machineId)?.status,
    ).toBe("ready");

    sim.step(content.tickMs);
    const running = sim.serialize();
    expect(running.machines[machineId].job).not.toBeNull();
    expect(running.fuel).toBe(genericFuel);
    expect(running.terminalModules["gas-dock"]).toEqual({
      materialId: "orbital-propellant",
      quantity: 3,
    });
    expect(running.flows.consumed["orbital-propellant"]).toBe(1);
    expect(auditLedger(content, running).ok).toBe(true);

    const restored = new Simulation(content);
    expect(restored.load(structuredClone(running)).ok).toBe(true);
    expect(restored.serialize()).toEqual(running);
    expect(
      restored
        .snapshot()
        .fuelClasses.find((entry) => entry.id === "advanced-propellant"),
    ).toMatchObject({
      unlocked: true,
      terminalModuleInstalled: true,
      held: 3,
    });
  });

  it("makes research-grade operation depend on protected coolant rather than a larger company-fuel number", () => {
    const content = contentWithExtractorFuel("research-coolant");
    const sim = withConfirmedKnowledge(content, [
      "heat-raw-sealed",
      "collect-gas-0",
    ]);

    expect(
      sim.snapshot().milestones.find(
        (entry) => entry.id === "resonance-survey-certified",
      )?.completed,
    ).toBe(true);
    expect(
      sim.snapshot().milestones.find(
        (entry) => entry.id === "specialized-handling-certified",
      )?.completed,
    ).toBe(true);
    expect(
      sim.command({
        type: "installTerminalModule",
        definitionId: "cryo-dock",
      }).ok,
    ).toBe(true);

    const machineId = placeSurfaceExtractor(sim);
    expect(
      sim.snapshot().machines.find((entry) => entry.id === machineId)?.status,
    ).toBe("needs-special-fuel");

    expect(
      sim.command({
        type: "requestImport",
        supplyId: "orbital-coolant-canister",
      }).ok,
    ).toBe(true);

    const afterImport = sim.serialize();
    const genericFuel = afterImport.fuel;
    expect(afterImport.terminalModules["cryo-dock"]).toEqual({
      materialId: "orbital-coolant",
      quantity: 4,
    });

    sim.step(content.tickMs);
    const running = sim.serialize();
    expect(running.machines[machineId].job).not.toBeNull();
    expect(running.fuel).toBe(genericFuel);
    expect(running.terminalModules["cryo-dock"]).toEqual({
      materialId: "orbital-coolant",
      quantity: 3,
    });
    expect(running.flows.consumed["orbital-coolant"]).toBe(1);
    expect(auditLedger(content, running).ok).toBe(true);
  });
});
