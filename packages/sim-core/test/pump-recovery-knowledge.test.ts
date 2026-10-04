import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { publicPumpIncident, validatePumpIncident } from "../src/pump-recovery";
import { publicTransportDiagnostic } from "../src/containment";
import { pumpRecoveryDiagnostic } from "../src/liquids";
import { recoveryRig } from "./pump-recovery-helpers";
it("sanitizes incident identity without creating reaction evidence", () => {
  const { sim, pumpId } = recoveryRig(),
    s = sim.serialize(),
    p = s.pumps[pumpId],
    before = structuredClone(s);
  const view = publicPumpIncident(p, new Set());
  expect(view?.materialId).toBeNull();
  view!.quantity = 99;
  expect(p.incident!.quantity).toBe(1);
  p.incident!.drainEnabled = true;
  expect(
    publicTransportDiagnostic(
      pumpRecoveryDiagnostic(fixture, s, p)!,
      new Set(),
    ),
  ).toEqual({ reason: "incompatible", containmentProfileId: "standard" });
  p.incident!.drainEnabled = false;
  expect(s).toEqual(before);
  expect(
    sim.snapshot().pumps.find((p) => p.id === pumpId)?.incident?.materialId,
  ).toBe("liquid-0");
  const c = structuredClone(fixture);
  c.materials
    .find((m) => m.id === "liquid-0")!
    .requiredContainment.push("heat-resistant");
  expect(() =>
    validatePumpIncident(c, p, s.tick, new Set(["liquid-0"])),
  ).toThrow(/incident/);
});
