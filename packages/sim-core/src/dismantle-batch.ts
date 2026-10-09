import type { Content } from "@site/content";
import { allDeposits } from "./deposits";
import { collectLedger } from "./ledger";
import { amount, type CommandResult, type DismantleBatchReport, type Save } from "./types";

type DismantleOne = (save: Save, id: string) => CommandResult;

const MAX_UNIQUE_TARGETS = 256;

/**
 * Classify canonical placed-entity IDs once, not positional record keys.
 * Order children and attached transport before ports and factory shells so
 * the existing single-dismantle guard makes each dependency decision.
 */
function removalPriorities(save: Save): Map<string, number> {
  const indexed = new Map<string, number>();
  const register = (items: Iterable<{ id: string }>, priority: number) => {
    for (const item of items) indexed.set(item.id, priority);
  };

  register(Object.values(save.belts), 0);
  register(Object.values(save.pipes), 0);
  register(Object.values(save.pressureLines), 0);
  register(Object.values(save.undergroundSolids), 0);
  register(Object.values(save.undergroundLiquids), 0);
  register(Object.values(save.elevatedSolids), 0);

  register(Object.values(save.machines), 1);
  register(Object.values(save.storages), 1);
  register(Object.values(save.pumps), 1);
  register(Object.values(save.tanks), 1);
  register(Object.values(save.compressors), 1);
  register(Object.values(save.pressureVessels), 1);

  for (const factory of Object.values(save.factories))
    register(factory.ports, 2);
  register(Object.values(save.factories), 3);
  return indexed;
}

function embodiedBuildMaterial(content: Content, save: Save): number {
  return (
    collectLedger(content, save).rows.find(
      (row) => row.material === content.site.buildMaterial,
    )?.embodied ?? 0
  );
}

/**
 * Authoritative bounded, deterministic best-effort batch.
 *
 * For a preview we clone ONCE, then run the exact same single-target apply
 * operations on the clone to handle dynamic factory/port dependencies.
 * For a commit, the operations apply to the current authoritative save.
 * Neither mode trusts an earlier preview or bypasses single-target rules.
 */
export function dismantleBatch(
  content: Content,
  save: Save,
  ids: readonly string[],
  apply: boolean,
  dismantleOne: DismantleOne,
): CommandResult {
  const distinct = new Set(ids);
  if (distinct.size > MAX_UNIQUE_TARGETS)
    return {
      ok: false,
      message: `Select at most ${MAX_UNIQUE_TARGETS} unique structures`,
    };

  const stage = apply ? save : structuredClone(save);
  const priorities = removalPriorities(stage);
  const protectedIds = new Set([
    "terminal",
    ...allDeposits(content).map((deposit) => deposit.id),
  ]);
  const ignored: DismantleBatchReport["ignored"] = [];
  const blocked: DismantleBatchReport["blocked"] = [];
  const removed: string[] = [];

  const occurrences = new Map<string, number>();
  for (const id of ids) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
  for (const [id, count] of [...occurrences].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    for (let duplicate = 1; duplicate < count; duplicate++)
      ignored.push({ id, reason: "Duplicate selected ID" });
  }

  const ordered = [...distinct].sort(
    (a, b) =>
      (priorities.get(a) ?? 4) - (priorities.get(b) ?? 4) ||
      a.localeCompare(b),
  );
  const beforeStock = amount(stage.stock, content.site.buildMaterial);
  const beforeEmbodied = embodiedBuildMaterial(content, stage);

  for (const id of ordered) {
    if (protectedIds.has(id)) {
      ignored.push({ id, reason: "Protected site resource" });
      continue;
    }
    if (!priorities.has(id)) {
      ignored.push({ id, reason: "Unknown or stale structure ID" });
      continue;
    }
    // The existing single-target command is the ONLY demolition authority.
    const result = dismantleOne(stage, id);
    if (result.ok) removed.push(id);
    else blocked.push({ id, reason: result.message });
  }

  const afterStock = amount(stage.stock, content.site.buildMaterial);
  const reclaimedStructureMaterial =
    beforeEmbodied - embodiedBuildMaterial(content, stage);
  const netBuildStockDelta = afterStock - beforeStock;
  const report: DismantleBatchReport = {
    selectedCount: ids.length,
    uniqueCount: distinct.size,
    duplicateCount: ids.length - distinct.size,
    removed,
    blocked,
    ignored,
    reclaimedStructureMaterial,
    retrievedCargo: netBuildStockDelta - reclaimedStructureMaterial,
    netBuildStockDelta,
  };

  return {
    ok: true,
    message: blocked.length
      ? `Removed ${removed.length}; ${blocked.length} protected or blocked`
      : `Removed ${removed.length} structure(s)`,
    batch: report,
  };
}
