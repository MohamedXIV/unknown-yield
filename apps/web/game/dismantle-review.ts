import type {
  CommandResult,
  GameCommand,
  PlayerSnapshot,
} from "@site/sim-core";
import {
  dismantleEntityGeometry,
  dismantleEntityStateFingerprint,
  selectDismantleCandidates,
  type DismantleSelectionRequest,
} from "./dismantle-selection";

const MAX_AREA_TARGETS = 256;

export type DismantleReviewItem = {
  id: string;
  status: "selected" | "blocked" | "ignored";
  reason?: string;
  footprint?: { x: number; y: number; width: number; height: number };
  routeEndpoints?: readonly [{ x: number; y: number }, { x: number; y: number }];
};

export type DismantleAreaReview = {
  request: DismantleSelectionRequest;
  area: { x: number; y: number; width: number; height: number } | null;
  candidateIds: string[];
  candidateCount: number;
  selectedCount: number;
  blockedCount: number;
  ignoredCount: number;
  reclaimedStructureMaterial: number;
  retrievedCargo: number;
  netBuildStockDelta: number;
  invalidAnchorReason: string | null;
  error: string | null;
  items: DismantleReviewItem[];
  stateFingerprint: string;
  canConfirm: boolean;
};

/**
 * UI preflight only. `dismantleMany` remains the sole authority for safety,
 * dependencies and material recovery, both here and at commit time.
 */
export function previewDismantleArea(
  snapshot: PlayerSnapshot,
  request: DismantleSelectionRequest,
  preview: (command: GameCommand) => CommandResult,
): DismantleAreaReview {
  const selection = selectDismantleCandidates(snapshot, request);
  const candidateIds = selection.candidates.map(({ id }) => id);
  const item = (
    id: string,
    status: DismantleReviewItem["status"],
    reason?: string,
  ): DismantleReviewItem => {
    const geometry = dismantleEntityGeometry(snapshot, id);
    return {
      id,
      status,
      ...(reason ? { reason } : {}),
      ...(geometry
        ? {
            footprint: { ...geometry.footprint },
            ...(geometry.routeEndpoints
              ? { routeEndpoints: geometry.routeEndpoints }
              : {}),
          }
        : {}),
    };
  };

  if (selection.invalidAnchorReason || !selection.area) {
    return {
      request: { ...request },
      area: selection.area,
      candidateIds: [],
      candidateCount: 0,
      selectedCount: 0,
      blockedCount: 0,
      ignoredCount: selection.ignored.length,
      reclaimedStructureMaterial: 0,
      retrievedCargo: 0,
      netBuildStockDelta: 0,
      invalidAnchorReason: selection.invalidAnchorReason,
      error: null,
      items: selection.ignored.map(({ id, reason }) => item(id, "ignored", reason)),
      stateFingerprint: dismantleEntityStateFingerprint(snapshot, selection.ignored.map(({ id }) => id)),
      canConfirm: false,
    };
  }

  if (candidateIds.length > MAX_AREA_TARGETS) {
    return {
      request: { ...request },
      area: selection.area,
      candidateIds,
      candidateCount: candidateIds.length,
      selectedCount: 0,
      blockedCount: candidateIds.length,
      ignoredCount: selection.ignored.length,
      reclaimedStructureMaterial: 0,
      retrievedCargo: 0,
      netBuildStockDelta: 0,
      invalidAnchorReason: null,
      error: `Select at most ${MAX_AREA_TARGETS} structures`,
      items: [
        ...selection.candidates.map(({ id }) => item(id, "blocked", "selection-limit")),
        ...selection.ignored.map(({ id, reason }) => item(id, "ignored", reason)),
      ],
      stateFingerprint: dismantleEntityStateFingerprint(snapshot, [
        ...candidateIds,
        ...selection.ignored.map(({ id }) => id),
      ]),
      canConfirm: false,
    };
  }

  const result = preview({ type: "dismantleMany", ids: candidateIds });
  const batch = result.batch;
  if (!result.ok || !batch) {
    return {
      request: { ...request },
      area: selection.area,
      candidateIds,
      candidateCount: candidateIds.length,
      selectedCount: 0,
      blockedCount: candidateIds.length,
      ignoredCount: selection.ignored.length,
      reclaimedStructureMaterial: 0,
      retrievedCargo: 0,
      netBuildStockDelta: 0,
      invalidAnchorReason: null,
      error: result.message,
      items: [
        ...selection.candidates.map(({ id }) => item(id, "blocked", result.message)),
        ...selection.ignored.map(({ id, reason }) => item(id, "ignored", reason)),
      ],
      stateFingerprint: dismantleEntityStateFingerprint(snapshot, [
        ...candidateIds,
        ...selection.ignored.map(({ id }) => id),
      ]),
      canConfirm: false,
    };
  }

  const removed = new Set(batch.removed);
  const blocked = new Map(batch.blocked.map(({ id, reason }) => [id, reason]));
  const backendIgnored = new Map(batch.ignored.map(({ id, reason }) => [id, reason]));
  const candidateItems = selection.candidates.map(({ id }) =>
    removed.has(id)
      ? item(id, "selected")
      : blocked.has(id)
        ? item(id, "blocked", blocked.get(id))
        : item(id, "ignored", backendIgnored.get(id) ?? "stale-structure"),
  );
  const ignoredItems = selection.ignored.map(({ id, reason }) => item(id, "ignored", reason));
  const extraIgnored = batch.ignored
    .filter(({ id }) => !selection.ignored.some((entry) => entry.id === id) && !candidateIds.includes(id))
    .map(({ id, reason }) => item(id, "ignored", reason));
  const items = [...candidateItems, ...ignoredItems, ...extraIgnored];
  const ignoredCount = items.filter(({ status }) => status === "ignored").length;
  return {
    request: { ...request },
    area: selection.area,
    candidateIds,
    candidateCount: candidateIds.length,
    selectedCount: batch.removed.length,
    blockedCount: batch.blocked.length,
    ignoredCount,
    reclaimedStructureMaterial: batch.reclaimedStructureMaterial,
    retrievedCargo: batch.retrievedCargo,
    netBuildStockDelta: batch.netBuildStockDelta,
    invalidAnchorReason: null,
    error: null,
    items,
    stateFingerprint: dismantleEntityStateFingerprint(snapshot, items.map(({ id }) => id)),
    canConfirm: batch.removed.length > 0,
  };
}

/** Exact-head confirm guard: changed geometry, blockers, stock return, or IDs need a fresh click. */
export function sameDismantleAreaReview(
  shown: DismantleAreaReview,
  current: DismantleAreaReview,
): boolean {
  return JSON.stringify(shown) === JSON.stringify(current);
}
