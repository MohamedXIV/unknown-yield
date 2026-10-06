import type { Content } from "@site/content";
import {
  amount,
  type MilestoneView,
  type Save,
} from "./types";

type MilestoneDefinition = Content["economy"]["milestones"][number];
type MilestoneRequirement = MilestoneDefinition["requires"][number];

export function terminalCapabilityUnlocked(
  c: Content,
  s: Pick<Save, "milestones">,
  capabilityId: string,
): boolean {
  return c.economy.milestones.some(
    (milestone) =>
      milestone.unlockTerminalCapabilityIds.includes(capabilityId) &&
      Object.hasOwn(s.milestones, milestone.id),
  );
}

export function terminalCanExport(
  c: Content,
  s: Pick<Save, "milestones">,
  materialId: string,
): boolean {
  const listing = c.economy.exchange.find(
    (entry) => entry.materialId === materialId,
  );
  if (!listing?.requiredTerminalCapabilityId) return true;
  return terminalCapabilityUnlocked(
    c,
    s,
    listing.requiredTerminalCapabilityId,
  );
}

export function milestoneRequirementSatisfied(
  c: Content,
  s: Pick<
    Save,
    "knowledge" | "flows" | "opportunities" | "milestones"
  >,
  requirement: MilestoneRequirement,
): boolean {
  switch (requirement.type) {
    case "reaction-confirmed":
      return s.knowledge.includes(requirement.reactionId);
    case "material-exported":
      return amount(s.flows.exported, requirement.materialId) >= requirement.units;
    case "order-completed":
      return s.opportunities[requirement.orderId]?.status === "completed";
    case "directive-completed":
      return s.opportunities[requirement.directiveId]?.status === "completed";
    case "milestone-completed":
      return Object.hasOwn(s.milestones, requirement.milestoneId);
    case "terminal-capability":
      return terminalCapabilityUnlocked(c, s, requirement.capabilityId);
  }
}

export function milestoneSatisfied(
  c: Content,
  s: Pick<
    Save,
    "knowledge" | "flows" | "opportunities" | "milestones"
  >,
  milestone: MilestoneDefinition,
): boolean {
  return milestone.requires.every((requirement) =>
    milestoneRequirementSatisfied(c, s, requirement),
  );
}

export function refreshMilestones(
  c: Content,
  s: Pick<
    Save,
    "tick" | "knowledge" | "flows" | "opportunities" | "milestones"
  >,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const milestone of c.economy.milestones) {
      if (
        Object.hasOwn(s.milestones, milestone.id) ||
        !milestoneSatisfied(c, s, milestone)
      )
        continue;
      s.milestones[milestone.id] = { completedAt: s.tick };
      changed = true;
    }
  }
}

export function milestoneViews(
  c: Content,
  s: Pick<Save, "milestones">,
): MilestoneView[] {
  return c.economy.milestones
    .filter(
      (milestone) =>
        !milestone.hiddenUntilCompleted ||
        Object.hasOwn(s.milestones, milestone.id),
    )
    .map((milestone) => ({
      id: milestone.id,
      nameKey: milestone.nameKey,
      hintKey: milestone.hintKey,
      completed: Object.hasOwn(s.milestones, milestone.id),
      completedAt: s.milestones[milestone.id]?.completedAt ?? null,
      unlockedTerminalCapabilities: milestone.unlockTerminalCapabilityIds.map(
        (capabilityId) => {
          const capability = c.economy.terminalCapabilities.find(
            (entry) => entry.id === capabilityId,
          )!;
          return {
            id: capability.id,
            nameKey: capability.nameKey,
            unlocked: terminalCapabilityUnlocked(c, s, capability.id),
          };
        },
      ),
    }));
}
