import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation } from "../src/index";
import { terminalState } from "./terminal-helpers";
it("exposes detached module views without undiscovered material or listings", () => {
  const sim = new Simulation(fixture),
    fresh = sim.snapshot();
  expect(fresh.terminalModules).toHaveLength(2);
  expect(fresh.terminalModules.every((m) => !m.installed && !m.unlocked)).toBe(
    true,
  );
  expect(
    fresh.exchange.some(
      (m) => m.materialId === "liquid-0" || m.materialId === "gas-0",
    ),
  ).toBe(false);
  expect(sim.load(terminalState()).ok).toBe(true);
  expect(
    sim.command({ type: "installTerminalModule", definitionId: "gas-dock" }).ok,
  ).toBe(true);
  const before = sim.serialize(),
    view = sim.snapshot();
  view.terminalModules[1].contents.quantity = 999;
  expect(sim.serialize()).toEqual(before);
});
