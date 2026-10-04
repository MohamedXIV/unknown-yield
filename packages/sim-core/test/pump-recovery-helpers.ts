import { expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation, type GameCommand } from "../src/index";
import { terminalState } from "./terminal-helpers";
export function recoveryRig(incident = true) {
  const sim = new Simulation(fixture);
  expect(sim.load(terminalState()).ok).toBe(true);
  const build = (cmd: GameCommand) => {
    const r = sim.command(cmd);
    expect(r.ok, r.message).toBe(true);
    return r.id!;
  };
  build({ type: "placeFactory", x: 23, y: 33, width: 10, height: 6 });
  const sourceMachineId = build({
    type: "placeMachine",
    definitionId: "liquefier",
    x: 25,
    y: 35,
    direction: 0,
  });
  const pumpId = build({ type: "placePump", x: 27, y: 36, direction: 0 });
  build({
    type: "placePipes",
    points: [{ x: 28, y: 36, inlet: 2, outlet: 0 }],
    containmentProfileId: "lined",
  });
  const s = sim.serialize();
  s.machines[sourceMachineId].output["liquid-0"] = incident ? 3 : 4;
  s.flows.produced["liquid-0"] = 4;
  if (incident) {
    s.pumps[pumpId].enabled = false;
    s.pumps[pumpId].incident = {
      definitionId: "pump-corrosion",
      materialId: "liquid-0",
      quantity: 1,
      startedAt: 0,
      drainEnabled: false,
    };
  }
  const loaded = sim.load(s);
  expect(loaded.ok, loaded.message).toBe(true);
  return { sim, pumpId, sourceMachineId, firstPipeId: s.pipes["28,36"].id };
}
