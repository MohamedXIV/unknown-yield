import type { Content } from "./schema";
export type HandlingState = Content["materials"][number]["handlingState"];
export type ContainmentResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unknown-material" | "handling-state" | "missing-containment";
      missing: string[];
    };
export function checkContainment(
  c: Content,
  materialId: string,
  states: readonly HandlingState[],
  capabilities: readonly string[],
): ContainmentResult {
  const material = c.materials.find((m) => m.id === materialId);
  if (!material) return { ok: false, reason: "unknown-material", missing: [] };
  if (!states.includes(material.handlingState))
    return { ok: false, reason: "handling-state", missing: [] };
  const missing = material.requiredContainment
    .filter((id) => !capabilities.includes(id))
    .sort();
  return missing.length
    ? { ok: false, reason: "missing-containment", missing }
    : { ok: true };
}
