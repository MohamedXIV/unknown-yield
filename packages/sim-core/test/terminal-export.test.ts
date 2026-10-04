import { it, expect } from "vitest";
import { fixture, validateSimulationContent } from "@site/content";
import { terminalState } from "./terminal-helpers";
import { settleTerminalExports } from "../src/terminal";
import { auditLedger } from "../src/ledger";
it("exports staged sealed cargo once through debt and market settlement", () => {
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 2 },
  };
  s.stock.plates -= 30;
  s.flows.produced["liquid-0"] = 2;
  settleTerminalExports(fixture, s);
  expect(s.terminalModules["liquid-dock"].quantity).toBe(2);
  s.policies["liquid-0"] = "export";
  s.debt = 20;
  const fuel = s.fuel;
  settleTerminalExports(fixture, s);
  expect(s.debt).toBe(8);
  expect(s.fuel).toBe(fuel);
  expect(s.exported).toBe(2);
  expect(s.flows.exported["liquid-0"]).toBe(2);
  expect(s.market["liquid-0"].saturationBps).toBe(2000);
  expect(s.terminalModules["liquid-dock"]).toEqual({
    materialId: null,
    quantity: 0,
  });
  expect(auditLedger(fixture, s).ok).toBe(true);
  const after = structuredClone(s);
  settleTerminalExports(fixture, s);
  expect(s).toEqual(after);
});

it("progresses matching orders from physical shipments with no unit allocated twice", () => {
  const c = structuredClone(fixture);
  c.economy.orders = ["liquid-order-a", "liquid-order-b"].map((id) => ({
    ...c.economy.orders[0],
    id,
    nameKey: `order.${id}.name`,
    briefKey: `order.${id}.brief`,
    materialId: "liquid-0",
    quantity: 2,
    rewardFuel: 1,
  }));
  validateSimulationContent(c);
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 3 },
  };
  s.stock.plates -= 30;
  s.flows.produced["liquid-0"] = 3;
  for (const order of c.economy.orders)
    s.opportunities[order.id] = {
      status: "offered",
      offeredAt: 0,
      expiresAt: order.durationTicks,
      progress: 0,
      completedAt: null,
    };
  settleTerminalExports(c, s);
  expect(Object.values(s.opportunities).map((o) => o.progress)).toEqual([0, 0]);
  s.policies["liquid-0"] = "export";
  settleTerminalExports(c, s);
  expect(Object.values(s.opportunities).map((o) => o.progress)).toEqual([2, 1]);
  expect(s.staging).toEqual({});
  expect(s.flows.exported["liquid-0"]).toBe(3);
  expect(auditLedger(c, s).ok).toBe(true);
  const after = structuredClone(s);
  settleTerminalExports(c, s);
  expect(s).toEqual(after);
});

it("cannot ship unknown cargo or bypass a locked physical capability", () => {
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 2 },
  };
  s.policies["liquid-0"] = "export";
  s.knowledge = [];
  const before = structuredClone(s);
  settleTerminalExports(fixture, s);
  expect(s).toEqual(before);
  const locked = terminalState();
  locked.terminalModules = structuredClone(before.terminalModules);
  locked.policies["liquid-0"] = "export";
  locked.milestones = {};
  const lockedBefore = structuredClone(locked);
  settleTerminalExports(fixture, locked);
  expect(locked).toEqual(lockedBefore);
});
