import { fixture } from "@site/content";
import { Simulation, type GameCommand } from "@site/sim-core";
import { describe, expect, it } from "vitest";
import { deriveFeedbackEvents } from "../game/feedback";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function machineWorld() {
  const sim = new Simulation(fixture);
  const id = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  return { sim, id };
}

describe("authoritative production feedback", () => {
  it("is silent for an unchanged public snapshot", () => {
    const snapshot = new Simulation(fixture).snapshot();
    expect(deriveFeedbackEvents(snapshot, structuredClone(snapshot))).toEqual(
      [],
    );
  });

  it("derives machine start and warning cues only from public status transitions", () => {
    const { sim, id } = machineWorld();
    const before = sim.snapshot();
    const processing = structuredClone(before);
    const machine = processing.machines.find((entry) => entry.id === id)!;
    machine.status = "processing";

    expect(deriveFeedbackEvents(before, processing)).toContainEqual({
      kind: "machine-start",
      id,
      at: {
        x: machine.x + machine.width / 2,
        y: machine.y + machine.height / 2,
      },
    });

    const warning = structuredClone(processing);
    warning.machines.find((entry) => entry.id === id)!.status = "output-full";
    expect(deriveFeedbackEvents(processing, warning)).toContainEqual({
      kind: "warning",
      id: id + ":output-full",
      at: {
        x: machine.x + machine.width / 2,
        y: machine.y + machine.height / 2,
      },
    });
  });

  it("derives a hazard cue only when a machine enters an incident", () => {
    const { sim, id } = machineWorld();
    const before = sim.snapshot();
    const after = structuredClone(before);
    const machine = after.machines.find((entry) => entry.id === id)!;
    machine.incident = {
      classId: "thermal",
      classNameKey: "hazard-class.thermal.name",
      nameKey: "hazard.test.name",
      textKey: "hazard.test.observation",
      evidenceKey: "thermal",
      saferHintKey: "hazard.test.safer-hint",
    };

    expect(deriveFeedbackEvents(before, after)).toContainEqual({
      kind: "hazard",
      id: "machine:" + id,
      at: {
        x: machine.x + machine.width / 2,
        y: machine.y + machine.height / 2,
      },
    });
    expect(deriveFeedbackEvents(after, structuredClone(after))).toEqual([]);
  });

  it("derives discovery only from a newly observed physical event, not restored knowledge", () => {
    const before = new Simulation(fixture).snapshot();
    const restored = structuredClone(before);
    restored.observations.push({
      operationId: "heat",
      inputId: "raw",
      outputId: "granules",
      textKey: "reaction.heat-raw.observation",
      initial: false,
    });
    expect(deriveFeedbackEvents(before, restored)).toEqual([]);

    const discovered = structuredClone(before);
    discovered.observations.push({
      operationId: "heat",
      inputId: "raw",
      outputId: "granules",
      textKey: "reaction.heat-raw.observation",
      initial: false,
      observedAt: { x: 12, y: 9 },
    });
    expect(deriveFeedbackEvents(before, discovered)).toEqual([
      {
        kind: "discovery",
        id: "reaction.heat-raw.observation",
        at: { x: 12, y: 9 },
      },
    ]);
  });

  it("emits one logistics cue when a previously idle physical network begins carrying cargo", () => {
    const before = new Simulation(fixture).snapshot();
    const after = structuredClone(before);
    after.belts.push({
      id: "feedback-belt",
      x: 4,
      y: 5,
      direction: 0,
      cargo: "plates",
      alternate: null,
      switched: false,
    });

    expect(deriveFeedbackEvents(before, after)).toEqual([
      {
        kind: "logistics-flow",
        id: "network-active@" + after.tick,
        at: { x: 4.5, y: 5.5 },
      },
    ]);
  });
});
