import type { Content } from "@site/content";
import { change, type Machine, type Save } from "./types";

export type HazardReaction = Content["reactions"][number];
export type HazardInstance = NonNullable<HazardReaction["hazard"]>;
export type HazardClassDefinition = Content["hazardClasses"][number];

export type ResolvedHazard = {
  reaction: HazardReaction;
  hazard: HazardInstance;
  classDefinition: HazardClassDefinition;
};

export function hazardClassDefinition(
  content: Content,
  classId: string,
): HazardClassDefinition | undefined {
  return content.hazardClasses.find((entry) => entry.id === classId);
}

export function hazardDefinition(
  content: Content,
  hazardId: string,
): ResolvedHazard | undefined {
  const reaction = content.reactions.find(
    (entry) => entry.hazard?.id === hazardId,
  );
  if (!reaction?.hazard) return undefined;
  const classDefinition = hazardClassDefinition(
    content,
    reaction.hazard.classId,
  );
  if (!classDefinition) return undefined;
  return {
    reaction,
    hazard: reaction.hazard,
    classDefinition,
  };
}

/**
 * Hazard consequences are deterministic authored consequences of the reaction
 * and its referenced class. There is deliberately no random roll here.
 *
 * #120 introduces only the existing machine lockout consequence. Later Phase
 * 11 issues can add physical consequences to the class schema without turning
 * the trigger itself into hidden RNG.
 */
export function applyReactionHazard(
  content: Content,
  state: Save,
  machine: Machine,
  reaction: HazardReaction,
): void {
  if (!reaction.hazard) return;
  const classDefinition = hazardClassDefinition(
    content,
    reaction.hazard.classId,
  );
  if (!classDefinition)
    throw new Error("Reaction references an unknown hazard class");
  if (!state.hazardEvidence.includes(reaction.hazard.id))
    state.hazardEvidence.push(reaction.hazard.id);

  switch (classDefinition.machineEffect) {
    case "lockout": {
      const stranded = classDefinition.strandedOutputUnits;
      if (stranded > 0) {
        if ((machine.output[reaction.output] ?? 0) < stranded)
          throw new Error("Hazard consequence exceeds completed output");
        change(machine.output, reaction.output, -stranded);
        change(machine.incidentInventory, reaction.output, stranded);
      }
      machine.incident = reaction.hazard.id;
      machine.enabled = false;
      return;
    }
  }
}
