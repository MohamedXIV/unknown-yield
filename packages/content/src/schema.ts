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
        exportValue: count,
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
