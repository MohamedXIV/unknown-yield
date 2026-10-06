import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
} from "../src/index";

it("keeps the Phase ceramic objective hidden until known, then completes it through a physical shipment", () => {
  const sim = new Simulation(fixture);

  sim.step(fixture.tickMs * fixture.economy.marketEveryTicks);
  expect(
    sim
      .snapshot()
      .opportunities.some(
        (entry) => entry.id === "phase-ceramic-demonstration",
      ),
  ).toBe(false);

  const save = sim.serialize(),
    reaction = fixture.reactions.find(
      (entry) => entry.id === "phase-stabilize-suspension",
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
  save.flows.produced["phase-ceramic"] = 4;
  save.staging["phase-ceramic"] = 4;
  initializeKnownMarkets(fixture, save);

  expect(sim.load(save).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  sim.step(fixture.tickMs * fixture.economy.marketEveryTicks);

  expect(
    sim
      .snapshot()
      .opportunities.find(
        (entry) => entry.id === "phase-ceramic-demonstration",
      ),
  ).toMatchObject({
    kind: "order",
    materialId: "phase-ceramic",
    quantity: 4,
    progress: 0,
    rewardFuel: 36,
  });

  const fuelBefore = sim.serialize().fuel;
  expect(
    sim.command({
      type: "setShipmentQuantity",
      materialId: "phase-ceramic",
      quantity: 4,
    }).ok,
  ).toBe(true);
  expect(sim.serialize().staging["phase-ceramic"]).toBe(4);

  expect(sim.command({ type: "dispatchShipment" }).ok).toBe(true);

  const completed = sim.serialize();
  expect(completed.staging["phase-ceramic"] ?? 0).toBe(0);
  expect(completed.flows.exported["phase-ceramic"]).toBe(4);
  expect(completed.opportunities["phase-ceramic-demonstration"]).toMatchObject({
    status: "completed",
    progress: 4,
  });
  expect(completed.fuel).toBeGreaterThan(fuelBefore + 36);
  expect(auditLedger(fixture, completed).ok).toBe(true);

  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(completed)).ok).toBe(true);
  expect(restored.serialize()).toEqual(completed);
});
