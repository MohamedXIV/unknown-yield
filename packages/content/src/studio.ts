import { createStore, type Store } from "tinybase";
import { enCatalog, localeCatalogSchema, type LocaleCatalog } from "./locale";
import { validateContent, type Content } from "./schema";

export const STUDIO_BUNDLE_SCHEMA_VERSION = 1 as const;

export type StudioBundle = {
  schemaVersion: typeof STUDIO_BUNDLE_SCHEMA_VERSION;
  content: Content;
  locale: LocaleCatalog;
};

export type StudioEntityKind =
  "material" | "operation" | "machine" | "reaction";

export type StudioReference = {
  targetType: StudioEntityKind;
  targetId: string;
  sourceType:
    | "reaction"
    | "machine"
    | "site"
    | "deposit"
    | "atmospheric-source";
  sourceId: string;
  field: string;
};

type StudioTable = "materials" | "operations" | "machines" | "reactions";

const entityTable: Record<StudioEntityKind, StudioTable> = {
  material: "materials",
  operation: "operations",
  machine: "machines",
  reaction: "reactions",
};

const sortedEntries = <T>(record: Record<string, T>) =>
  Object.entries(record).sort(([a], [b]) => a.localeCompare(b));

const empty = (value: string | undefined) => value ?? "";

const machineRow = (machine: Content["machines"][number]) => ({
  nameKey: machine.nameKey,
  role: machine.role,
  maxExtractionDepth: machine.maxExtractionDepth,
  sourceKind: empty(machine.sourceKind),
  processConditionId: empty(machine.processConditionId),
  fuelClassId: empty(machine.fuelClassId),
  unlockReactionId: empty(
    machine.unlock && "reactionId" in machine.unlock
      ? machine.unlock.reactionId
      : undefined,
  ),
  unlockHazardEvidenceId: empty(
    machine.unlock && "hazardEvidenceId" in machine.unlock
      ? machine.unlock.hazardEvidenceId
      : undefined,
  ),
  unlockHintKey: empty(machine.unlock?.hintKey),
  operationsJson: JSON.stringify(machine.operations),
  inputContainmentJson: JSON.stringify(machine.inputContainment),
  outputContainmentJson: JSON.stringify(machine.outputContainment),
  inputStatesJson: JSON.stringify(machine.inputStates),
  outputStatesJson: JSON.stringify(machine.outputStates),
  capacity: machine.capacity,
  fuel: machine.fuel,
  durationTicks: machine.durationTicks,
  width: machine.width,
  height: machine.height,
  cost: machine.cost,
});

const reactionRow = (reaction: Content["reactions"][number]) => ({
  operation: reaction.operation,
  processConditionId: empty(reaction.processConditionId),
  input: reaction.input,
  inputAmount: reaction.inputAmount,
  output: reaction.output,
  outputAmount: reaction.outputAmount,
  observationKey: reaction.observationKey,
  hazardId: empty(reaction.hazard?.id),
  hazardClassId: empty(reaction.hazard?.classId),
  hazardNameKey: empty(reaction.hazard?.nameKey),
  hazardObservationKey: empty(reaction.hazard?.observationKey),
  hazardSaferHintKey: empty(reaction.hazard?.saferHintKey),
  known: reaction.known,
});

export function createContentStore(
  content: Content,
  catalog: LocaleCatalog = enCatalog,
): Store {
  return createStore()
    .setTable("meta", {
      content: {
        version: content.version,
        tickMs: content.tickMs,
      },
    })
    .setTable(
      "materials",
      Object.fromEntries(
        content.materials.map(({ id, requiredContainment, ...row }) => [
          id,
          {
            ...row,
            requiredContainmentJson: JSON.stringify(requiredContainment),
          },
        ]),
      ),
    )
    .setTable(
      "operations",
      Object.fromEntries(content.operations.map(({ id, ...row }) => [id, row])),
    )
    .setTable(
      "machines",
      Object.fromEntries(
        content.machines.map((row) => [row.id, machineRow(row)]),
      ),
    )
    .setTable(
      "reactions",
      Object.fromEntries(
        content.reactions.map((row) => [row.id, reactionRow(row)]),
      ),
    )
    .setTable(
      "locale",
      Object.fromEntries(
        sortedEntries(catalog).map(([key, text]) => [key, { text }]),
      ),
    );
}

function rawRow(store: Store, table: string, id: string) {
  return store.getRow(table, id) as Record<string, unknown>;
}

function required(row: Record<string, unknown>, key: string, label: string) {
  const value = row[key];
  if (value === undefined) throw new Error(label + " is missing " + key);
  return value;
}

function stringCell(row: Record<string, unknown>, key: string, label: string) {
  const value = required(row, key, label);
  if (typeof value !== "string")
    throw new Error(label + " " + key + " must be text");
  return value;
}

function numberCell(row: Record<string, unknown>, key: string, label: string) {
  const value = required(row, key, label);
  if (typeof value !== "number")
    throw new Error(label + " " + key + " must be a number");
  return value;
}

function booleanCell(row: Record<string, unknown>, key: string, label: string) {
  const value = required(row, key, label);
  if (typeof value !== "boolean")
    throw new Error(label + " " + key + " must be true/false");
  return value;
}

function optionalText(
  row: Record<string, unknown>,
  key: string,
  label: string,
) {
  const value = stringCell(row, key, label).trim();
  return value || undefined;
}

function parseOperations(
  row: Record<string, unknown>,
  label: string,
): string[] {
  const source = stringCell(row, "operationsJson", label);
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error(label + " operations must be valid JSON");
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    throw new Error(label + " operations must be a JSON string array");
  return value;
}

function orderedIds(
  store: Store,
  table: StudioTable,
  baseIds: string[],
): string[] {
  const current = Object.keys(store.getTable(table)),
    present = new Set(current),
    base = baseIds.filter((id) => present.has(id)),
    known = new Set(base);
  return [
    ...base,
    ...current
      .filter((id) => !known.has(id))
      .sort((a, b) => a.localeCompare(b)),
  ];
}

function candidateFromStore(store: Store, base: Content): unknown {
  const meta = rawRow(store, "meta", "content");

  const materials = orderedIds(
    store,
    "materials",
    base.materials.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "materials", id),
      label = "Material " + id;
    return {
      id,
      nameKey: stringCell(row, "nameKey", label),
      color: stringCell(row, "color", label),
      known: booleanCell(row, "known", label),
      handlingState: row.handlingState ?? "solid",
      requiredContainment: parseOperations(
        { operationsJson: row.requiredContainmentJson ?? "[]" },
        label + " containment",
      ),
    };
  });

  const operations = orderedIds(
    store,
    "operations",
    base.operations.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "operations", id),
      label = "Operation " + id;
    return {
      id,
      nameKey: stringCell(row, "nameKey", label),
    };
  });

  const machines = orderedIds(
    store,
    "machines",
    base.machines.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "machines", id),
      label = "Machine " + id,
      unlockReactionId = optionalText(
        { unlockReactionId: row.unlockReactionId ?? "" },
        "unlockReactionId",
        label,
      ),
      unlockHazardEvidenceId = optionalText(
        { unlockHazardEvidenceId: row.unlockHazardEvidenceId ?? "" },
        "unlockHazardEvidenceId",
        label,
      ),
      unlockHintKey = optionalText(
        { unlockHintKey: row.unlockHintKey ?? "" },
        "unlockHintKey",
        label,
      );
    if (unlockReactionId && unlockHazardEvidenceId)
      throw new Error(label + " has multiple unlock evidence sources");
    return {
      id,
      nameKey: stringCell(row, "nameKey", label),
      role: stringCell(row, "role", label),
      maxExtractionDepth: numberCell(
        { maxExtractionDepth: row.maxExtractionDepth ?? 0 },
        "maxExtractionDepth",
        label,
      ),
      ...(optionalText(
        { sourceKind: row.sourceKind ?? "" },
        "sourceKind",
        label,
      )
        ? {
            sourceKind: optionalText(
              { sourceKind: row.sourceKind ?? "" },
              "sourceKind",
              label,
            ),
          }
        : {}),
      ...(optionalText(row, "processConditionId", label)
        ? { processConditionId: optionalText(row, "processConditionId", label) }
        : {}),
      ...(optionalText(
        { fuelClassId: row.fuelClassId ?? "" },
        "fuelClassId",
        label,
      )
        ? {
            fuelClassId: optionalText(
              { fuelClassId: row.fuelClassId ?? "" },
              "fuelClassId",
              label,
            ),
          }
        : {}),
      ...(unlockReactionId || unlockHazardEvidenceId || unlockHintKey
        ? {
            unlock: unlockHazardEvidenceId
              ? {
                  hazardEvidenceId: unlockHazardEvidenceId,
                  hintKey: unlockHintKey ?? "",
                }
              : {
                  reactionId: unlockReactionId ?? "",
                  hintKey: unlockHintKey ?? "",
                },
          }
        : {}),
      operations: parseOperations(row, label),
      inputContainment: parseOperations(
        { operationsJson: row.inputContainmentJson ?? "[]" },
        label + " input containment",
      ),
      outputContainment: parseOperations(
        { operationsJson: row.outputContainmentJson ?? "[]" },
        label + " output containment",
      ),
      inputStates: parseOperations(
        { operationsJson: row.inputStatesJson ?? '["solid"]' },
        label + " inputStates",
      ),
      outputStates: parseOperations(
        { operationsJson: row.outputStatesJson ?? '["solid"]' },
        label + " outputStates",
      ),
      capacity: numberCell(row, "capacity", label),
      fuel: numberCell(row, "fuel", label),
      durationTicks: numberCell(row, "durationTicks", label),
      width: numberCell(row, "width", label),
      height: numberCell(row, "height", label),
      cost: numberCell(row, "cost", label),
    };
  });

  const reactions = orderedIds(
    store,
    "reactions",
    base.reactions.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "reactions", id),
      label = "Reaction " + id,
      hazardId = optionalText(row, "hazardId", label),
      hazardClassId = optionalText(
        { hazardClassId: row.hazardClassId ?? "" },
        "hazardClassId",
        label,
      ),
      hazardNameKey = optionalText(row, "hazardNameKey", label),
      hazardObservationKey = optionalText(row, "hazardObservationKey", label),
      hazardSaferHintKey = optionalText(
        { hazardSaferHintKey: row.hazardSaferHintKey ?? "" },
        "hazardSaferHintKey",
        label,
      );
    return {
      id,
      operation: stringCell(row, "operation", label),
      ...(optionalText(row, "processConditionId", label)
        ? { processConditionId: optionalText(row, "processConditionId", label) }
        : {}),
      input: stringCell(row, "input", label),
      inputAmount: numberCell(row, "inputAmount", label),
      output: stringCell(row, "output", label),
      outputAmount: numberCell(row, "outputAmount", label),
      observationKey: stringCell(row, "observationKey", label),
      ...(
        hazardId ||
        hazardClassId ||
        hazardNameKey ||
        hazardObservationKey ||
        hazardSaferHintKey
          ? {
              hazard: {
                id: hazardId ?? "",
                classId: hazardClassId ?? "",
                nameKey: hazardNameKey ?? "",
                observationKey: hazardObservationKey ?? "",
                saferHintKey: hazardSaferHintKey ?? "",
              },
            }
          : {}
      ),
      known: booleanCell(row, "known", label),
    };
  });

  return {
    ...base,
    version: stringCell(meta, "version", "Content metadata"),
    tickMs: numberCell(meta, "tickMs", "Content metadata"),
    materials,
    operations,
    machines,
    reactions,
  };
}

export function catalogFromStore(store: Store): LocaleCatalog {
  const catalog = Object.fromEntries(
    sortedEntries(store.getTable("locale")).map(([key, row]) => {
      const text = (row as Record<string, unknown>).text;
      if (typeof text !== "string" || !text.length)
        throw new Error("Locale " + key + " must contain non-empty text");
      return [key, text];
    }),
  );
  return localeCatalogSchema.parse(catalog);
}

export function studioBundleFromStore(
  store: Store,
  base: Content,
): StudioBundle {
  const locale = catalogFromStore(store),
    content = validateContent(candidateFromStore(store, base), locale);
  return {
    schemaVersion: STUDIO_BUNDLE_SCHEMA_VERSION,
    content,
    locale,
  };
}

export function contentFromStore(store: Store, base: Content): Content {
  return studioBundleFromStore(store, base).content;
}

export function serializeStudioBundle(store: Store, base: Content): string {
  return JSON.stringify(studioBundleFromStore(store, base));
}

export function parseStudioBundle(input: unknown): StudioBundle {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new Error("Studio bundle is not valid JSON");
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Studio bundle must be an object");

  const record = value as Record<string, unknown>,
    keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "content" ||
    keys[1] !== "locale" ||
    keys[2] !== "schemaVersion"
  )
    throw new Error("Studio bundle has unknown or missing fields");
  if (record.schemaVersion !== STUDIO_BUNDLE_SCHEMA_VERSION)
    throw new Error("Unsupported Studio bundle schema");

  const locale = localeCatalogSchema.parse(record.locale),
    content = validateContent(record.content, locale);
  return {
    schemaVersion: STUDIO_BUNDLE_SCHEMA_VERSION,
    content,
    locale,
  };
}

export function referencesTo(
  content: Content,
  targetType: StudioEntityKind,
  targetId: string,
): StudioReference[] {
  const refs: StudioReference[] = [],
    push = (
      sourceType: StudioReference["sourceType"],
      sourceId: string,
      field: string,
    ) =>
      refs.push({
        targetType,
        targetId,
        sourceType,
        sourceId,
        field,
      });

  if (targetType === "material") {
    if (content.site.buildMaterial === targetId)
      push("site", "site", "buildMaterial");
    for (const deposit of content.site.deposits)
      if (deposit.material === targetId)
        push("deposit", deposit.id, "material");
    for (const source of content.site.atmosphericSources)
      if (source.material === targetId)
        push("atmospheric-source", source.id, "material");
    for (const reaction of content.reactions) {
      if (reaction.input === targetId) push("reaction", reaction.id, "input");
      if (reaction.output === targetId) push("reaction", reaction.id, "output");
    }
  }

  if (targetType === "operation") {
    for (const machine of content.machines)
      if (machine.operations.includes(targetId))
        push("machine", machine.id, "operations");
    for (const reaction of content.reactions)
      if (reaction.operation === targetId)
        push("reaction", reaction.id, "operation");
  }

  if (targetType === "reaction")
    for (const machine of content.machines)
      if (
        machine.unlock &&
        "reactionId" in machine.unlock &&
        machine.unlock.reactionId === targetId
      )
        push("machine", machine.id, "unlock.reactionId");

  return refs.sort(
    (a, b) =>
      a.sourceType.localeCompare(b.sourceType) ||
      a.sourceId.localeCompare(b.sourceId) ||
      a.field.localeCompare(b.field),
  );
}

export function hasStudioEntity(
  store: Store,
  type: StudioEntityKind,
  id: string,
): boolean {
  return store.hasRow(entityTable[type], id);
}
