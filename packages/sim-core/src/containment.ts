import type { Content } from "@site/content";
import { checkContainment } from "@site/content";
export function receivingDiagnostic(
  c: Content,
  materialId: string,
  state: "solid" | "liquid" | "gas",
  caps: string[],
  target: {
    material: string | null;
    quantity: number;
    capacity: number;
  } | null,
  containmentProfileId?: string,
): TransportDiagnostic {
  const base = {
    materialId,
    ...(containmentProfileId ? { containmentProfileId } : {}),
  };
  if (!target) return { ...base, reason: "route" };
  const protection = checkContainment(c, materialId, [state], caps);
  if (!protection.ok)
    return {
      ...base,
      reason:
        protection.reason === "missing-containment"
          ? "missing-containment"
          : "handling-state",
      ...(protection.reason === "missing-containment"
        ? { missingContainment: protection.missing }
        : {}),
    };
  if (target.material !== null && target.material !== materialId)
    return { ...base, reason: "identity-mismatch" };
  return {
    ...base,
    reason: target.quantity >= target.capacity ? "capacity" : "ready",
  };
}
export type TransportDiagnostic = {
  reason:
    | "incident"
    | "ready"
    | "terminal-module-missing"
    | "terminal-module-locked"
    | "disabled"
    | "needs-fuel"
    | "needs-input"
    | "handling-state"
    | "missing-containment"
    | "identity-mismatch"
    | "capacity"
    | "route"
    | "incompatible";
  materialId?: string;
  terminalModuleId?: string;
  missingContainment?: string[];
  containmentProfileId?: string;
};
export function publicTransportDiagnostic(
  d: TransportDiagnostic,
  known: ReadonlySet<string>,
): TransportDiagnostic {
  if (!d.materialId || known.has(d.materialId)) return { ...d };
  return {
    reason: "incompatible",
    ...(d.containmentProfileId
      ? { containmentProfileId: d.containmentProfileId }
      : {}),
  };
}
export type LiquidKind = "pipe" | "tank" | "pump";
export function liquidProfile(c: Content, id: string) {
  const profile = c.liquidLogistics?.containmentProfiles.find(
    (p) => p.id === id,
  );
  if (!profile) throw Error("Unknown liquid containment profile");
  return profile;
}
export function liquidContainment(
  c: Content,
  kind: LiquidKind,
  profileId: string,
) {
  return [
    ...new Set([
      ...c.liquidLogistics![kind].containmentCapabilities,
      ...liquidProfile(c, profileId).capabilities,
    ]),
  ];
}
export function liquidConstructionCost(
  c: Content,
  kind: LiquidKind,
  profileId: string,
) {
  return (
    c.liquidLogistics![kind].cost +
    liquidProfile(c, profileId).additionalCost[kind]
  );
}
