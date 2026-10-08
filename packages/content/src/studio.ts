import { createStore, type Store } from "tinybase";
import { enCatalog, localeCatalogSchema, type LocaleCatalog } from "./locale";
import { validateContent, type Content } from "./schema";

import { STUDIO_BUNDLE_SCHEMA_VERSION, type StudioBundle } from "./bundle";
export { parseStudioBundle, STUDIO_BUNDLE_SCHEMA_VERSION, type StudioBundle } from "./bundle";

export type StudioEntityKind =
  | "deposit"
  | "material"
  | "operation"
  | "machine"
  | "reaction"
  | "exchange"
  | "import"
  | "order"
  | "property-directive";

export type StudioReference = {
  targetType: StudioEntityKind;
  targetId: string;
  sourceType:
    | "reaction"
    | "machine"
    | "site"
    | "deposit"
    | "atmospheric-source"
    | "exchange"
    | "import"
    | "order"
    | "property-directive";
  sourceId: string;
  field: string;
};

type StudioTable =
  | "deposits"
  | "materials"
  | "operations"
  | "machines"
  | "reactions"
  | "exchange"
  | "imports"
  | "orders"
  | "propertyDirectives";

const entityTable: Record<StudioEntityKind, StudioTable> = {
  deposit: "deposits",
  material: "materials",
  operation: "operations",
  machine: "machines",
  reaction: "reactions",
  exchange: "exchange",
  import: "imports",
  order: "orders",
  "property-directive": "propertyDirectives",
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

const exchangeRow = (listing: Content["economy"]["exchange"][number]) => ({
  baseCompensation: listing.baseCompensation,
  floorCompensation: listing.floorCompensation,
  baseDemandBps: listing.baseDemandBps,
  saturationPerUnitBps: listing.saturationPerUnitBps,
  recoveryPerMarketTickBps: listing.recoveryPerMarketTickBps,
  demandRecoveryPerMarketTickBps: listing.demandRecoveryPerMarketTickBps,
  requiredTerminalCapabilityId: empty(listing.requiredTerminalCapabilityId),
});

const importRow = (supply: Content["economy"]["imports"][number]) => ({
  nameKey: supply.nameKey,
  briefKey: supply.briefKey,
  materialId: supply.materialId,
  quantity: supply.quantity,
  fuelCost: supply.fuelCost,
  terminalModuleId: empty(supply.terminalModuleId),
  requiredOpportunityId: empty(supply.requiredOpportunityId),
});

const orderRow = (order: Content["economy"]["orders"][number]) => ({
  nameKey: order.nameKey,
  briefKey: order.briefKey,
  materialId: order.materialId,
  quantity: order.quantity,
  durationTicks: order.durationTicks,
  rewardFuel: order.rewardFuel,
});

const propertyDirectiveRow = (
  directive: Content["economy"]["propertyDirectives"][number],
) => ({
  nameKey: directive.nameKey,
  briefKey: directive.briefKey,
  propertyKey: directive.propertyKey,
  targetMaterialId: directive.targetMaterialId,
  solutionReactionIdsJson: JSON.stringify(directive.solutionReactionIds),
  durationTicks: directive.durationTicks,
  rewardFuel: directive.rewardFuel,
  rewardImportSupplyId: empty(directive.rewardImportSupplyId),
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
      "deposits",
      Object.fromEntries(content.site.deposits.map(({ id, ...row }) => [id, row])),
    )
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
      "exchange",
      Object.fromEntries(
        content.economy.exchange.map((row) => [
          row.materialId,
          exchangeRow(row),
        ]),
      ),
    )
    .setTable(
      "imports",
      Object.fromEntries(
        content.economy.imports.map((row) => [row.id, importRow(row)]),
      ),
    )
    .setTable(
      "orders",
      Object.fromEntries(
        content.economy.orders.map((row) => [row.id, orderRow(row)]),
      ),
    )
    .setTable(
      "propertyDirectives",
      Object.fromEntries(
        content.economy.propertyDirectives.map((row) => [
          row.id,
          propertyDirectiveRow(row),
        ]),
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

function parseStringArray(
  source: string,
  label: string,
  field: string,
): string[] {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error(label + " " + field + " must be valid JSON");
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    throw new Error(label + " " + field + " must be a JSON string array");
  return value;
}

function parseOperations(
  row: Record<string, unknown>,
  label: string,
): string[] {
  return parseStringArray(
    stringCell(row, "operationsJson", label),
    label,
    "operations",
  );
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

  const deposits = orderedIds(
    store,
    "deposits",
    base.site.deposits.map((deposit) => deposit.id),
  ).map((id) => {
    const row = rawRow(store, "deposits", id),
      label = "Surface deposit " + id;
    return {
      id,
      material: stringCell(row, "material", label),
      x: numberCell(row, "x", label),
      y: numberCell(row, "y", label),
      width: numberCell(row, "width", label),
      height: numberCell(row, "height", label),
      units: numberCell(row, "units", label),
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

  const exchange = orderedIds(
    store,
    "exchange",
    base.economy.exchange.map((row) => row.materialId),
  ).map((materialId) => {
    const row = rawRow(store, "exchange", materialId),
      label = "Exchange listing " + materialId;
    return {
      materialId,
      baseCompensation: numberCell(row, "baseCompensation", label),
      floorCompensation: numberCell(row, "floorCompensation", label),
      baseDemandBps: numberCell(row, "baseDemandBps", label),
      saturationPerUnitBps: numberCell(row, "saturationPerUnitBps", label),
      recoveryPerMarketTickBps: numberCell(
        row,
        "recoveryPerMarketTickBps",
        label,
      ),
      demandRecoveryPerMarketTickBps: numberCell(
        row,
        "demandRecoveryPerMarketTickBps",
        label,
      ),
      ...(optionalText(row, "requiredTerminalCapabilityId", label)
        ? {
            requiredTerminalCapabilityId: optionalText(
              row,
              "requiredTerminalCapabilityId",
              label,
            ),
          }
        : {}),
    };
  });

  const imports = orderedIds(
    store,
    "imports",
    base.economy.imports.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "imports", id),
      label = "Import " + id;
    return {
      id,
      nameKey: stringCell(row, "nameKey", label),
      briefKey: stringCell(row, "briefKey", label),
      materialId: stringCell(row, "materialId", label),
      quantity: numberCell(row, "quantity", label),
      fuelCost: numberCell(row, "fuelCost", label),
      ...(optionalText(row, "terminalModuleId", label)
        ? { terminalModuleId: optionalText(row, "terminalModuleId", label) }
        : {}),
      ...(optionalText(row, "requiredOpportunityId", label)
        ? {
            requiredOpportunityId: optionalText(
              row,
              "requiredOpportunityId",
              label,
            ),
          }
        : {}),
    };
  });

  const orders = orderedIds(
    store,
    "orders",
    base.economy.orders.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "orders", id),
      label = "Order " + id;
    return {
      id,
      nameKey: stringCell(row, "nameKey", label),
      briefKey: stringCell(row, "briefKey", label),
      materialId: stringCell(row, "materialId", label),
      quantity: numberCell(row, "quantity", label),
      durationTicks: numberCell(row, "durationTicks", label),
      rewardFuel: numberCell(row, "rewardFuel", label),
    };
  });

  const propertyDirectives = orderedIds(
    store,
    "propertyDirectives",
    base.economy.propertyDirectives.map((row) => row.id),
  ).map((id) => {
    const row = rawRow(store, "propertyDirectives", id),
      label = "Property directive " + id;
    return {
      id,
      nameKey: stringCell(row, "nameKey", label),
      briefKey: stringCell(row, "briefKey", label),
      propertyKey: stringCell(row, "propertyKey", label),
      targetMaterialId: stringCell(row, "targetMaterialId", label),
      solutionReactionIds: parseStringArray(
        stringCell(row, "solutionReactionIdsJson", label),
        label,
        "solution reactions",
      ),
      durationTicks: numberCell(row, "durationTicks", label),
      rewardFuel: numberCell(row, "rewardFuel", label),
      ...(optionalText(row, "rewardImportSupplyId", label)
        ? {
            rewardImportSupplyId: optionalText(
              row,
              "rewardImportSupplyId",
              label,
            ),
          }
        : {}),
    };
  });

  return {
    ...base,
    version: stringCell(meta, "version", "Content metadata"),
    tickMs: numberCell(meta, "tickMs", "Content metadata"),
    site: { ...base.site, deposits },
    materials,
    operations,
    machines,
    reactions,
    economy: {
      ...base.economy,
      imports,
      exchange,
      orders,
      propertyDirectives,
    },
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
    if (content.economy.exchange.some((entry) => entry.materialId === targetId))
      push("exchange", targetId, "materialId");
    for (const supply of content.economy.imports)
      if (supply.materialId === targetId)
        push("import", supply.id, "materialId");
    for (const order of content.economy.orders)
      if (order.materialId === targetId)
        push("order", order.id, "materialId");
    for (const directive of content.economy.propertyDirectives)
      if (directive.targetMaterialId === targetId)
        push("property-directive", directive.id, "targetMaterialId");
  }

  if (targetType === "operation") {
    for (const machine of content.machines)
      if (machine.operations.includes(targetId))
        push("machine", machine.id, "operations");
    for (const reaction of content.reactions)
      if (reaction.operation === targetId)
        push("reaction", reaction.id, "operation");
  }

  if (targetType === "reaction") {
    for (const machine of content.machines)
      if (
        machine.unlock &&
        "reactionId" in machine.unlock &&
        machine.unlock.reactionId === targetId
      )
        push("machine", machine.id, "unlock.reactionId");
    for (const directive of content.economy.propertyDirectives)
      if (directive.solutionReactionIds.includes(targetId))
        push(
          "property-directive",
          directive.id,
          "solutionReactionIds",
        );
  }

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
