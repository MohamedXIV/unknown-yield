import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { auditLedger, type GameCommand } from "../src/index";
import { recoveryRig } from "./pump-recovery-helpers";
it("refuses loaded incident commands and previews atomically", () => {
  const { sim, pumpId } = recoveryRig();
  const before = sim.serialize();
  const cmds: GameCommand[] = [
    { type: "repairPump", id: pumpId },
    { type: "setPumpEnabled", id: pumpId, enabled: true },
    {
      type: "setLiquidContainmentProfile",
      id: pumpId,
      containmentProfileId: "lined",
    },
    { type: "dismantle", id: pumpId },
  ];
  for (const cmd of cmds) {
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  }
  expect(auditLedger(fixture, before).ok).toBe(true);
  const drain = { type: "setPumpRecoveryDrain", id: pumpId, enabled: true };
  expect(sim.preview(drain).ok).toBe(true);
  expect(sim.serialize()).toEqual(before);
  expect(sim.command(drain).ok).toBe(true);
  const after = sim.serialize();
  expect(sim.command(drain).ok).toBe(true);
  expect(sim.serialize()).toEqual(after);
});
it("repairs only empty protected disabled incident without rewards or IDs", () => {
  const { sim, pumpId } = recoveryRig();
  const s = sim.serialize();
  s.machines[Object.keys(s.machines)[0]].output["liquid-0"]++;
  s.pumps[pumpId].incident!.quantity = 0;
  expect(sim.load(s).ok).toBe(true);
  expect(sim.command({ type: "repairPump", id: pumpId }).ok).toBe(false);
  const before = sim.serialize();
  expect(
    sim.command({
      type: "setLiquidContainmentProfile",
      id: pumpId,
      containmentProfileId: "lined",
    }).ok,
  ).toBe(true);
  expect(sim.serialize().stock.plates).toBe(before.stock.plates - 4);
  expect(sim.serialize().pumps[pumpId].incident).not.toBeNull();
  expect(sim.command({ type: "repairPump", id: pumpId }).ok).toBe(true);
  expect(sim.serialize().pumps[pumpId].incident).toBeNull();
  expect(sim.serialize().pumps[pumpId].enabled).toBe(false);
  expect(sim.serialize().fuel).toBe(before.fuel);
  expect(sim.serialize().flows).toEqual(before.flows);
  expect(sim.serialize().nextId).toBe(before.nextId);
  expect(sim.command({ type: "dismantle", id: pumpId }).ok).toBe(true);
  expect(sim.serialize().stock.plates).toBe(before.stock.plates + 12);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});
