import {
  contains,
  wall,
  type PlayerSnapshot,
  type Point,
  type GameCommand,
} from "@site/sim-core";
export {
  classifyDismantleEntity,
  selectDismantleCandidates,
} from "./dismantle-selection";
export type {
  DismantleEntity,
  DismantleEntityClassification,
  DismantleFamily,
  DismantleSelectionMode,
  DismantleSelectionRequest,
  DismantleSelectionResult,
} from "./dismantle-selection";
export type Tool =
  | "elevated-solid"
  | "underground-solid"
  | "underground-liquid"
  | "pressure-line"
  | "pressure-vessel"
  | "compressor"
  | "vaporizer"
  | "gas-collector"
  | "pipe"
  | "tank"
  | "pump"
  | "liquefier"
  | "precipitator"
  | "select"
  | "extractor"
  | "deep-extractor"
  | "atmospheric-intake"
  | "sinterer"
  | "factory"
  | "crusher"
  | "furnace"
  | "sealed-furnace"
  | "oversealed-furnace"
  | "relief-furnace"
  | "depot"
  | "belt"
  | "port"
  | "demolish"
  // Imported, validated machine definition IDs have no predefined shortcut.
  | (string & {});
export const TOOL_HOTKEYS: Record<string, string> = {
  "elevated-solid": "E",
  "underground-solid": "H",
  "underground-liquid": "I",
  "pressure-line": "G",
  "pressure-vessel": "V",
  compressor: "B",
  vaporizer: "O",
  "gas-collector": "J",
  pipe: "P",
  tank: "T",
  pump: "U",
  liquefier: "L",
  precipitator: "C",
  select: "↖",
  extractor: "1",
  "deep-extractor": "0",
  "atmospheric-intake": "K",
  sinterer: "N",
  factory: "2",
  crusher: "3",
  furnace: "4",
  "sealed-furnace": "8",
  "oversealed-furnace": "9",
  "relief-furnace": "Q",
  belt: "5",
  port: "6",
  depot: "7",
  demolish: "X",
};

export type ToolGroupId =
  | "acquisition"
  | "factory"
  | "processing"
  | "thermal"
  | "solid-logistics"
  | "liquid-logistics"
  | "gas-logistics"
  | "storage";

export type ToolGroup = {
  id: ToolGroupId;
  shortcut: string;
  defaultTool: Tool;
  tools: readonly Tool[];
};

/**
 * Phase 17 build-palette taxonomy.
 *
 * Groups are organized around the player's immediate construction goal rather
 * than renderer/content implementation details. Existing Tool ids remain the
 * gameplay/build-command identity; this contract only owns palette navigation.
 */
export const TOOL_GROUPS: readonly ToolGroup[] = [
  {
    id: "acquisition",
    shortcut: "1",
    defaultTool: "extractor",
    tools: [
      "extractor",
      "deep-extractor",
      "atmospheric-intake",
      "gas-collector",
    ],
  },
  {
    id: "factory",
    shortcut: "2",
    defaultTool: "factory",
    tools: ["factory", "port"],
  },
  {
    id: "processing",
    shortcut: "3",
    defaultTool: "crusher",
    tools: ["crusher", "sinterer", "liquefier", "precipitator", "vaporizer"],
  },
  {
    id: "thermal",
    shortcut: "4",
    defaultTool: "furnace",
    tools: [
      "furnace",
      "sealed-furnace",
      "oversealed-furnace",
      "relief-furnace",
    ],
  },
  {
    id: "solid-logistics",
    shortcut: "5",
    defaultTool: "belt",
    tools: ["belt", "underground-solid", "elevated-solid"],
  },
  {
    id: "liquid-logistics",
    shortcut: "6",
    defaultTool: "pipe",
    tools: ["pipe", "underground-liquid", "pump"],
  },
  {
    id: "gas-logistics",
    shortcut: "7",
    defaultTool: "pressure-line",
    tools: ["pressure-line", "compressor"],
  },
  {
    id: "storage",
    shortcut: "8",
    defaultTool: "depot",
    tools: ["depot", "tank", "pressure-vessel"],
  },
];

export type BuildPaletteEntry =
  | { kind: "tool"; tool: "select" | "demolish" }
  | { kind: "group"; groupId: ToolGroupId };

export const BUILD_PALETTE: readonly BuildPaletteEntry[] = [
  { kind: "tool", tool: "select" },
  { kind: "group", groupId: "acquisition" },
  { kind: "group", groupId: "factory" },
  { kind: "group", groupId: "processing" },
  { kind: "group", groupId: "thermal" },
  { kind: "group", groupId: "solid-logistics" },
  { kind: "group", groupId: "liquid-logistics" },
  { kind: "group", groupId: "gas-logistics" },
  { kind: "group", groupId: "storage" },
  { kind: "tool", tool: "demolish" },
];

export function toolGroupFor(tool: Tool): ToolGroup | null {
  return TOOL_GROUPS.find((group) => group.tools.includes(tool)) ?? null;
}

export function buildGroupById(groupId: ToolGroupId): ToolGroup {
  return TOOL_GROUPS.find((group) => group.id === groupId)!;
}

export function effectiveBuildGroupPrimary(
  groupId: ToolGroupId,
  promoteLastUsed: boolean,
  lastUsedByGroup: Readonly<Record<string, string>>,
  isToolAvailable: (tool: Tool) => boolean,
): Tool {
  const group = buildGroupById(groupId);
  if (!promoteLastUsed) return group.defaultTool;

  const remembered = lastUsedByGroup[groupId] as Tool | undefined;
  return remembered &&
    group.tools.includes(remembered) &&
    isToolAvailable(remembered)
    ? remembered
    : group.defaultTool;
}

export function rememberBuildGroupTool(
  lastUsedByGroup: Readonly<Record<string, string>>,
  tool: Tool,
): Record<string, string> {
  const group = toolGroupFor(tool);
  return group
    ? { ...lastUsedByGroup, [group.id]: tool }
    : { ...lastUsedByGroup };
}

export const STANDALONE_BUILD_SHORTCUTS = {
  demolish: "x",
} as const;

export function buildGroupForShortcut(shortcut: string): ToolGroup | null {
  const normalized = shortcut.toLowerCase();
  return (
    TOOL_GROUPS.find((group) => group.shortcut.toLowerCase() === normalized) ??
    null
  );
}

export function buildContextShortcutForTool(
  groupId: ToolGroupId,
  tool: Tool,
): string | null {
  const group = TOOL_GROUPS.find((entry) => entry.id === groupId);
  if (!group) return null;
  const index = group.tools.indexOf(tool);
  return index >= 0 ? String(index + 1) : null;
}

export function buildContextToolForShortcut(
  groupId: ToolGroupId,
  shortcut: string,
): Tool | null {
  const group = TOOL_GROUPS.find((entry) => entry.id === groupId);
  if (!group) return null;
  const index = Number(shortcut) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= group.tools.length)
    return null;
  return group.tools[index] ?? null;
}

export function standaloneBuildToolForShortcut(shortcut: string): Tool | null {
  return shortcut.toLowerCase() === STANDALONE_BUILD_SHORTCUTS.demolish
    ? "demolish"
    : null;
}

export function isGlobalBuildShortcut(shortcut: string): boolean {
  return (
    buildGroupForShortcut(shortcut) !== null ||
    standaloneBuildToolForShortcut(shortcut) !== null
  );
}

export type BuildShortcutResolution =
  | { kind: "context-tool"; tool: Tool }
  | { kind: "group"; groupId: ToolGroupId }
  | { kind: "standalone-tool"; tool: Tool }
  | { kind: "suppressed" }
  | null;

export function resolveBuildShortcut(
  shortcut: string,
  openGroupId: ToolGroupId | null,
): BuildShortcutResolution {
  if (openGroupId) {
    const contextualTool = buildContextToolForShortcut(openGroupId, shortcut);
    if (contextualTool) return { kind: "context-tool", tool: contextualTool };
    return isGlobalBuildShortcut(shortcut) ? { kind: "suppressed" } : null;
  }

  const group = buildGroupForShortcut(shortcut);
  if (group) return { kind: "group", groupId: group.id };

  const standaloneTool = standaloneBuildToolForShortcut(shortcut);
  return standaloneTool
    ? { kind: "standalone-tool", tool: standaloneTool }
    : null;
}

export const BUILD_GROUP_HOLD_MS = 360;

export function armBuildGroupHold(
  groupId: ToolGroupId,
  onOpen: (groupId: ToolGroupId) => void,
): () => void {
  const timer = setTimeout(() => onOpen(groupId), BUILD_GROUP_HOLD_MS);
  return () => clearTimeout(timer);
}

export function buildPaletteTools(): Tool[] {
  return BUILD_PALETTE.flatMap((entry) =>
    entry.kind === "tool"
      ? [entry.tool]
      : [...(TOOL_GROUPS.find((group) => group.id === entry.groupId)?.tools ?? [])],
  );
}

/**
 * Stable structural fingerprint for Phaser rebuild invalidation.
 * Every placed-geometry collection the renderer draws must appear here;
 * otherwise topology edits leave stale world visuals until an unrelated
 * change happens to invalidate.
 */
export function structureKey(s: PlayerSnapshot): string {
  const adjacent = new Set(
    s.belts
      .filter((b) => b.junction)
      .flatMap((b) =>
        [
          [b.x + 1, b.y],
          [b.x - 1, b.y],
          [b.x, b.y + 1],
          [b.x, b.y - 1],
        ].map(([x, y]) => x + "," + y),
      ),
  );
  return JSON.stringify([
    s.terminalModules.map((d) => [
      d.id,
      d.installed,
      d.unlocked,
      d.contents.quantity >= d.capacity,
    ]),
    s.machines.map((m) => [m.id, m.x, m.y, m.direction]),
    s.atmosphericSources.map((source) => [
      source.id,
      source.x,
      source.y,
      source.width,
      source.height,
      source.material,
    ]),
    s.factories.map((f) => [
      f.id,
      f.x,
      f.y,
      f.width,
      f.height,
      f.ports.map((p) => [p.id, p.x, p.y, p.direction, p.role]),
    ]),
    s.belts.map((b) => [
      b.id,
      b.x,
      b.y,
      b.direction,
      b.alternate,
      b.switched,
      b.junction ?? null,
    ]),
    s.belts
      .filter((b) => adjacent.has(b.x + "," + b.y))
      .map((b) => [b.id, !!b.cargo]),
    s.undergroundSolids.map((route) => [
      route.id,
      route.entry.x,
      route.entry.y,
      route.exit.x,
      route.exit.y,
      route.direction,
    ]),
    s.undergroundLiquids.map((route) => [
      route.id,
      route.entry.x,
      route.entry.y,
      route.exit.x,
      route.exit.y,
      route.direction,
      route.containmentProfileId,
    ]),
    s.elevatedSolids.map((route) => [
      route.id,
      route.entry.x,
      route.entry.y,
      route.exit.x,
      route.exit.y,
      route.direction,
    ]),
    s.pressureLines.map((p) => [p.id, p.x, p.y, p.inlet, p.outlet]),
    s.pressureVessels.map((p) => [p.id, p.x, p.y, p.direction]),
    s.compressors.map((p) => [p.id, p.x, p.y, p.direction]),
    s.pipes.map((p) => [
      p.id,
      p.x,
      p.y,
      p.inlet,
      p.outlet,
      p.containmentProfileId,
    ]),
    s.tanks.map((t) => [t.id, t.x, t.y, t.direction, t.containmentProfileId]),
    s.pumps.map((p) => [
      p.id,
      p.x,
      p.y,
      p.direction,
      p.containmentProfileId,
      !!p.incident,
      p.incident?.drainEnabled,
    ]),
    s.storages.map((t) => [t.id, t.definitionId, t.x, t.y, t.direction]),
  ]);
}
export type WorldMode = {
  containmentProfileId: string;
  tool: Tool;
  direction: number;
  selected: string | null;
  openFactories: string[];
};
export const DEFAULT_MODE: WorldMode = {
  containmentProfileId: "standard",
  tool: "select",
  direction: 0,
  selected: null,
  openFactories: [],
};
export function toggleFactoryOpen(mode: WorldMode, id: string): WorldMode {
  return {
    ...mode,
    openFactories: mode.openFactories.includes(id)
      ? mode.openFactories.filter((factoryId) => factoryId !== id)
      : [...mode.openFactories, id],
  };
}
export function beltPath(a: Point, b: Point): Point[] {
  let { x, y } = a;
  const path = [{ x, y }];
  while (x !== b.x) {
    x += Math.sign(b.x - x);
    path.push({ x, y });
  }
  while (y !== b.y) {
    y += Math.sign(b.y - y);
    path.push({ x, y });
  }
  return path;
}
export function hitTest(
  s: PlayerSnapshot,
  p: Point,
  open: string[],
): string | null {
  if (contains(s.map.terminal, p)) return "terminal";
  const factory = s.factories.find((f) => contains(f, p));
  if (factory && !open.includes(factory.id)) return factory.id;
  const m = s.machines.find((m) => contains(m, p));
  if (m) return m.id;
  const t = s.storages.find((t) => contains(t, p));
  if (t) return t.id;
  const vessel = s.pressureVessels.find((t) => contains(t, p));
  if (vessel) return vessel.id;
  const gas = [...s.pressureLines, ...s.compressors].find(
    (t) => t.x === p.x && t.y === p.y,
  );
  if (gas) return gas.id;
  const tank = s.tanks.find((t) => contains(t, p));
  if (tank) return tank.id;
  const liquid = [...s.pipes, ...s.pumps].find(
    (t) => t.x === p.x && t.y === p.y,
  );
  if (liquid) return liquid.id;
  const layered = [
    ...s.undergroundSolids,
    ...s.undergroundLiquids,
    ...s.elevatedSolids,
  ].find(
    (route) =>
      (route.entry.x === p.x && route.entry.y === p.y) ||
      (route.exit.x === p.x && route.exit.y === p.y),
  );
  if (layered) return layered.id;
  const b = s.belts.find((b) => b.x === p.x && b.y === p.y);
  if (b) return b.id;
  const port = factory?.ports.find((a) => a.x === p.x && a.y === p.y);
  if (port) return port.id;
  return factory?.id ?? s.deposits.find((d) => contains(d, p))?.id ?? null;
}
export function buildCommand(
  mode: WorldMode,
  s: PlayerSnapshot,
  p: Point,
  anchor: Point | null,
): GameCommand | null {
  if (mode.tool === "factory") {
    const a = anchor ?? p;
    const click = a.x === p.x && a.y === p.y;
    return {
      type: "placeFactory",
      x: Math.min(a.x, p.x),
      y: Math.min(a.y, p.y),
      width: click ? s.map.factoryMin : Math.abs(a.x - p.x) + 1,
      height: click ? s.map.factoryMin : Math.abs(a.y - p.y) + 1,
    };
  }
  // Every validated content machine is placeable, not only fixture IDs.
  if (s.definitions.some((definition) => definition.id === mode.tool))
    return {
      type: "placeMachine",
      definitionId: mode.tool,
      ...p,
      direction: mode.direction,
    };
  if (s.storageDefinitions.some((d) => d.id === mode.tool))
    return {
      type: "placeStorage",
      definitionId: mode.tool,
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "pressure-vessel" || mode.tool === "compressor")
    return {
      type:
        mode.tool === "pressure-vessel"
          ? "placePressureVessel"
          : "placeCompressor",
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "tank" || mode.tool === "pump")
    return {
      type: mode.tool === "tank" ? "placeTank" : "placePump",
      containmentProfileId: mode.containmentProfileId,
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "pipe" || mode.tool === "pressure-line") {
    const path = beltPath(anchor ?? p, p);
    const facing = (a: Point, b: Point) =>
      b.x > a.x ? 0 : b.y > a.y ? 1 : b.x < a.x ? 2 : 3;
    return {
      type: mode.tool === "pipe" ? "placePipes" : "placePressureLines",
      ...(mode.tool === "pipe"
        ? { containmentProfileId: mode.containmentProfileId }
        : {}),
      points: path.map((point, i) => {
        const inlet = i
          ? (facing(path[i - 1], point) + 2) % 4
          : ((path[1] ? facing(point, path[1]) : mode.direction) + 2) % 4;
        const outlet = path[i + 1]
          ? facing(point, path[i + 1])
          : i
            ? facing(path[i - 1], point)
            : mode.direction;
        return { ...point, inlet, outlet };
      }),
    };
  }
  if (
    mode.tool === "elevated-solid" ||
    mode.tool === "underground-solid" ||
    mode.tool === "underground-liquid"
  ) {
    const entry = anchor ?? p,
      dx = p.x - entry.x,
      dy = p.y - entry.y,
      exit =
        Math.abs(dx) >= Math.abs(dy)
          ? { x: p.x, y: entry.y }
          : { x: entry.x, y: p.y };
    return mode.tool === "elevated-solid"
      ? { type: "placeElevatedSolid", entry, exit }
      : mode.tool === "underground-solid"
        ? { type: "placeUndergroundSolid", entry, exit }
        : {
            type: "placeUndergroundLiquid",
            entry,
            exit,
            containmentProfileId: mode.containmentProfileId,
          };
  }
  if (mode.tool === "belt") {
    const points = beltPath(anchor ?? p, p),
      previous = points.at(-2);
    const direction = previous
      ? p.x > previous.x
        ? 0
        : p.y > previous.y
          ? 1
          : p.x < previous.x
            ? 2
            : 3
      : mode.direction;
    return { type: "placeBelts", points, direction };
  }
  if (mode.tool === "port") {
    const f = s.factories.find((f) => wall(f, p));
    return {
      type: "placePort",
      factoryId: f?.id ?? "",
      ...p,
      direction: mode.direction,
    };
  }
  if (mode.tool === "demolish")
    return { type: "dismantle", id: hitTest(s, p, mode.openFactories) ?? "" };
  return null;
}
