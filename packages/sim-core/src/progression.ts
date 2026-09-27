import type { MachineDefinition } from "@site/content";
import type { Save } from "./types";

/**
 * Issue #33 progression proof.
 *
 * Capability state is derived only from stable authored reaction identity and
 * confirmed knowledge already persisted in the save. There is no XP, currency,
 * display-text or parallel unlock state.
 */
export function machineUnlocked(
  state: Pick<Save, "knowledge">,
  definition: MachineDefinition,
): boolean {
  return (
    definition.unlock === undefined ||
    state.knowledge.includes(definition.unlock.reactionId)
  );
}
