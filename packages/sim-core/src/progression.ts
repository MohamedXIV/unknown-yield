import type { MachineDefinition } from "@site/content";
import type { Save } from "./types";

/**
 * Issue #33 progression proof.
 *
 * Capability state is derived only from stable authored evidence identity:
 * either confirmed reaction knowledge or an observed hazard incident already
 * persisted in the save. There is no XP, currency, display-text or parallel
 * unlock state.
 */
export function machineUnlocked(
  state: Pick<Save, "knowledge"> & Partial<Pick<Save, "hazardEvidence">>,
  definition: MachineDefinition,
): boolean {
  if (!definition.unlock) return true;
  return "reactionId" in definition.unlock
    ? state.knowledge.includes(definition.unlock.reactionId)
    : (state.hazardEvidence ?? []).includes(
        definition.unlock.hazardEvidenceId,
      );
}
