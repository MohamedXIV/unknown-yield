import { fixture, machinePresentationSchema } from "@site/content";
import { Simulation, type PlayerSnapshot } from "@site/sim-core";
import { describe, expect, it } from "vitest";
import { planMachineLoops, MAX_MACHINE_AUDIO_VOICES } from "../game/machine-audio-planning";

function audioWorld() {
  const sim = new Simulation(fixture);
  const result = sim.command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  expect(result.ok).toBe(true);
  const snapshot = structuredClone(sim.snapshot());
  const machine = snapshot.machines.find((entry) => entry.id === result.id)!;
  machine.status = "processing";
  return { snapshot, machine };
}
const viewport = { left: 450, right: 800, top: 480, bottom: 850 };

describe("P0 bounded industrial operating-loop planner", () => {
  it("selects only currently working visible machines with authored loop sound", () => {
    const { snapshot, machine } = audioWorld();
    expect(planMachineLoops(snapshot, viewport, [])).toEqual([
      { id: machine.id, kind: "diesel-drive", volume: expect.any(Number) },
    ]);
    machine.status = "ready";
    expect(planMachineLoops(snapshot, viewport, [])).toEqual([]);
    machine.status = "incident";
    expect(planMachineLoops(snapshot, viewport, [])).toEqual([]);
    machine.status = "processing";
    machine.x = 1;
    expect(planMachineLoops(snapshot, viewport, [])).toEqual([]);
    machine.x = 18;
    const def = snapshot.definitions.find((entry) => entry.id === "extractor")!;
    def.presentation!.audio.runningLoop = undefined;
    expect(planMachineLoops(snapshot, viewport, [])).toEqual([]);
  });

  it("does not play factory interior machinery behind a closed roof", () => {
    const { snapshot, machine } = audioWorld();
    machine.factoryId = "factory-a";
    expect(planMachineLoops(snapshot, viewport, [])).toEqual([]);
    expect(planMachineLoops(snapshot, viewport, ["factory-a"])).toHaveLength(1);
  });

  it("caps and ranks voices independently of machine array order", () => {
    const { snapshot, machine } = audioWorld();
    snapshot.machines = Array.from({ length: 24 }, (_, i) => ({
      ...machine,
      id: "machine-" + String(23 - i).padStart(2, "0"),
      x: 18 + (i % 8),
      y: 26 + Math.floor(i / 8),
    }));
    const voices = planMachineLoops(snapshot, viewport, []);
    expect(voices).toHaveLength(MAX_MACHINE_AUDIO_VOICES);
    expect(new Set(voices.map((voice) => voice.id)).size).toBe(3);
    expect(voices.every((voice) => voice.volume > 0 && voice.volume <= 0.012)).toBe(true);
    const reversed: PlayerSnapshot = { ...snapshot, machines: [...snapshot.machines].reverse() };
    expect(planMachineLoops(reversed, viewport, [])).toEqual(voices);
  });

  it("rejects unknown operating-loop identities at content validation", () => {
    expect(machinePresentationSchema.safeParse({
      version: 1,
      audio: { runningLoop: "https://unknown.example/loop.ogg" },
    }).success).toBe(false);
    expect(machinePresentationSchema.safeParse({
      version: 1,
      audio: { runningLoop: "rotary-drive" },
    }).success).toBe(true);
  });
});
