import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { auditLedger } from "../src/index";
import { transportLiquids } from "../src/liquids";
import { recoveryRig } from "./pump-recovery-helpers";

it("captures once without delivery, fuel, evidence or same-cadence drain", () => {
  const { sim, pumpId, sourceMachineId } = recoveryRig(false);
  const s = sim.serialize(),
    before = structuredClone(s),
    moves: unknown[] = [];
  transportLiquids(fixture, s, (e) => moves.push(e));
  expect(s.pumps[pumpId].incident).toEqual({
    definitionId: "pump-corrosion",
    materialId: "liquid-0",
    quantity: 1,
    startedAt: s.tick,
    drainEnabled: false,
  });
  expect(s.pumps[pumpId].enabled).toBe(false);
  expect(s.machines[sourceMachineId].output["liquid-0"]).toBe(3);
  expect(s.pipes["28,36"].quantity).toBe(0);
  expect(s.fuel).toBe(before.fuel);
  expect(s.flows).toEqual(before.flows);
  expect(s.knowledge).toEqual(before.knowledge);
  expect(moves).toEqual([]);
  expect(auditLedger(fixture, s).ok).toBe(true);
  const captured = structuredClone(s);
  transportLiquids(fixture, s);
  expect(s).toEqual(captured);
  s.pumps[pumpId].incident!.drainEnabled = true;
  s.fuel = 0;
  transportLiquids(fixture, s, (e) => moves.push(e));
  expect(s.pumps[pumpId].incident!.quantity).toBe(0);
  expect(s.pumps[pumpId].incident!.materialId).toBe("liquid-0");
  expect(s.pipes["28,36"].quantity).toBe(1);
  expect(s.machines[sourceMachineId].output["liquid-0"]).toBe(3);
  expect(moves).toHaveLength(1);
});

it.each([
  "fuel",
  "direction",
  "unprotected",
  "full",
  "disabled",
  "identity",
  "state",
])("refuses %s exposure without mutation", (mode) => {
  const { sim, pumpId } = recoveryRig(false);
  const s = sim.serialize();
  if (mode === "fuel") s.fuel = 0;
  if (mode === "direction") s.pipes["28,36"].inlet = 1;
  if (mode === "unprotected")
    s.pipes["28,36"].containmentProfileId = "standard";
  if (mode === "full") {
    s.pipes["28,36"].quantity = fixture.liquidLogistics!.pipe.capacity;
    s.pipes["28,36"].materialId = "liquid-0";
  }
  if (mode === "disabled") s.pumps[pumpId].enabled = false;
  if (mode === "identity") {
    s.pipes["28,36"].quantity = 1;
    s.pipes["28,36"].materialId = "raw";
  }
  if (mode === "state") {
    for (const m of Object.values(s.machines)) m.output = { raw: 4 };
  }
  const before = structuredClone(s);
  transportLiquids(fixture, s);
  expect(s).toEqual(before);
});
it("retains refusal with absent rule or additional missing capabilities", () => {
  for (const mode of ["absent", "extra"]) {
    const { sim } = recoveryRig(false),
      s = sim.serialize(),
      c = structuredClone(fixture);
    if (mode === "absent") delete c.liquidLogistics!.pump.containmentFailure;
    else
      c.materials
        .find((m) => m.id === "liquid-0")!
        .requiredContainment.push("heat-resistant");
    const before = structuredClone(s);
    transportLiquids(c, s);
    expect(s).toEqual(before);
  }
});

it("reserves shared source once in stable order (transport-only overlapping consumers)", () => {
  const { sim, pumpId, sourceMachineId } = recoveryRig(false),
    a = sim.serialize();
  // Deliberately transport-only: placement disallows overlapping pumps. Keep that rule intact.
  a.machines[sourceMachineId].output["liquid-0"] = 1;
  a.flows.produced["liquid-0"] = 1;
  a.pumps.u999 = { ...a.pumps[pumpId], id: "u999" };
  const b = structuredClone(a);
  b.pumps = Object.fromEntries(Object.entries(b.pumps).reverse());
  transportLiquids(fixture, a);
  transportLiquids(fixture, b);
  expect(a).toEqual(b);
  expect(
    Object.values(a.pumps).reduce((n, p) => n + (p.incident?.quantity ?? 0), 0),
  ).toBe(1);
  expect(a.machines[sourceMachineId].output["liquid-0"] ?? 0).toBe(0);
});

it.each(["direction", "unprotected", "full", "identity"])(
  "retains service charge while %s then resumes",
  (mode) => {
    const { sim, pumpId } = recoveryRig(),
      s = sim.serialize();
    s.pumps[pumpId].incident!.drainEnabled = true;
    const pipe = s.pipes["28,36"];
    if (mode === "direction") pipe.inlet = 1;
    if (mode === "unprotected") pipe.containmentProfileId = "standard";
    if (mode === "full") {
      pipe.quantity = fixture.liquidLogistics!.pipe.capacity;
      pipe.materialId = "liquid-0";
    }
    if (mode === "identity") {
      pipe.quantity = 1;
      pipe.materialId = "raw";
    }
    const before = structuredClone(s);
    transportLiquids(fixture, s);
    expect(s).toEqual(before);
    pipe.inlet = 2;
    pipe.containmentProfileId = "lined";
    pipe.quantity = 0;
    pipe.materialId = null;
    transportLiquids(fixture, s);
    expect(s.pumps[pumpId].incident!.quantity).toBe(0);
    expect(pipe.quantity).toBe(1);
  },
);
