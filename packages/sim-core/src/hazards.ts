import type { Content } from "@site/content";
import { change, type Machine, type Save } from "./types";
import { footprint, footprintGap } from "./geometry";

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
      // A class may also physically injure the chamber. Keep the existing
      // independent 1..10000 integrity axis and never invent/delete matter.
      // Only machines with a physical service rule take lasting damage.
      // Test-only/specialist packs without repair capability retain their
      // original lockout-only consequence rather than becoming unrepairable.
      const definition = content.machines.find((d) => d.id === machine.definitionId)!;
      if (definition.reliability?.service) {
        const profile = definition.reliability;
        // Fouling is cumulative wear on the same authoritative axes as
        // extraction fatigue. Real physical service is required to clean it.
        const fouling = classDefinition.foulingWear;
        machine.wear = Math.min(10000, machine.wear + fouling);
        machine.integrity = Math.max(1,
          machine.integrity - classDefinition.integrityDamage -
          fouling * profile.integrityLossPerWear);
      }
      // A bounded authored blast can injure *other* machinery nearby.
      // Only spatial footprints determine reach: no secondary hazards fire,
      // and none of the target's buffers, jobs or inventories are changed.
      // Without a locally funded service profile the target remains intact.
      if (classDefinition.localShock) {
        const { range, integrityDamage } = classDefinition.localShock;
        const source = footprint(machine, definition);
        for (const target of Object.values(state.machines)) {
          if (target.id === machine.id) continue;
          const other = content.machines.find(d => d.id === target.definitionId)!;
          if (!other.reliability?.service) continue;
          if (footprintGap(source, footprint(target, other)) > range) continue;
          target.integrity = Math.max(1, target.integrity - integrityDamage);
        }
      }
      machine.incident = reaction.hazard.id;
      machine.enabled = false;
      return;
    }
  }
}
