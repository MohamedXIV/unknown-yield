import { checkContainment, type Content } from "@site/content";
import { liquidContainment } from "./containment";
import type { Pump } from "./types";
export function publicPumpIncident(p: Pump, known: ReadonlySet<string>) {
  return p.incident
    ? {
        ...p.incident,
        materialId: known.has(p.incident.materialId)
          ? p.incident.materialId
          : null,
      }
    : null;
}
export function validatePumpIncident(
  c: Content,
  p: Pump,
  tick: number,
  known: ReadonlySet<string>,
): void {
  const i = p.incident;
  if (!i) return;
  const d = pumpFailureDefinition(c),
    m = c.materials.find((m) => m.id === i.materialId);
  if (
    !d ||
    i.definitionId !== d.id ||
    !m ||
    !known.has(i.materialId) ||
    m.handlingState !== "liquid" ||
    !m.requiredContainment.includes(d.missingCapabilityId) ||
    p.enabled ||
    i.startedAt > tick ||
    i.quantity > d.trappedCapacity ||
    (i.quantity > 0 && p.containmentProfileId !== d.exposedProfileId) ||
    (p.containmentProfileId !== d.exposedProfileId && !pumpRepairEligible(c, p))
  )
    throw Error("Invalid pump incident");
}
export const pumpFailureDefinition = (c: Content) =>
  c.liquidLogistics?.pump.containmentFailure;
export function pumpExposureEligible(
  c: Content,
  p: Pump,
  materialId: string,
): boolean {
  const d = pumpFailureDefinition(c);
  if (!d || p.incident || p.containmentProfileId !== d.exposedProfileId)
    return false;
  const result = checkContainment(
    c,
    materialId,
    ["liquid"],
    liquidContainment(c, "pump", p.containmentProfileId),
  );
  return (
    !result.ok &&
    result.reason === "missing-containment" &&
    result.missing.length === 1 &&
    result.missing[0] === d.missingCapabilityId
  );
}
export function pumpRepairEligible(c: Content, p: Pump): boolean {
  return (
    !!p.incident &&
    !p.enabled &&
    p.incident.quantity === 0 &&
    checkContainment(
      c,
      p.incident.materialId,
      ["liquid"],
      liquidContainment(c, "pump", p.containmentProfileId),
    ).ok
  );
}
