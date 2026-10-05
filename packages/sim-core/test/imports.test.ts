import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { auditLedger } from "../src/ledger";
import { Simulation } from "../src/simulation";

const externalPoint = (outlet: { x: number; y: number; direction: number }) => {
  const delta = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ][outlet.direction]!;
  return { x: outlet.x + delta.x, y: outlet.y + delta.y };
};

it("receives specialized off-world cargo into physical terminal import holding", () => {
  const sim = new Simulation(fixture);
  const before = sim.serialize();
  const result = sim.command({
    type: "requestImport",
    supplyId: "orbital-binder-crate",
  });
  expect(result.ok).toBe(true);
  const after = sim.serialize();
  expect(after.fuel).toBe(before.fuel - 42);
  expect(after.stock).toEqual(before.stock);
  expect(after.terminalImports.staging).toEqual({ "orbital-binder": 6 });
  expect(after.terminalImports.received).toEqual({ "orbital-binder": 6 });
  expect(auditLedger(fixture, after).ok).toBe(true);

  const restored = new Simulation(fixture);
  expect(restored.load(after).ok).toBe(true);
  expect(restored.serialize()).toEqual(after);
});

it("bounds imports and releases them only through the physical dry outlet", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({ type: "requestImport", supplyId: "orbital-binder-crate" }).ok,
  ).toBe(true);
  expect(
    sim.command({ type: "requestImport", supplyId: "orbital-binder-crate" }).ok,
  ).toBe(true);
  expect(
    sim.command({ type: "requestImport", supplyId: "orbital-binder-crate" }).ok,
  ).toBe(false);

  const outlet = sim.snapshot().importOutlet;
  const outside = externalPoint(outlet);
  expect(
    sim.command({
      type: "placeBelts",
      points: [outside],
      direction: outlet.direction,
    }).ok,
  ).toBe(true);

  const before = sim.serialize();
  sim.step(fixture.tickMs * fixture.site.transportEveryTicks);
  const after = sim.serialize();
  const belt = Object.values(after.belts).find(
    (entry) => entry.x === outside.x && entry.y === outside.y,
  )!;
  expect(belt.cargo).toBe("orbital-binder");
  expect(after.terminalImports.staging["orbital-binder"]).toBe(
    before.terminalImports.staging["orbital-binder"] - 1,
  );
  expect(after.stock["orbital-binder"]).toBeUndefined();
  expect(auditLedger(fixture, after).ok).toBe(true);
});


it("migrates schema 22 to empty import state and requires it in the current schema", () => {
  const sim = new Simulation(fixture);
  const current = sim.serialize();
  const legacy = structuredClone(current) as Record<string, unknown>;
  legacy.schemaVersion = 22;
  delete legacy.terminalImports;

  const restored = new Simulation(fixture);
  expect(restored.load(legacy).ok).toBe(true);
  expect(restored.serialize().schemaVersion).toBe(24);
  expect(restored.serialize().terminalImports).toEqual({
    staging: {},
    received: {},
  });

  const tampered = structuredClone(current) as Record<string, unknown>;
  delete tampered.terminalImports;
  expect(sim.load(tampered).ok).toBe(false);
  expect(sim.serialize()).toEqual(current);

  const impossibleLegacy = structuredClone(current) as Record<string, unknown>;
  impossibleLegacy.schemaVersion = 22;
  impossibleLegacy.terminalImports = {
    staging: { "orbital-binder": 6 },
    received: { "orbital-binder": 6 },
  };
  expect(sim.load(impossibleLegacy).ok).toBe(false);
  expect(sim.serialize()).toEqual(current);

  const preManifest = structuredClone(current) as Record<string, unknown>;
  preManifest.schemaVersion = 21;
  delete preManifest.terminalImports;
  preManifest.shipmentManifest = { ferrite: 1 };
  expect(sim.load(preManifest).ok).toBe(false);
  expect(sim.serialize()).toEqual(current);
});
