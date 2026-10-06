import { fixture } from "@site/content";
import { Simulation, type GameCommand } from "@site/sim-core";
import { describe, expect, it } from "vitest";
import {
  onboardingBeat,
  type OnboardingSignals,
} from "../game/onboarding";

const signals = (
  patch: Partial<OnboardingSignals> = {},
): OnboardingSignals => ({
  knowledgeOpened: false,
  terminalOpened: false,
  factoryToggleCount: 0,
  ...patch,
});

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function establishedWorld() {
  const sim = new Simulation(fixture);
  const extractorId = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 8,
    height: 8,
  });
  return { sim, extractorId };
}

describe("contextual production onboarding", () => {
  it("advances one contextual brief at a time without a checklist", () => {
    const fresh = new Simulation(fixture);
    expect(onboardingBeat(fresh.snapshot(), signals())).toMatchObject({
      id: "camera-build",
      step: 1,
      total: 6,
    });

    build(fresh, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 26,
      direction: 0,
    });
    expect(onboardingBeat(fresh.snapshot(), signals())).toMatchObject({
      id: "physical-inventory",
      step: 2,
    });

    build(fresh, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 8,
      height: 8,
    });
    expect(onboardingBeat(fresh.snapshot(), signals())).toMatchObject({
      id: "experiment",
      step: 3,
    });

    const learned = structuredClone(fresh.snapshot());
    learned.observations.push({
      operationId: "heat",
      inputId: "raw",
      outputId: "granules",
      textKey: "reaction.test.observation",
      initial: false,
      observedAt: { x: 27, y: 27 },
    });
    expect(onboardingBeat(learned, signals())).toMatchObject({
      id: "evidence",
      step: 4,
    });

    expect(
      onboardingBeat(learned, signals({ knowledgeOpened: true })),
    ).toMatchObject({
      id: "factory-cycle",
      step: 5,
    });
    expect(
      onboardingBeat(
        learned,
        signals({ knowledgeOpened: true, factoryToggleCount: 1 }),
      ),
    ).toMatchObject({
      id: "factory-cycle",
      step: 5,
      title: "Reopen it without rebuilding it.",
    });

    expect(
      onboardingBeat(
        learned,
        signals({ knowledgeOpened: true, factoryToggleCount: 2 }),
      ),
    ).toMatchObject({
      id: "terminal-export",
      step: 6,
    });
    expect(
      onboardingBeat(
        learned,
        signals({
          knowledgeOpened: true,
          terminalOpened: true,
          factoryToggleCount: 2,
        }),
      ).body,
    ).toContain("shipment manifest");

    const exported = structuredClone(learned);
    exported.exported = 1;
    expect(
      onboardingBeat(
        exported,
        signals({
          knowledgeOpened: true,
          terminalOpened: true,
          factoryToggleCount: 2,
        }),
      ),
    ).toMatchObject({
      id: "complete",
      step: null,
    });
  });

  it("interrupts normal onboarding with physical recovery guidance", () => {
    const { sim, extractorId } = establishedWorld();
    const incident = structuredClone(sim.snapshot());
    const machine = incident.machines.find(
      (entry) => entry.id === extractorId,
    )!;
    machine.incident = {
      classId: "thermal",
      classNameKey: "hazard-class.thermal.name",
      nameKey: "hazard.test.name",
      textKey: "hazard.test.observation",
      evidenceKey: "thermal",
      saferHintKey: "hazard.test.safer-hint",
    };

    expect(
      onboardingBeat(
        incident,
        signals({
          knowledgeOpened: true,
          terminalOpened: true,
          factoryToggleCount: 2,
        }),
      ),
    ).toMatchObject({
      id: "recovery",
      eyebrow: "RECOVERY",
      step: null,
    });
  });

  it("teaches principles without embedding hidden recipe IDs", () => {
    const { sim } = establishedWorld();
    const snapshots = [
      onboardingBeat(new Simulation(fixture).snapshot(), signals()),
      onboardingBeat(sim.snapshot(), signals()),
      onboardingBeat(
        sim.snapshot(),
        signals({ knowledgeOpened: true, factoryToggleCount: 2 }),
      ),
    ];
    const copy = JSON.stringify(snapshots);
    for (const hiddenId of [
      "heat-ferrite",
      "sinter-catalyst",
      "sinter-resonance-seed",
      "liquefy-raw",
    ])
      expect(copy).not.toContain(hiddenId);
  });
});
