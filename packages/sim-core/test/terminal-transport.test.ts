import { it, expect } from "vitest";
import { fixture, validateContent } from "@site/content";
import { terminalState } from "./terminal-helpers";
import { transportLiquids, liquidDiagnostics } from "../src/liquids";
import { transportGases } from "../src/gases";
import { auditLedger } from "../src/ledger";
import {
  terminalInletDiagnostic,
  settleTerminalExports,
} from "../src/terminal";
it("retains upstream sealed cargo until its installed inlet admits it", () => {
  const s = terminalState();
  s.pipes["39,30"] = {
    id: "p1",
    x: 39,
    y: 30,
    inlet: 1,
    outlet: 3,
    materialId: "liquid-0",
    quantity: 4,
    containmentProfileId: "lined",
  };
  s.pressureLines["42,27"] = {
    id: "g1",
    x: 42,
    y: 27,
    inlet: 0,
    outlet: 2,
    materialId: "gas-0",
    quantity: 4,
  };
  s.stock.plates -= 7;
  s.flows.produced["liquid-0"] = 4;
  s.flows.produced["gas-0"] = 4;
  const before = structuredClone(s);
  transportLiquids(fixture, s);
  transportGases(fixture, s);
  expect(s).toEqual(before);
  expect(liquidDiagnostics(fixture, s).p1.reason).toBe(
    "terminal-module-missing",
  );
  s.terminalModules = {
    "liquid-dock": { materialId: null, quantity: 0 },
    "gas-dock": { materialId: null, quantity: 0 },
  };
  s.stock.plates -= 66;
  for (let i = 0; i < 4; i++) {
    transportLiquids(fixture, s);
    transportGases(fixture, s);
    expect(auditLedger(fixture, s).ok).toBe(true);
  }
  expect(s.terminalModules["liquid-dock"]).toEqual({
    materialId: "liquid-0",
    quantity: 4,
  });
  expect(s.terminalModules["gas-dock"]).toEqual({
    materialId: "gas-0",
    quantity: 4,
  });
  expect(s.staging).toEqual({});
  expect(s.fuel).toBe(before.fuel);
});
it("keeps full and wrong-direction arrivals at the source", () => {
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 24 },
  };
  s.pipes["39,30"] = {
    id: "p1",
    x: 39,
    y: 30,
    inlet: 1,
    outlet: 3,
    materialId: "liquid-0",
    quantity: 2,
    containmentProfileId: "lined",
  };
  const before = structuredClone(s);
  transportLiquids(fixture, s);
  expect(s).toEqual(before);
  expect(liquidDiagnostics(fixture, s).p1.reason).toBe("capacity");
  s.terminalModules["liquid-dock"].quantity = 0;
  s.terminalModules["liquid-dock"].materialId = null;
  s.pipes["39,30"].outlet = 0;
  const wrong = structuredClone(s);
  transportLiquids(fixture, s);
  expect(s).toEqual(wrong);
});

it("bounds the final arrival and resumes after physical export frees capacity", () => {
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 23 },
  };
  s.pipes["39,30"] = {
    id: "p1",
    x: 39,
    y: 30,
    inlet: 1,
    outlet: 3,
    materialId: "liquid-0",
    quantity: 4,
    containmentProfileId: "lined",
  };
  s.stock.plates -= 34;
  s.flows.produced["liquid-0"] = 27;
  transportLiquids(fixture, s);
  expect(s.terminalModules["liquid-dock"].quantity).toBe(24);
  expect(s.pipes["39,30"].quantity).toBe(3);
  expect(auditLedger(fixture, s).ok).toBe(true);
  s.policies["liquid-0"] = "export";
  settleTerminalExports(fixture, s);
  expect(s.flows.exported["liquid-0"]).toBe(
    fixture.site.terminalShipmentCapacity,
  );
  const pipeBeforeResume = s.pipes["39,30"].quantity;
  transportLiquids(fixture, s);
  expect(s.terminalModules["liquid-dock"].quantity).toBeGreaterThan(
    24 - fixture.site.terminalShipmentCapacity,
  );
  expect(s.pipes["39,30"].quantity).toBeLessThan(pipeBeforeResume);
  expect(auditLedger(fixture, s).ok).toBe(true);
});

it("refuses mismatched identity, handling state and missing receiver protection", () => {
  const s = terminalState();
  s.terminalModules = {
    "liquid-dock": { materialId: "other-liquid", quantity: 1 },
  };
  expect(
    terminalInletDiagnostic(
      fixture,
      s,
      { x: 39, y: 29 },
      3,
      "liquid",
      "liquid-0",
    )?.reason,
  ).toBe("identity-mismatch");
  expect(
    terminalInletDiagnostic(fixture, s, { x: 39, y: 29 }, 3, "gas", "gas-0")
      ?.reason,
  ).toBe("handling-state");
  const unprotected = structuredClone(fixture);
  unprotected.site.terminalModules[0].containmentCapabilities = [];
  unprotected.economy.exchange = unprotected.economy.exchange.filter(
    (e) => e.materialId !== "liquid-0",
  );
  validateContent(unprotected);
  s.terminalModules["liquid-dock"] = { materialId: null, quantity: 0 };
  const before = structuredClone(s);
  expect(
    terminalInletDiagnostic(
      unprotected,
      s,
      { x: 39, y: 29 },
      3,
      "liquid",
      "liquid-0",
    )?.reason,
  ).toBe("missing-containment");
  expect(s).toEqual(before);
});
