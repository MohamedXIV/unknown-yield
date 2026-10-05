import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { applyCommand } from "../src/commands";
import { auditLedger } from "../src/ledger";
import { Simulation } from "../src/simulation";
import { settleTerminalExports } from "../src/terminal";
import { terminalState } from "./terminal-helpers";

function loadedTerminalState() {
  const state = terminalState();
  state.terminalModules = {
    "liquid-dock": { materialId: "liquid-0", quantity: 8 },
    "gas-dock": { materialId: "gas-0", quantity: 8 },
  };
  state.stock.plates -= 66;
  state.flows.produced["liquid-0"] = 8;
  state.flows.produced["gas-0"] = 8;
  return state;
}

it("dispatches only the physically selected cargo within one shipment capacity", () => {
  const state = loadedTerminalState();
  state.policies["liquid-0"] = "export";
  state.policies["gas-0"] = "export";

  expect(
    applyCommand(
      fixture,
      state,
      { type: "setShipmentQuantity", materialId: "liquid-0", quantity: 8 },
      true,
    ).ok,
  ).toBe(true);
  expect(
    applyCommand(
      fixture,
      state,
      { type: "setShipmentQuantity", materialId: "gas-0", quantity: 5 },
      true,
    ).ok,
  ).toBe(false);
  expect(
    applyCommand(
      fixture,
      state,
      { type: "setShipmentQuantity", materialId: "gas-0", quantity: 4 },
      true,
    ).ok,
  ).toBe(true);

  const selected = structuredClone(state);
  settleTerminalExports(fixture, state);
  expect(state).toEqual(selected);

  const result = applyCommand(
    fixture,
    state,
    { type: "dispatchShipment" },
    true,
  );
  expect(result.ok).toBe(true);
  expect(state.shipmentManifest).toEqual({});
  expect(state.exported).toBe(12);
  expect(state.flows.exported["liquid-0"]).toBe(8);
  expect(state.flows.exported["gas-0"]).toBe(4);
  expect(state.terminalModules["liquid-dock"]).toEqual({
    materialId: null,
    quantity: 0,
  });
  expect(state.terminalModules["gas-dock"]).toEqual({
    materialId: "gas-0",
    quantity: 4,
  });
  expect(auditLedger(fixture, state).ok).toBe(true);
});

it("persists manifest intent without duplicating physical cargo", () => {
  const state = loadedTerminalState();
  expect(
    applyCommand(
      fixture,
      state,
      { type: "setShipmentQuantity", materialId: "liquid-0", quantity: 5 },
      true,
    ).ok,
  ).toBe(true);

  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(state)).ok).toBe(true);
  expect(restored.serialize()).toEqual(state);
  expect(restored.snapshot().shipmentManifest).toEqual({ "liquid-0": 5 });
  expect(restored.serialize().terminalModules["liquid-dock"].quantity).toBe(8);
  expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
});

it("limits legacy auto-export to the same physical shipment capacity", () => {
  const state = loadedTerminalState();
  state.policies["liquid-0"] = "export";
  state.policies["gas-0"] = "export";

  settleTerminalExports(fixture, state);

  expect(state.exported).toBe(fixture.site.terminalShipmentCapacity);
  expect(
    state.terminalModules["liquid-dock"].quantity +
      state.terminalModules["gas-dock"].quantity,
  ).toBe(16 - fixture.site.terminalShipmentCapacity);
  expect(auditLedger(fixture, state).ok).toBe(true);
});
