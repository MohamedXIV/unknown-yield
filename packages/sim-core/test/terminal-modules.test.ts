import { describe, it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { terminalState } from "./terminal-helpers";
describe("terminal module construction", () => {
  it("installs and reclaims exact plates without IDs or preview mutation", () => {
    const sim = new Simulation(fixture);
    expect(sim.load(terminalState()).ok).toBe(true);
    const before = sim.serialize(),
      command = { type: "installTerminalModule", definitionId: "liquid-dock" };
    expect(sim.preview(command).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(command).ok).toBe(true);
    expect(sim.serialize().stock.plates).toBe(before.stock.plates - 30);
    expect(sim.serialize().nextId).toBe(before.nextId);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    const installed = sim.serialize();
    expect(sim.command(command).ok).toBe(false);
    expect(sim.serialize()).toEqual(installed);
    expect(
      sim.command({ type: "removeTerminalModule", definitionId: "liquid-dock" })
        .ok,
    ).toBe(true);
    expect(sim.serialize()).toEqual(before);
  });
  it("refuses locked, unknown and underfunded installation atomically", () => {
    const sim = new Simulation(fixture),
      before = sim.serialize();
    for (const definitionId of ["liquid-dock", "missing"])
      expect(
        sim.command({ type: "installTerminalModule", definitionId }).ok,
      ).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const s = terminalState();
    s.stock.plates = 1;
    // Construction embodiment remains valid by moving the reserve into a defined historical sink.
    s.flows.discarded.plates = fixture.site.startStock - 1;
    expect(sim.load(s).ok).toBe(true);
    expect(
      sim.command({ type: "installTerminalModule", definitionId: "gas-dock" })
        .ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(s);
  });
});
