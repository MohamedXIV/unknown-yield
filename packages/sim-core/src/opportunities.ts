import type { Content } from "@site/content";
import { machineUnlocked } from "./progression";
import { companyKnowsMaterial, exchangeDefinition } from "./market";
import {
  change,
  experimentEvidenceKey,
  type OpportunityState,
  type OpportunityView,
  type Save,
} from "./types";

type OrderDefinition = Content["economy"]["orders"][number];
type DirectiveDefinition = Content["economy"]["directives"][number];
type PropertyDirectiveDefinition =
  Content["economy"]["propertyDirectives"][number];
type OpportunityDefinition =
  | { kind: "order"; definition: OrderDefinition }
  | { kind: "directive"; definition: DirectiveDefinition }
  | { kind: "property-directive"; definition: PropertyDirectiveDefinition };

function definitions(c: Content): OpportunityDefinition[] {
  return [
    ...c.economy.orders.map((definition) => ({
      kind: "order" as const,
      definition,
    })),
    ...c.economy.directives.map((definition) => ({
      kind: "directive" as const,
      definition,
    })),
    ...c.economy.propertyDirectives.map((definition) => ({
      kind: "property-directive" as const,
      definition,
    })),
  ];
}

function directiveEvidenceId(definition: DirectiveDefinition) {
  return experimentEvidenceKey(
    definition.operationId,
    definition.inputMaterialId,
    definition.processConditionId ?? null,
  );
}

function reactionMachineAvailable(
  c: Content,
  s: Pick<Save, "knowledge">,
  reactionId: string,
): boolean {
  const reaction = c.reactions.find((entry) => entry.id === reactionId);
  if (!reaction || !companyKnowsMaterial(c, s, reaction.input)) return false;
  return c.machines.some(
    (machine) =>
      machine.role === "processor" &&
      machine.operations.includes(reaction.operation) &&
      machine.processConditionId === reaction.processConditionId &&
      machineUnlocked(s, machine),
  );
}

function directiveCapability(
  c: Content,
  s: Pick<Save, "knowledge">,
  definition: DirectiveDefinition,
) {
  return c.machines.some(
    (machine) =>
      machine.role === "processor" &&
      machine.operations.includes(definition.operationId) &&
      machine.processConditionId === definition.processConditionId &&
      machineUnlocked(s, machine),
  );
}

function eligible(
  c: Content,
  s: Pick<Save, "knowledge" | "market" | "evidence">,
  entry: OpportunityDefinition,
): boolean {
  if (entry.kind === "order") {
    const definition = entry.definition;
    return (
      !!exchangeDefinition(c, definition.materialId) &&
      companyKnowsMaterial(c, s, definition.materialId) &&
      Object.hasOwn(s.market, definition.materialId)
    );
  }
  if (entry.kind === "directive") {
    const definition = entry.definition;
    return (
      companyKnowsMaterial(c, s, definition.inputMaterialId) &&
      directiveCapability(c, s, definition) &&
      !Object.hasOwn(s.evidence, directiveEvidenceId(definition))
    );
  }
  const definition = entry.definition;
  return (
    companyKnowsMaterial(c, s, definition.targetMaterialId) &&
    !definition.solutionReactionIds.some((id) => s.knowledge.includes(id)) &&
    definition.solutionReactionIds.some((id) =>
      reactionMachineAvailable(c, s, id),
    )
  );
}

function complete(
  s: Pick<Save, "tick" | "fuel" | "company">,
  state: OpportunityState,
  rewardFuel: number,
  progress: number,
  rewardImportSupplyId?: string,
) {
  state.status = "completed";
  state.progress = progress;
  state.completedAt = s.tick;
  s.fuel += rewardFuel;
  if (rewardImportSupplyId)
    change(s.company.importAllocations, rewardImportSupplyId, 1);
}

export function refreshOpportunities(
  c: Content,
  s: Pick<
    Save,
    "tick" | "fuel" | "knowledge" | "market" | "evidence" | "opportunities"
  >,
): void {
  for (const state of Object.values(s.opportunities))
    if (state.status === "offered" && s.tick >= state.expiresAt)
      state.status = "expired";

  for (const entry of definitions(c)) {
    const definition = entry.definition;
    if (Object.hasOwn(s.opportunities, definition.id) || !eligible(c, s, entry))
      continue;
    s.opportunities[definition.id] = {
      status: "offered",
      offeredAt: s.tick,
      expiresAt: s.tick + definition.durationTicks,
      progress: 0,
      completedAt: null,
    };
  }
}

export function recordDirectiveExperiment(
  c: Content,
  s: Pick<Save, "tick" | "fuel" | "company" | "opportunities">,
  operationId: string,
  inputMaterialId: string,
  processConditionId: string | null,
): void {
  const reaction = c.reactions.find(
    (entry) =>
      entry.operation === operationId &&
      entry.input === inputMaterialId &&
      (entry.processConditionId ?? null) === processConditionId,
  );
  const ordinary = c.economy.directives.find(
    (entry) =>
      entry.operationId === operationId &&
      entry.inputMaterialId === inputMaterialId &&
      (entry.processConditionId ?? null) === processConditionId,
  );
  if (ordinary) {
    const state = s.opportunities[ordinary.id];
    if (
      state &&
      state.status === "offered" &&
      s.tick < state.expiresAt
    )
      complete(s, state, ordinary.rewardFuel, 1);
  }
  if (!reaction) return;
  for (const definition of c.economy.propertyDirectives) {
    if (!definition.solutionReactionIds.includes(reaction.id)) continue;
    const state = s.opportunities[definition.id];
    if (
      !state ||
      state.status !== "offered" ||
      s.tick >= state.expiresAt
    )
      continue;
    complete(
      s,
      state,
      definition.rewardFuel,
      1,
      definition.rewardImportSupplyId,
    );
  }
}

export function recordOrderExport(
  c: Content,
  s: Pick<Save, "tick" | "fuel" | "company" | "opportunities">,
  materialId: string,
  units: number,
): void {
  let remaining = Math.max(0, units);
  if (!remaining) return;
  for (const definition of c.economy.orders) {
    if (definition.materialId !== materialId || !remaining) continue;
    const state = s.opportunities[definition.id];
    if (
      !state ||
      state.status !== "offered" ||
      s.tick >= state.expiresAt
    )
      continue;
    const needed = definition.quantity - state.progress;
    if (needed <= 0) continue;
    const accepted = Math.min(remaining, needed);
    state.progress += accepted;
    remaining -= accepted;
    if (state.progress === definition.quantity)
      complete(s, state, definition.rewardFuel, definition.quantity);
  }
}

export function opportunityViews(
  c: Content,
  s: Pick<Save, "tick" | "knowledge" | "opportunities">,
): OpportunityView[] {
  const views: OpportunityView[] = [];
  for (const entry of definitions(c)) {
    const state = s.opportunities[entry.definition.id];
    if (!state || state.status !== "offered" || s.tick >= state.expiresAt)
      continue;
    if (entry.kind === "order") {
      const definition = entry.definition;
      views.push({
        id: definition.id,
        kind: "order",
        nameKey: definition.nameKey,
        briefKey: definition.briefKey,
        rewardFuel: definition.rewardFuel,
        expiresAt: state.expiresAt,
        materialId: definition.materialId,
        quantity: definition.quantity,
        progress: state.progress,
      });
      continue;
    }
    if (entry.kind === "property-directive") {
      const definition = entry.definition;
      views.push({
        id: definition.id,
        kind: "property-directive",
        nameKey: definition.nameKey,
        briefKey: definition.briefKey,
        propertyKey: definition.propertyKey,
        rewardFuel: definition.rewardFuel,
        ...(definition.rewardImportSupplyId
          ? { rewardImportSupplyId: definition.rewardImportSupplyId }
          : {}),
        expiresAt: state.expiresAt,
        targetMaterialId: definition.targetMaterialId,
      });
      continue;
    }
    const definition = entry.definition;
    const setup = c.machines.find(
      (machine) =>
        machine.role === "processor" &&
        machine.operations.includes(definition.operationId) &&
        machine.processConditionId === definition.processConditionId &&
        machineUnlocked(s, machine),
    );
    views.push({
      id: definition.id,
      kind: "directive",
      nameKey: definition.nameKey,
      briefKey: definition.briefKey,
      rewardFuel: definition.rewardFuel,
      expiresAt: state.expiresAt,
      operationId: definition.operationId,
      inputMaterialId: definition.inputMaterialId,
      ...(setup ? { setupNameKey: setup.nameKey } : {}),
    });
  }
  return views;
}
