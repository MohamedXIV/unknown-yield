import { z } from "zod";
import {
  enCatalog,
  localeKeySchema,
  validateLocaleCoverage,
} from "./locale";
const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .refine((v) => !["constructor", "prototype", "tostring"].includes(v));
const positive = z.number().int().positive().max(1000000);
const count = z.number().int().nonnegative().max(1000000);
const pos = z.number().int().nonnegative();
export const contentSchema = z.object({
  version: z.string().min(1),
  tickMs: z.number().int().min(20).max(1000),
  materials: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        known: z.boolean(),
      }),
    )
    .min(1),
  operations: z
    .array(z.object({ id, nameKey: localeKeySchema }))
    .min(1),
  machines: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        role: z.enum(["extractor", "processor"]),
        processConditionId: id.optional(),
        unlock: z
          .object({
            reactionId: id,
            hintKey: localeKeySchema,
          })
          .optional(),
        operations: z.array(id),
        capacity: positive,
        fuel: positive,
        durationTicks: positive,
        width: positive,
        height: positive,
        cost: positive,
      }),
    )
    .min(1),
  storages: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        capacity: positive,
        width: positive,
        height: positive,
        cost: positive,
      }),
    )
    .min(1),
  reactions: z
    .array(
      z.object({
        id,
        operation: id,
        processConditionId: id.optional(),
        input: id,
        inputAmount: positive,
        output: id,
        outputAmount: positive,
        observationKey: localeKeySchema,
        hazard: z
          .object({
            id,
            nameKey: localeKeySchema,
            observationKey: localeKeySchema,
          })
          .optional(),
        known: z.boolean(),
      }),
    )
    .min(1),
  site: z.object({
    width: positive,
    height: positive,
    buildMaterial: id,
    startStock: positive,
    factoryMin: positive,
    factoryMax: positive,
    factoryCellCost: positive,
    beltCost: positive,
    portCost: positive,
    transportEveryTicks: positive,
    stagingCapacity: positive,
    terminal: z.object({ x: pos, y: pos, width: positive, height: positive }),
    deposits: z
      .array(
        z.object({
          id,
          material: id,
          x: pos,
          y: pos,
          width: positive,
          height: positive,
          units: positive,
        }),
      )
      .min(1),
  }),
  economy: z.object({
    startFuel: count,
    grant: positive,
    assistanceBelow: positive,
    milestoneExports: positive,
    marketEveryTicks: positive,
    exchange: z
      .array(
        z.object({
          materialId: id,
          baseCompensation: positive,
          floorCompensation: positive,
          baseDemandBps: z.number().int().min(1000).max(20000),
          saturationPerUnitBps: z.number().int().positive().max(10000),
          recoveryPerMarketTickBps: z.number().int().positive().max(10000),
          requiredTerminalCapabilityId: id.optional(),
        }),
      )
      .min(1),
    orders: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          briefKey: localeKeySchema,
          materialId: id,
          quantity: positive,
          durationTicks: positive,
          rewardFuel: positive,
        }),
      )
      .default([]),
    directives: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          briefKey: localeKeySchema,
          operationId: id,
          inputMaterialId: id,
          processConditionId: id.optional(),
          durationTicks: positive,
          rewardFuel: positive,
        }),
      )
      .default([]),
    terminalCapabilities: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
        }),
      )
      .default([]),
    milestones: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          hintKey: localeKeySchema,
          requires: z
            .array(
              z.discriminatedUnion("type", [
                z.object({
                  type: z.literal("reaction-confirmed"),
                  reactionId: id,
                }),
                z.object({
                  type: z.literal("material-exported"),
                  materialId: id,
                  units: positive,
                }),
                z.object({
                  type: z.literal("order-completed"),
                  orderId: id,
                }),
                z.object({
                  type: z.literal("directive-completed"),
                  directiveId: id,
                }),
                z.object({
                  type: z.literal("milestone-completed"),
                  milestoneId: id,
                }),
                z.object({
                  type: z.literal("terminal-capability"),
                  capabilityId: id,
                }),
              ]),
            )
            .min(1),
          unlockTerminalCapabilityIds: z.array(id).default([]),
        }),
      )
      .default([]),
  }),
});
export type Content = z.infer<typeof contentSchema>;
export type MachineDefinition = Content["machines"][number];
export type StorageDefinition = Content["storages"][number];
function validateContentInternal(
  input: unknown,
  catalog: Record<string, string> | null,
): Content {
  const c = contentSchema.parse(input);
  for (const table of [
    c.materials,
    c.operations,
    c.machines,
    c.storages,
    c.reactions,
    c.site.deposits,
  ])
    if (new Set(table.map((r) => r.id)).size !== table.length)
      throw new Error("Duplicate content ID");
  const materials = new Set(c.materials.map((m) => m.id)),
    operations = new Set(c.operations.map((o) => o.id));
  if (!c.materials.find((m) => m.id === c.site.buildMaterial)?.known)
    throw new Error("Construction material must be initially known");
  if (c.site.factoryMin < 4 || c.site.factoryMax < c.site.factoryMin)
    throw new Error("Invalid factory size");
  const matches = new Set<string>(),
    hazardIds = new Set<string>();
  for (const r of c.reactions) {
    if (
      !materials.has(r.input) ||
      !materials.has(r.output) ||
      !operations.has(r.operation)
    )
      throw new Error("Missing reaction reference");
    const key =
      r.operation + "/" + r.input + "/" + (r.processConditionId ?? "");
    if (matches.has(key)) throw new Error("Ambiguous reaction");
    matches.add(key);
    if (r.hazard) {
      if (!r.processConditionId)
        throw new Error("Hazard requires an explicit process condition");
      if (hazardIds.has(r.hazard.id)) throw new Error("Duplicate hazard ID");
      hazardIds.add(r.hazard.id);
      if (
        r.hazard.nameKey !== "hazard." + r.hazard.id + ".name" ||
        r.hazard.observationKey !==
          "hazard." + r.hazard.id + ".observation"
      )
        throw new Error("Localization key must match its hazard");
    }
    const capable = c.machines.filter(
      (m) =>
        m.role === "processor" &&
        m.operations.includes(r.operation) &&
        m.processConditionId === r.processConditionId,
    );
    if (!capable.length)
      throw new Error("Missing process condition capability");
    if (capable.some((m) => m.capacity < Math.max(r.inputAmount, r.outputAmount)))
      throw new Error("Reaction exceeds machine capacity");
    if (
      r.known &&
      (!c.materials.find((m) => m.id === r.input)?.known ||
        !c.materials.find((m) => m.id === r.output)?.known)
    )
      throw new Error("Known reaction references hidden material");
  }
  for (const m of c.machines) {
    if (m.unlock) {
      if (!c.reactions.some((r) => r.id === m.unlock!.reactionId))
        throw new Error("Missing machine unlock reaction");
      if (m.unlock.hintKey !== "machine." + m.id + ".unlock-hint")
        throw new Error("Localization key must match its machine unlock");
    }
    if (
      m.role === "processor" &&
      (!m.operations.length ||
        m.operations.some(
          (o) =>
            !operations.has(o) ||
            !c.reactions.some(
              (r) =>
                r.operation === o &&
                r.processConditionId === m.processConditionId,
            ),
        ))
    )
      throw new Error("Missing machine capability");
    if (
      m.role === "extractor" &&
      (m.operations.length || m.processConditionId !== undefined)
    )
      throw new Error("Extractor has no processing operation");
  }
  const regions = [c.site.terminal, ...c.site.deposits];
  for (const r of regions)
    if (r.x + r.width > c.site.width || r.y + r.height > c.site.height)
      throw new Error("Site entity outside map");
  for (let a = 0; a < regions.length; a++)
    for (let b = a + 1; b < regions.length; b++) {
      const x = regions[a],
        y = regions[b];
      if (
        x.x < y.x + y.width &&
        x.x + x.width > y.x &&
        x.y < y.y + y.height &&
        x.y + x.height > y.y
      )
        throw new Error("Overlapping site regions");
    }
  for (const d of c.site.deposits)
    if (!c.materials.find((m) => m.id === d.material)?.known)
      throw new Error("Deposit material must be known");
  const exchangeMaterials = new Set<string>();
  for (const listing of c.economy.exchange) {
    if (!materials.has(listing.materialId))
      throw new Error("Missing exchange material");
    if (exchangeMaterials.has(listing.materialId))
      throw new Error("Duplicate exchange material");
    exchangeMaterials.add(listing.materialId);
    if (listing.floorCompensation > listing.baseCompensation)
      throw new Error("Exchange floor exceeds base compensation");
  }
  const opportunityIds = new Set<string>(),
    directiveExperiments = new Set<string>();
  for (const order of c.economy.orders) {
    if (opportunityIds.has(order.id))
      throw new Error("Duplicate company opportunity ID");
    opportunityIds.add(order.id);
    if (!materials.has(order.materialId) || !exchangeMaterials.has(order.materialId))
      throw new Error("Corporate order requires an exchange material");
    if (
      order.nameKey !== "order." + order.id + ".name" ||
      order.briefKey !== "order." + order.id + ".brief"
    )
      throw new Error("Localization key must match its corporate order");
  }
  for (const directive of c.economy.directives) {
    if (opportunityIds.has(directive.id))
      throw new Error("Duplicate company opportunity ID");
    opportunityIds.add(directive.id);
    const experimentKey = [
      directive.operationId,
      directive.inputMaterialId,
      directive.processConditionId ?? "",
    ].join("/");
    if (directiveExperiments.has(experimentKey))
      throw new Error("Duplicate directive experiment");
    directiveExperiments.add(experimentKey);
    if (
      !materials.has(directive.inputMaterialId) ||
      !operations.has(directive.operationId)
    )
      throw new Error("Missing directive experiment reference");
    const reaction = c.reactions.find(
      (r) =>
        r.operation === directive.operationId &&
        r.input === directive.inputMaterialId &&
        r.processConditionId === directive.processConditionId,
    );
    if (!reaction)
      throw new Error("Directive experiment has no authored outcome");
    if (reaction.known)
      throw new Error("Directive experiment must target an unconfirmed outcome");
    const capable = c.machines.some(
      (m) =>
        m.role === "processor" &&
        m.operations.includes(directive.operationId) &&
        m.processConditionId === directive.processConditionId,
    );
    if (!capable)
      throw new Error("Directive experiment has no capable machine");
    if (
      directive.nameKey !== "directive." + directive.id + ".name" ||
      directive.briefKey !== "directive." + directive.id + ".brief"
    )
      throw new Error("Localization key must match its directive");
  }
  const capabilityIds = new Set<string>();
  for (const capability of c.economy.terminalCapabilities) {
    if (capabilityIds.has(capability.id))
      throw new Error("Duplicate terminal capability ID");
    capabilityIds.add(capability.id);
    if (capability.nameKey !== "terminal-capability." + capability.id + ".name")
      throw new Error("Localization key must match terminal capability");
  }

  const milestoneIds = new Set(c.economy.milestones.map((m) => m.id));
  if (milestoneIds.size !== c.economy.milestones.length)
    throw new Error("Duplicate milestone ID");
  const capabilityUnlocker = new Map<string, string>();
  for (const milestone of c.economy.milestones) {
    if (
      milestone.nameKey !== "milestone." + milestone.id + ".name" ||
      milestone.hintKey !== "milestone." + milestone.id + ".hint"
    )
      throw new Error("Localization key must match milestone");
    for (const capabilityId of milestone.unlockTerminalCapabilityIds) {
      if (!capabilityIds.has(capabilityId))
        throw new Error("Missing terminal capability unlock");
      if (capabilityUnlocker.has(capabilityId))
        throw new Error("Terminal capability has multiple milestone unlockers");
      capabilityUnlocker.set(capabilityId, milestone.id);
    }
    for (const requirement of milestone.requires) {
      if (
        (requirement.type === "reaction-confirmed" &&
          !c.reactions.some((r) => r.id === requirement.reactionId)) ||
        (requirement.type === "material-exported" &&
          !materials.has(requirement.materialId)) ||
        (requirement.type === "order-completed" &&
          !c.economy.orders.some((order) => order.id === requirement.orderId)) ||
        (requirement.type === "directive-completed" &&
          !c.economy.directives.some(
            (directive) => directive.id === requirement.directiveId,
          )) ||
        (requirement.type === "milestone-completed" &&
          !milestoneIds.has(requirement.milestoneId)) ||
        (requirement.type === "terminal-capability" &&
          !capabilityIds.has(requirement.capabilityId))
      )
        throw new Error("Missing milestone evidence reference");
    }
  }
  for (const listing of c.economy.exchange)
    if (
      listing.requiredTerminalCapabilityId &&
      !capabilityIds.has(listing.requiredTerminalCapabilityId)
    )
      throw new Error("Missing exchange terminal capability");

  const dependencies = (milestoneId: string) => {
    const milestone = c.economy.milestones.find((m) => m.id === milestoneId)!;
    return milestone.requires.flatMap((requirement) => {
      if (requirement.type === "milestone-completed")
        return [requirement.milestoneId];
      if (requirement.type === "terminal-capability") {
        const unlocker = capabilityUnlocker.get(requirement.capabilityId);
        return unlocker ? [unlocker] : [];
      }
      return [];
    });
  };
  const checked = new Set<string>();
  const visiting = new Set<string>();
  const visit = (milestoneId: string) => {
    if (visiting.has(milestoneId))
      throw new Error("Circular milestone dependency");
    if (checked.has(milestoneId)) return;
    visiting.add(milestoneId);
    for (const dependency of dependencies(milestoneId)) visit(dependency);
    visiting.delete(milestoneId);
    checked.add(milestoneId);
  };
  for (const milestone of c.economy.milestones) visit(milestone.id);

  const dependsOnBlockedExport = (
    milestoneId: string,
    materialId: string,
    seen = new Set<string>(),
  ): boolean => {
    if (seen.has(milestoneId)) return false;
    seen.add(milestoneId);
    const milestone = c.economy.milestones.find((m) => m.id === milestoneId)!;
    return milestone.requires.some((requirement) => {
      if (
        requirement.type === "material-exported" &&
        requirement.materialId === materialId
      )
        return true;
      if (requirement.type === "order-completed") {
        const order = c.economy.orders.find(
          (entry) => entry.id === requirement.orderId,
        );
        if (order?.materialId === materialId) return true;
      }
      if (requirement.type === "milestone-completed")
        return dependsOnBlockedExport(
          requirement.milestoneId,
          materialId,
          new Set(seen),
        );
      if (requirement.type === "terminal-capability") {
        const unlocker = capabilityUnlocker.get(requirement.capabilityId);
        return unlocker
          ? dependsOnBlockedExport(unlocker, materialId, new Set(seen))
          : false;
      }
      return false;
    });
  };
  for (const listing of c.economy.exchange) {
    const capabilityId = listing.requiredTerminalCapabilityId;
    if (!capabilityId) continue;
    const unlocker = capabilityUnlocker.get(capabilityId);
    if (!unlocker)
      throw new Error("Exchange terminal capability has no milestone unlock");
    if (dependsOnBlockedExport(unlocker, listing.materialId))
      throw new Error("Terminal handling unlock depends on blocked export");
  }

  if (
    c.economy.grant < Math.max(...c.machines.map((m) => m.fuel)) * 8 ||
    c.economy.assistanceBelow > c.economy.grant
  )
    throw new Error("Recovery grant cannot restart production");
  if (catalog) validateLocaleCoverage(c, catalog);
  // Keys are per-entity stable references, never shared aliases: borrowing
  // another entity's key would couple their display names forever.
  for (const m of c.materials)
    if (m.nameKey !== "material." + m.id + ".name")
      throw new Error(
        "Localization key must match its entity: " + m.nameKey,
      );
  for (const o of c.operations)
    if (o.nameKey !== "operation." + o.id + ".name")
      throw new Error(
        "Localization key must match its entity: " + o.nameKey,
      );
  for (const m of c.machines)
    if (m.nameKey !== "machine." + m.id + ".name")
      throw new Error(
        "Localization key must match its entity: " + m.nameKey,
      );
  for (const s of c.storages)
    if (s.nameKey !== "storage." + s.id + ".name")
      throw new Error(
        "Localization key must match its entity: " + s.nameKey,
      );
  for (const r of c.reactions)
    if (r.observationKey !== "reaction." + r.id + ".observation")
      throw new Error(
        "Localization key must match its entity: " + r.observationKey,
      );
  return c;
}

export function validateContent(
  input: unknown,
  catalog: Record<string, string> = enCatalog,
): Content {
  return validateContentInternal(input, catalog);
}

/**
 * Simulation owns gameplay truth, not locale-resource availability.
 * Callers that author dynamic content must validate their locale bundle at the
 * content boundary before handing the already-keyed content to sim-core.
 */
export function validateSimulationContent(input: unknown): Content {
  return validateContentInternal(input, null);
}
