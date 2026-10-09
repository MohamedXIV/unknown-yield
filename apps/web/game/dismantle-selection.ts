import type { PlayerSnapshot, Point, Rect } from "@site/sim-core";

export type DismantleFamily =
  | "transport-lines"
  | "transport-routes"
  | "production-machines"
  | "storage-containment"
  | "transfer-devices"
  | "factory-infrastructure";

export type DismantleEntity = {
  id: string;
  exactType: string;
  family: DismantleFamily;
  footprint: Rect;
  routeEndpoints?: readonly [Point, Point];
  factoryId: string | null;
};

export type DismantleEntityClassification =
  | { kind: "player-built"; entity: DismantleEntity }
  | {
      kind: "protected";
      id: string;
      reason: "terminal" | "deposit" | "atmospheric-source";
    }
  | { kind: "unknown"; id: string; reason: "unknown-id" | "ambiguous-id" };

export type DismantleSelectionMode =
  | "single"
  | "area-all"
  | "area-exact"
  | "area-family";

export type DismantleSelectionRequest = {
  mode: DismantleSelectionMode;
  from?: Point;
  to?: Point;
  anchorId?: string | null;
  openFactoryIds?: readonly string[];
};

export type DismantleSelectionResult = {
  mode: DismantleSelectionMode;
  area: Rect | null;
  anchor: DismantleEntity | null;
  invalidAnchorReason: string | null;
  candidates: DismantleEntity[];
  ignored: { id: string; reason: string }[];
};

type RawPlayerEntity = {
  id: string;
  exactType: string;
  family: DismantleFamily;
  footprint: Rect;
  routeEndpoints?: readonly [Point, Point];
  factoryId: string | null;
};

type ProtectedEntity = {
  id: string;
  reason: "terminal" | "deposit" | "atmospheric-source";
  footprint: Rect;
};

type InternalClassification =
  | { kind: "player-built"; entity: RawPlayerEntity }
  | { kind: "protected"; entity: ProtectedEntity }
  | { kind: "unknown"; reason: "unknown-id" | "ambiguous-id" };

function rect(x: number, y: number, width = 1, height = 1): Rect {
  return { x, y, width, height };
}

function route(
  id: string,
  exactType: string,
  entry: Point,
  exit: Point,
): RawPlayerEntity {
  return {
    id,
    exactType,
    family: "transport-routes",
    footprint: rect(
      Math.min(entry.x, exit.x),
      Math.min(entry.y, exit.y),
      Math.abs(entry.x - exit.x) + 1,
      Math.abs(entry.y - exit.y) + 1,
    ),
    routeEndpoints: [
      { x: entry.x, y: entry.y },
      { x: exit.x, y: exit.y },
    ],
    factoryId: null,
  };
}

function playerEntities(snapshot: PlayerSnapshot): RawPlayerEntity[] {
  const entities: RawPlayerEntity[] = [];
  const add = (
    id: string,
    exactType: string,
    family: DismantleFamily,
    footprint: Rect,
    factoryId: string | null = null,
  ) => {
    entities.push({
      id,
      exactType,
      family,
      footprint: { ...footprint },
      factoryId,
    });
  };

  for (const belt of snapshot.belts)
    add(belt.id, "belt", "transport-lines", rect(belt.x, belt.y));
  for (const pipe of snapshot.pipes)
    add(pipe.id, "pipe", "transport-lines", rect(pipe.x, pipe.y));
  for (const line of snapshot.pressureLines)
    add(line.id, "pressure-line", "transport-lines", rect(line.x, line.y));
  for (const item of snapshot.undergroundSolids)
    entities.push(
      route(item.id, "underground-solid", item.entry, item.exit),
    );
  for (const item of snapshot.undergroundLiquids)
    entities.push(
      route(item.id, "underground-liquid", item.entry, item.exit),
    );
  for (const item of snapshot.elevatedSolids)
    entities.push(route(item.id, "elevated-solid", item.entry, item.exit));
  for (const machine of snapshot.machines)
    add(
      machine.id,
      `machine:${machine.definitionId}`,
      "production-machines",
      rect(machine.x, machine.y, machine.width, machine.height),
      machine.factoryId,
    );
  for (const storage of snapshot.storages)
    add(
      storage.id,
      `storage:${storage.definitionId}`,
      "storage-containment",
      rect(storage.x, storage.y, storage.width, storage.height),
      "factoryId" in storage && typeof storage.factoryId === "string"
        ? storage.factoryId
        : null,
    );
  for (const tank of snapshot.tanks)
    add(
      tank.id,
      "tank",
      "storage-containment",
      rect(tank.x, tank.y, tank.width, tank.height),
      "factoryId" in tank && typeof tank.factoryId === "string"
        ? tank.factoryId
        : null,
    );
  for (const vessel of snapshot.pressureVessels)
    add(
      vessel.id,
      "pressure-vessel",
      "storage-containment",
      rect(vessel.x, vessel.y, vessel.width, vessel.height),
      "factoryId" in vessel && typeof vessel.factoryId === "string"
        ? vessel.factoryId
        : null,
    );
  for (const pump of snapshot.pumps)
    add(
      pump.id,
      "pump",
      "transfer-devices",
      rect(pump.x, pump.y),
      "factoryId" in pump && typeof pump.factoryId === "string"
        ? pump.factoryId
        : null,
    );
  for (const compressor of snapshot.compressors)
    add(
      compressor.id,
      "compressor",
      "transfer-devices",
      rect(compressor.x, compressor.y),
      "factoryId" in compressor && typeof compressor.factoryId === "string"
        ? compressor.factoryId
        : null,
    );
  for (const factory of snapshot.factories) {
    add(
      factory.id,
      "factory",
      "factory-infrastructure",
      rect(factory.x, factory.y, factory.width, factory.height),
    );
    for (const port of factory.ports)
      add(
        port.id,
        "factory-port",
        "factory-infrastructure",
        rect(port.x, port.y),
        factory.id,
      );
  }
  return entities;
}

function protectedEntities(snapshot: PlayerSnapshot): ProtectedEntity[] {
  return [
    {
      id: "terminal",
      reason: "terminal",
      footprint: { ...snapshot.map.terminal },
    },
    ...snapshot.deposits.map((deposit) => ({
      id: deposit.id,
      reason: "deposit" as const,
      footprint: rect(deposit.x, deposit.y, deposit.width, deposit.height),
    })),
    ...snapshot.atmosphericSources.map((source) => ({
      id: source.id,
      reason: "atmospheric-source" as const,
      footprint: rect(source.x, source.y, source.width, source.height),
    })),
  ];
}

function internalClassifications(snapshot: PlayerSnapshot) {
  const byId = new Map<string, InternalClassification>();
  const all = [
    ...playerEntities(snapshot).map((entity) => ({ kind: "player-built" as const, entity })),
    ...protectedEntities(snapshot).map((entity) => ({ kind: "protected" as const, entity })),
  ];
  for (const entry of all) {
    const id = entry.entity.id;
    if (!byId.has(id)) byId.set(id, entry);
    else byId.set(id, { kind: "unknown", reason: "ambiguous-id" });
  }
  return byId;
}

function publicClassification(
  id: string,
  entry: InternalClassification | undefined,
): DismantleEntityClassification {
  if (!entry) return { kind: "unknown", id, reason: "unknown-id" };
  if (entry.kind === "unknown")
    return { kind: "unknown", id, reason: entry.reason };
  if (entry.kind === "protected")
    return { kind: "protected", id, reason: entry.entity.reason };
  return {
    kind: "player-built",
    entity: {
      ...entry.entity,
      footprint: { ...entry.entity.footprint },
      ...(entry.entity.routeEndpoints
        ? {
            routeEndpoints: [
              { ...entry.entity.routeEndpoints[0] },
              { ...entry.entity.routeEndpoints[1] },
            ] as const,
          }
        : {}),
    },
  };
}

/**
 * Classifies a snapshot ID from its placed collection. This is prediction
 * metadata only; callers must still ask sim-core to validate any command.
 */
export function classifyDismantleEntity(
  snapshot: PlayerSnapshot,
  id: string,
): DismantleEntityClassification {
  return publicClassification(id, internalClassifications(snapshot).get(id));
}

function normalizeArea(
  snapshot: PlayerSnapshot,
  from: Point | undefined,
  to: Point | undefined,
): Rect | null {
  const width = snapshot.map.width;
  const height = snapshot.map.height;
  if (
    !from ||
    !to ||
    !Number.isFinite(from.x) ||
    !Number.isFinite(from.y) ||
    !Number.isFinite(to.x) ||
    !Number.isFinite(to.y) ||
    width < 1 ||
    height < 1
  )
    return null;
  const clampX = (x: number) => Math.max(0, Math.min(width - 1, Math.trunc(x)));
  const clampY = (y: number) => Math.max(0, Math.min(height - 1, Math.trunc(y)));
  const x1 = clampX(from.x);
  const x2 = clampX(to.x);
  const y1 = clampY(from.y);
  const y2 = clampY(to.y);
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    x,
    y,
    width: Math.max(x1, x2) - x + 1,
    height: Math.max(y1, y2) - y + 1,
  };
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width - 1 &&
    a.x + a.width - 1 >= b.x &&
    a.y <= b.y + b.height - 1 &&
    a.y + a.height - 1 >= b.y
  );
}

function containsRect(area: Rect, object: Rect): boolean {
  return (
    object.x >= area.x &&
    object.y >= area.y &&
    object.x + object.width - 1 <= area.x + area.width - 1 &&
    object.y + object.height - 1 <= area.y + area.height - 1
  );
}

function containsPoint(area: Rect, point: Point): boolean {
  return (
    point.x >= area.x &&
    point.x <= area.x + area.width - 1 &&
    point.y >= area.y &&
    point.y <= area.y + area.height - 1
  );
}

function touchesArea(entity: RawPlayerEntity, area: Rect): boolean {
  return entity.routeEndpoints
    ? entity.routeEndpoints.some((point) => containsPoint(area, point))
    : intersects(entity.footprint, area);
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function containingFactory(
  snapshot: PlayerSnapshot,
  entity: RawPlayerEntity,
): string | null {
  if (entity.factoryId) return entity.factoryId;
  const match = snapshot.factories.find((factory) => {
    if (factory.id === entity.id) return false;
    const bounds = rect(factory.x, factory.y, factory.width, factory.height);
    return containsRect(bounds, entity.footprint);
  });
  return match?.id ?? null;
}

function hiddenInClosedFactory(
  snapshot: PlayerSnapshot,
  entity: RawPlayerEntity,
  openFactories: ReadonlySet<string>,
): boolean {
  const ownerId = containingFactory(snapshot, entity);
  return ownerId !== null && !openFactories.has(ownerId);
}

function ignoredReasonForClassification(
  classification: DismantleEntityClassification,
): string {
  if (classification.kind === "protected") return "protected-static-entity";
  if (classification.kind === "unknown") return classification.reason;
  return "filtered";
}

/**
 * Extracts stable, visible selection candidates from a normalized cell area.
 * This does not decide cargo/health/dependency safety or authorize removal.
 */
export function selectDismantleCandidates(
  snapshot: PlayerSnapshot,
  request: DismantleSelectionRequest,
): DismantleSelectionResult {
  const mode = request.mode;
  const openFactories = new Set(request.openFactoryIds ?? []);
  const classifications = internalClassifications(snapshot);
  const ignored = new Map<string, string>();
  const ignore = (id: string, reason: string) => {
    if (!ignored.has(id)) ignored.set(id, reason);
  };

  if (mode === "single") {
    const id = request.anchorId;
    if (!id)
      return {
        mode,
        area: null,
        anchor: null,
        invalidAnchorReason: "missing-anchor",
        candidates: [],
        ignored: [],
      };
    const classified = publicClassification(id, classifications.get(id));
    if (classified.kind !== "player-built") {
      ignore(id, ignoredReasonForClassification(classified));
      return {
        mode,
        area: null,
        anchor: null,
        invalidAnchorReason: classified.reason,
        candidates: [],
        ignored: [...ignored].map(([ignoredId, reason]) => ({ id: ignoredId, reason })),
      };
    }
    const raw = classifications.get(id);
    if (
      raw?.kind === "player-built" &&
      hiddenInClosedFactory(snapshot, raw.entity, openFactories)
    ) {
      ignore(id, "hidden-in-closed-factory");
      return {
        mode,
        area: null,
        anchor: classified.entity,
        invalidAnchorReason: "hidden-in-closed-factory",
        candidates: [],
        ignored: [{ id, reason: "hidden-in-closed-factory" }],
      };
    }
    return {
      mode,
      area: null,
      anchor: classified.entity,
      invalidAnchorReason: null,
      candidates: [classified.entity],
      ignored: [],
    };
  }

  const area = normalizeArea(snapshot, request.from, request.to);
  if (!area)
    return {
      mode,
      area: null,
      anchor: null,
      invalidAnchorReason: "invalid-area",
      candidates: [],
      ignored: [],
    };

  let anchor: DismantleEntity | null = null;
  let filterToken: string | null = null;
  if (mode === "area-exact" || mode === "area-family") {
    const anchorId = request.anchorId;
    if (!anchorId)
      return {
        mode,
        area,
        anchor: null,
        invalidAnchorReason: "missing-anchor",
        candidates: [],
        ignored: [],
      };
    const classified = publicClassification(
      anchorId,
      classifications.get(anchorId),
    );
    if (classified.kind !== "player-built") {
      return {
        mode,
        area,
        anchor: null,
        invalidAnchorReason: classified.reason,
        candidates: [],
        ignored: [{ id: anchorId, reason: ignoredReasonForClassification(classified) }],
      };
    }
    const rawAnchor = classifications.get(anchorId);
    if (
      rawAnchor?.kind === "player-built" &&
      hiddenInClosedFactory(snapshot, rawAnchor.entity, openFactories)
    )
      return {
        mode,
        area,
        anchor: null,
        invalidAnchorReason: "hidden-in-closed-factory",
        candidates: [],
        ignored: [{ id: anchorId, reason: "hidden-in-closed-factory" }],
      };
    anchor = classified.entity;
    filterToken = mode === "area-exact" ? anchor.exactType : anchor.family;
  }

  const candidates: DismantleEntity[] = [];
  const rawEntities = playerEntities(snapshot);
  const rawById = new Map<string, RawPlayerEntity[]>();
  for (const entity of rawEntities) {
    const group = rawById.get(entity.id);
    if (group) group.push(entity);
    else rawById.set(entity.id, [entity]);
  }
  for (const [id, sameIdEntities] of rawById) {
    const classification = publicClassification(id, classifications.get(id));
    if (classification.kind !== "player-built") {
      if (
        classification.kind === "unknown" &&
        sameIdEntities.some((entity) => touchesArea(entity, area))
      )
        ignore(id, classification.reason);
      continue;
    }
    const raw = classifications.get(id);
    if (raw?.kind !== "player-built") continue;
    const entity = classification.entity;
    if (hiddenInClosedFactory(snapshot, raw.entity, openFactories)) {
      if (touchesArea(raw.entity, area))
        ignore(id, "hidden-in-closed-factory");
      continue;
    }
    if (entity.routeEndpoints) {
      const [entry, exit] = entity.routeEndpoints;
      const entryInside = containsPoint(area, entry);
      const exitInside = containsPoint(area, exit);
      if (!entryInside && !exitInside) continue;
      if (!entryInside || !exitInside) {
        ignore(id, "partial-route");
        continue;
      }
    } else {
      if (!intersects(entity.footprint, area)) continue;
      if (!containsRect(area, entity.footprint)) {
        ignore(id, "partial-footprint");
        continue;
      }
    }
    if (
      filterToken !== null &&
      (mode === "area-exact"
        ? entity.exactType !== filterToken
        : entity.family !== filterToken)
    ) {
      ignore(id, "filtered");
      continue;
    }
    candidates.push(entity);
  }

  for (const entity of protectedEntities(snapshot))
    if (intersects(entity.footprint, area))
      ignore(entity.id, "protected-static-entity");

  candidates.sort((a, b) => compareId(a.id, b.id));
  const ignoredList = [...ignored]
    .map(([id, reason]) => ({ id, reason }))
    .sort((a, b) => compareId(a.id, b.id));
  return {
    mode,
    area,
    anchor,
    invalidAnchorReason: null,
    candidates,
    ignored: ignoredList,
  };
}
