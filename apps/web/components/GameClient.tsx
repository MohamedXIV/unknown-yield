"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, setRuntimeContentLocale } from "../game/i18n";
import {
  clearRuntimePack,
  loadRuntimePack,
  MAX_RUNTIME_PACK_BYTES,
  parseRuntimePack,
  saveRuntimePack,
  type RuntimePack,
} from "../game/runtime-content";
import { machineStatusLabel } from "../game/machine-status";
import { factoryContractPresentation } from "../game/factory-presentation";
import { beltArms } from "@site/sim-core";
import type {
  GameCommand,
  CommandResult,
  Inventory,
  MachineStatus,
} from "@site/sim-core";
import { Session } from "../game/session";
import {
  BUILD_PALETTE,
  DEFAULT_MODE,
  armBuildGroupHold,
  buildContextShortcutForTool,
  effectiveBuildGroupPrimary,
  rememberBuildGroupTool,
  resolveBuildShortcut,
  toolGroupFor,
  TOOL_GROUPS,
  TOOL_HOTKEYS,
  toggleFactoryOpen,
  type ToolGroupId,
  type WorldMode,
  type Tool,
} from "../game/interaction";
import { onboardingBeat, type OnboardingSignals } from "../game/onboarding";
import {
  knowledgeOverview,
  knowledgeVisible,
  selectionOverview,
  terminalOverview,
  type KnowledgeFilter,
} from "../game/production-ux";
import {
  finishBrowserMetric,
  installBrowserPerformanceDiagnostics,
  startBrowserMetric,
} from "../game/performance";
import {
  CAMERA_TUNING_BOUNDS,
  DEFAULT_GAME_PREFERENCES,
  loadGamePreferences,
  normalizeGamePreferences,
  saveGamePreferences,
  type GamePreferences,
} from "../game/preferences";
import GameHost from "./GameHost";
function Glyph({ type, size = 20 }: { type: string; size?: number }) {
  const paths: Record<string, string> = {
    "elevated-solid": "M3 17h18 M5 17V8 M19 17V8 M5 8h14 M9 8V5 M15 8V5",
    "underground-solid": "M3 7h5l2 5-2 5H3 M21 7h-5l-2 5 2 5h5 M8 12h8",
    "underground-liquid": "M3 7h5l2 5-2 5H3 M21 7h-5l-2 5 2 5h5 M12 9c-2 3-3 4-3 6a3 3 0 0 0 6 0c0-2-1-3-3-6z",
    "pressure-line": "M3 8h18 M3 16h18 M8 5v14 M16 5v14",
    "pressure-vessel":
      "M8 3h8v2c5 1 5 17 0 18H8C3 22 3 6 8 5z M6 9h12 M6 17h12",
    compressor: "M3 12h4 M17 12h4 M7 5h10v14H7z M10 9h4 M10 15h4",
    pipe: "M3 6h9v12h9 M3 10h5v12h13",
    tank: "M5 5c0-4 14-4 14 0v14c0 4-14 4-14 0z M5 5c0 4 14 4 14 0",
    pump: "M3 12h5 M16 12h5 M8 8h8v8H8z M10 10l4 2-4 2",
    select: "M5 3l14 10-7 1-3 7z",
    extractor: "M5 21V4h13 M6 7h10 M15 4v14 M12 10l6 3-6 3 6 3",
    factory: "M3 21V9l6 4V7l6 5V4h5v17z M7 17h2 M12 17h2 M17 17h1",
    crusher: "M3 4h18l-5 8v8H8v-8z M9 7l3 3 3-3",
    furnace:
      "M5 21V8h14v13z M8 4h8 M12 10c0 4-3 3-3 6a3 3 0 0 0 6 0c0-2-2-3-3-6z",
    depot: "M4 9h16v11H4z M4 13h16 M9 9v11 M15 9v11",
    belt: "M3 6h18v12H3z M6 9l4 3-4 3 M13 9l4 3-4 3",
    port: "M3 4v16 M21 4v16 M5 12h14 M13 7l6 5-6 5",
    demolish: "M5 4l15 15 M15 3l6 6-7 7-6-6z M3 21l6-6",
    book: "M3 4h6l3 2 3-2h6v16h-6l-3 2-3-2H3z M12 6v16",
    terminal: "M4 5h16v12H4z M8 21h8 M12 17v4 M7 8l3 3-3 3 M12 14h5",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M4.93 4.93l2.12 2.12 M16.95 16.95l2.12 2.12 M2 12h3 M19 12h3 M4.93 19.07l2.12-2.12 M16.95 7.05l2.12-2.12",
    save: "M3 3h15l3 3v15H3z M7 3v6h10V3 M7 21v-8h10v8",
    home: "M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7",
    pause: "M8 4v16 M16 4v16",
    play: "M6 3l15 9-15 9z",
    roof: "M2 12l10-9 10 9 M5 10v11h14V10",
    fuel: "M12 2c0 6-7 8-7 14a7 7 0 0 0 14 0c0-4-3-7-3-7s1 6-3 6c2-5-1-13-1-13z",
    plates: "M3 7l9-5 9 5-9 5z M3 12l9 5 9-5 M3 17l9 5 9-5",
    help: "M9 8a3 3 0 1 1 6 0c0 3-3 3-3 6 M12 18h.01",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type] ?? paths.factory} />
    </svg>
  );
}
const genericNames: Record<string, string> = {
  "elevated-solid": "Elevated gantry",
  "underground-solid": "Underground belt",
  "underground-liquid": "Underground pipe",
  select: "Inspect",
  factory: "Factory",
  belt: "Belt",
  port: "Wall port",
  demolish: "Dismantle",
};
const descriptions: Partial<Record<Tool, string>> = {
  "elevated-solid":
    "Drag a visible raised solid route. Deck spans cross low logistics, while ground supports must land on clear cells.",
  "underground-solid":
    "Drag between two surface portals. One solid unit remains physically in transit until it reaches an unblocked exit.",
  "underground-liquid":
    "Drag between two surface portals. Uses the selected pipe containment profile and ordinary liquid transfer limits.",
  select:
    "Click equipment to inspect. Drag with the right mouse button to pan.",
  extractor:
    "Place entirely on a surface deposit. The arrow marks its output belt cell.",
  "deep-extractor":
    "Reach discovered deep deposits that the basic extractor cannot access. Uses more fuel per extraction batch.",
  factory: "Drag a rectangle, 6–20 cells per side. Click for a 6×6 factory.",
  crusher: "Place inside a factory. Cyan is input; gold is output.",
  furnace: "Place inside a factory.",
  "sealed-furnace": "Place inside a factory.",
  "oversealed-furnace":
    "Place inside a factory. This setup is intentionally experimental.",
  "relief-furnace":
    "Place inside a factory. Pressure-relief baffling is learned from a prior jam.",
  depot:
    "Place on clear ground. Belts move any material in and out until full.",
  belt: "Drag a ground path. Release to build. Click for one cell; R changes its direction.",
  port: "Place on a factory wall. R changes flow direction. Add a belt on the port.",
  demolish:
    "Click a structure to reclaim it and its contents. Stop active machines first.",
};
function GameClientInner() {
  const uiRenderStartedAt = startBrowserMetric();
  const { t } = useTranslation();
  const [session] = useState(() => new Session()),
    [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [mode, setMode] = useState<WorldMode>(DEFAULT_MODE),
    [panel, setPanel] = useState<
      | "selection"
      | "knowledge"
      | "terminal"
      | "configuration"
      | "menu"
      | null
    >(null),
    [knowledgeFilter, setKnowledgeFilter] =
      useState<KnowledgeFilter>("all");
  const [notice, setNotice] = useState<CommandResult | null>(null),
    [paused, setPaused] = useState(false),
    [guide, setGuide] = useState(true),
    [homeToken, setHomeToken] = useState(0),
    [confirmReset, setConfirmReset] = useState(false),
    [openToolGroup, setOpenToolGroup] = useState<ToolGroupId | null>(null),
    [preferences, setPreferences] = useState<GamePreferences>(
      DEFAULT_GAME_PREFERENCES,
    ),
    [activePack, setActivePack] = useState<RuntimePack | null>(null),
    [pendingPack, setPendingPack] = useState<RuntimePack | null>(null),
    [packReady, setPackReady] = useState(false);
  const cancelGroupHold = useRef<(() => void) | null>(null);
  const suppressGroupClick = useRef<ToolGroupId | null>(null);
  const keyboardGroupHold = useRef<{
    groupId: ToolGroupId;
    shortcut: string;
    held: boolean;
    cancel: () => void;
  } | null>(null);
  const buildKeyboardContext = useRef<{
    openToolGroup: ToolGroupId | null;
    setTool: (tool: Tool) => void;
    chooseGroupTool: (tool: Tool) => void;
    groupPrimary: (groupId: ToolGroupId) => Tool;
  } | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingSignals>({
    knowledgeOpened: false,
    terminalOpened: false,
    factoryToggleCount: 0,
  });
  useLayoutEffect(() => {
    finishBrowserMetric("ui-render-commit", uiRenderStartedAt);
  });
  useEffect(() => installBrowserPerformanceDiagnostics(), []);
  useEffect(() => {
    try {
      setPreferences(loadGamePreferences(window.localStorage));
    } catch {
      setPreferences(DEFAULT_GAME_PREFERENCES);
    }
  }, []);
  useEffect(
    () => session.subscribe(() => setSnapshot(session.snapshot())),
    [session],
  );
  useEffect(() => {
    let cancelled = false;
    void loadRuntimePack(window.localStorage)
      .then((pack) => {
        if (cancelled || !pack) return;
        // Source selection always creates a new world, before Phaser mounts.
        session.usePack(pack);
        setRuntimeContentLocale(pack.bundle.locale);
        setActivePack(pack);
      })
      .catch((error: unknown) => {
        if (!cancelled) setNotice({ ok: false, message:
          "Stored content pack rejected; built-in content remains active. " + String(error) });
      })
      .finally(() => { if (!cancelled) setPackReady(true); });
    return () => { cancelled = true; };
  }, [session]);
  useEffect(() => {
    const hide = () => session.suspend();
    document.addEventListener("visibilitychange", hide);
    const timer = setInterval(
      () => session.advance(performance.now(), document.hidden || paused),
      100,
    );
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [session, paused]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(
    () => () => {
      cancelGroupHold.current?.();
      keyboardGroupHold.current?.cancel();
    },
    [],
  );
  useEffect(() => setOpenToolGroup(null), [panel]);
  const unlockFor = (tool: Tool) =>
    snapshot.definitions.find((definition) => definition.id === tool)?.unlock;
  const toolLocked = (tool: Tool) => unlockFor(tool)?.unlocked === false;
  const setTool = (tool: Tool) => {
    const unlock = unlockFor(tool);
    if (unlock && !unlock.unlocked) {
      setNotice({ ok: false, message: t(unlock.hintKey) });
      return;
    }
    setMode((m) => ({ ...m, tool, selected: null }));
    setPanel(null);
  };
  const select = (id: string | null) => {
    if (id === "terminal")
      setOnboarding((state) => ({ ...state, terminalOpened: true }));
    setMode((m) => ({ ...m, selected: id }));
    setPanel(id === "terminal" ? "terminal" : id ? "selection" : null);
  };
  const toggleFactory = (id: string) => {
    setOnboarding((state) => ({
      ...state,
      factoryToggleCount: Math.min(2, state.factoryToggleCount + 1),
    }));
    setMode((mode) => toggleFactoryOpen(mode, id));
  };
  const act = (cmd: GameCommand) => {
    const result = session.command(cmd);
    setNotice(
      result.messageKey ? { ...result, message: t(result.messageKey) } : result,
    );
    if (result.ok && cmd.type === "placeFactory" && result.id)
      setMode((m) => ({
        ...m,
        openFactories: [...m.openFactories, result.id!],
      }));
    if (result.ok && cmd.type === "dismantle" && cmd.id === mode.selected) {
      setMode((m) => ({ ...m, selected: null }));
      setPanel(null);
    }
    return result;
  };
  const importPack = async (file: File | undefined) => {
    if (!file) return;
    setPendingPack(null);
    try {
      if (file.size > MAX_RUNTIME_PACK_BYTES)
        throw new Error("Pack exceeds 2 MiB limit");
      const pack = await parseRuntimePack(await file.text());
      setPendingPack(pack);
      setNotice({ ok: true, message: "Pack validated: " + pack.fingerprint.slice(0, 12) + ". Start a new test expedition to use it." });
    } catch (error) {
      setNotice({ ok: false, message: "Content pack rejected: " + String(error) });
    }
  };
  const choosePack = (pack: RuntimePack | null) => {
    try {
      // An explicit new expedition is the only point where content changes.
      session.usePack(pack);
      setRuntimeContentLocale(pack?.bundle.locale ?? null);
      setActivePack(pack);
      setPendingPack(null);
      setMode(DEFAULT_MODE);
      setPanel(null);
      setConfirmReset(false);
      setGuide(true);
      setHomeToken((n) => n + 1);
      try {
        if (pack) saveRuntimePack(window.localStorage, pack);
        else clearRuntimePack(window.localStorage);
      } catch {
        setNotice({ ok: false, message: "Expedition started, but selected content could not be remembered for a reload. Export your work and avoid saving until storage is available." });
      }
    } catch (error) {
      setNotice({ ok: false, message: "Could not start expedition: " + String(error) });
    }
  };
  const persist = (load: boolean) => {
    try {
      const result = load
        ? session.restore(localStorage)
        : session.save(localStorage);
      setNotice(result);
      if (load && result.ok) {
        setMode(DEFAULT_MODE);
        setPanel(null);
      }
    } catch {
      setNotice({
        ok: false,
        message: "Storage is unavailable. Your running site is unchanged.",
      });
    }
  };
  const commitPreferences = (next: GamePreferences) => {
    const normalized = normalizeGamePreferences(next);
    setPreferences(normalized);
    let saved: boolean;
    try {
      saved = saveGamePreferences(window.localStorage, normalized);
    } catch {
      saved = false;
    }
    if (!saved) {
      setNotice({
        ok: false,
        message:
          "Game Configuration changed for this session, but browser storage is unavailable.",
      });
    }
  };
  const setPromoteLastUsed = (enabled: boolean) => {
    commitPreferences({
      ...preferences,
      buildPalette: {
        ...preferences.buildPalette,
        promoteLastUsed: enabled,
      },
    });
  };
  const updateCamera = (change: Partial<GamePreferences["camera"]>) => {
    commitPreferences({
      ...preferences,
      camera: { ...preferences.camera, ...change },
    });
  };
  const resetPreferences = () =>
    commitPreferences(normalizeGamePreferences(DEFAULT_GAME_PREFERENCES));
  const machine = snapshot.machines.find((m) => m.id === mode.selected),
    factory = snapshot.factories.find((f) => f.id === mode.selected),
    belt = snapshot.belts.find((b) => b.id === mode.selected),
    pressureLine = snapshot.pressureLines.find((p) => p.id === mode.selected),
    pressureVessel = snapshot.pressureVessels.find(
      (p) => p.id === mode.selected,
    ),
    compressor = snapshot.compressors.find((p) => p.id === mode.selected),
    pipe = snapshot.pipes.find((p) => p.id === mode.selected),
    tank = snapshot.tanks.find((p) => p.id === mode.selected),
    pump = snapshot.pumps.find((p) => p.id === mode.selected),
    elevatedSolid = snapshot.elevatedSolids.find(
      (route) => route.id === mode.selected,
    ),
    undergroundSolid = snapshot.undergroundSolids.find(
      (route) => route.id === mode.selected,
    ),
    undergroundLiquid = snapshot.undergroundLiquids.find(
      (route) => route.id === mode.selected,
    ),
    storage = snapshot.storages.find((t) => t.id === mode.selected),
    portFactory = snapshot.factories.find((f) =>
      f.ports.some((p) => p.id === mode.selected),
    ),
    deposit = snapshot.deposits.find((d) => d.id === mode.selected);
  const selectedDefinition = machine
    ? snapshot.definitions.find((d) => d.id === machine.definitionId)
    : undefined;
  const selectedFuelClass = machine?.fuelClassId
    ? snapshot.fuelClasses.find((entry) => entry.id === machine.fuelClassId)
    : undefined;
  const selectedCapabilities = pressureLine
    ? snapshot.gasLogistics!.line.containmentCapabilities
    : pressureVessel
      ? snapshot.gasLogistics!.vessel.containmentCapabilities
      : compressor
        ? snapshot.gasLogistics!.compressor.containmentCapabilities
        : storage
          ? snapshot.storageDefinitions.find(
              (d) => d.id === storage.definitionId,
            )!.containmentCapabilities
          : undergroundLiquid
            ? [
                ...new Set([
                  ...snapshot.liquidLogistics!.pipe.containmentCapabilities,
                  ...snapshot.liquidLogistics!.containmentProfiles.find(
                    (profile) =>
                      profile.id === undergroundLiquid.containmentProfileId,
                  )!.capabilities,
                ]),
              ]
            : elevatedSolid || undergroundSolid || belt
              ? snapshot.map.beltContainment
              : undefined;
  const capabilityNames = (ids: string[]) =>
    ids
      .map((id) =>
        t(snapshot.containmentCapabilities.find((c) => c.id === id)!.nameKey),
      )
      .join(", ") || t("ui.containment.none");
  const materialName = (id: string) => {
    const key = snapshot.materials.find((m) => m.id === id)?.nameKey;
    return key ? t(key) : "Unidentified material";
  };
  const exchangeFor = (id: string) =>
    snapshot.exchange.find((listing) => listing.materialId === id);
  const terminalQuantity = (id: string) => {
    const material = snapshot.materials.find((entry) => entry.id === id);
    if (!material) return 0;
    if (material.handlingState === "solid") return snapshot.staging[id] ?? 0;
    return snapshot.terminalModules.reduce(
      (sum, dock) =>
        sum + (dock.contents.materialId === id ? dock.contents.quantity : 0),
      0,
    );
  };
  const shipmentSelected = Object.values(snapshot.shipmentManifest).reduce(
    (sum, units) => sum + units,
    0,
  );
  const factoryPresentation = factory
      ? factoryContractPresentation(factory, materialName)
      : null,
    factoryOpen = factory ? mode.openFactories.includes(factory.id) : false;
  // Machine-tool labels resolve from content definitions so a catalog rename
  // updates the toolbar and inspector together. Generic tools stay English.
  const toolName = (tool: Tool) => {
    if (["pressure-line", "pressure-vessel", "compressor"].includes(tool))
      return t("ui.gas." + tool + ".name");
    if (["pipe", "tank", "pump"].includes(tool))
      return t("ui.liquid." + tool + ".name");
    const key =
      snapshot.definitions.find((d) => d.id === tool)?.nameKey ??
      snapshot.storageDefinitions.find((d) => d.id === tool)?.nameKey;
    return key ? t(key) : (genericNames[tool] ?? tool);
  };
  const withFuelRequirement = (
    tool: Tool,
    description: string | undefined,
  ) => {
    const definition = snapshot.definitions.find((entry) => entry.id === tool);
    const fuelClass = definition?.fuelClassId
      ? snapshot.fuelClasses.find((entry) => entry.id === definition.fuelClassId)
      : undefined;
    return fuelClass
      ? (description ?? "") +
          " Operating fuel: " +
          t(fuelClass.nameKey) +
          " · " +
          definition!.fuel +
          " unit" +
          (definition!.fuel === 1 ? "" : "s") +
          " per batch."
      : description;
  };
  // Furnace descriptions name their operation, which is content data.
  const toolDescription = (tool: Tool) => {
    if (
      [
        "pressure-line",
        "pressure-vessel",
        "compressor",
        "vaporizer",
        "gas-collector",
        "atmospheric-intake",
      ].includes(tool)
    )
      return t("ui.gas." + tool + ".description");
    if (["pipe", "tank", "pump", "liquefier", "precipitator"].includes(tool))
      return t("ui.liquid." + tool + ".description");
    if (tool === "sinterer")
      return withFuelRequirement(tool, t("ui.machine.sinterer.description"));
    const unlock = unlockFor(tool);
    if (unlock && !unlock.unlocked)
      return "Locked · Requires " + t(unlock.hintKey) + ".";
    if (
      tool !== "furnace" &&
      tool !== "sealed-furnace" &&
      tool !== "oversealed-furnace" &&
      tool !== "relief-furnace"
    )
      return withFuelRequirement(tool, descriptions[tool]);
    const key = snapshot.operations.find((o) => o.id === "heat")?.nameKey;
    const base =
      descriptions[tool] +
      " Operation: " +
      (key ? t(key) : "heat") +
      ". Outcomes require observation.";
    return unlock ? "Unlocked by " + t(unlock.hintKey) + ". " + base : base;
  };
  const buffer = (inv: Inventory) => (
    <div className="inventory">
      {Object.entries(inv).length ? (
        Object.entries(inv).map(([id, n]) => (
          <div key={id}>
            <i
              style={{
                background: snapshot.materials.find((m) => m.id === id)?.color,
              }}
            />
            <span>
              {materialName(id)}
              {snapshot.materials.find((m) => m.id === id)?.requiredContainment
                .length ? (
                <small>
                  {" "}
                  · {t("ui.containment.requires")}:{" "}
                  {capabilityNames(
                    snapshot.materials.find((m) => m.id === id)!
                      .requiredContainment,
                  )}
                </small>
              ) : null}
            </span>
            <b>{n}</b>
          </div>
        ))
      ) : (
        <span className="muted">Empty</span>
      )}
    </div>
  );
  const fresh = snapshot.knowledgeEntries.filter(
    (entry) => !entry.initial,
  ).length;
  const toolCost = (tool: Tool) =>
    tool === "elevated-solid"
      ? snapshot.map.elevatedSolid.deckCostPerCell
      : tool === "underground-solid"
        ? snapshot.map.beltCost
      : tool === "underground-liquid"
        ? (snapshot.liquidLogistics?.pipe.cost ?? 0) +
          (snapshot.liquidLogistics?.containmentProfiles.find(
            (p) => p.id === mode.containmentProfileId,
          )?.additionalCost.pipe ?? 0)
        : tool === "pressure-line"
      ? snapshot.gasLogistics?.line.cost
      : tool === "pressure-vessel"
        ? snapshot.gasLogistics?.vessel.cost
        : tool === "compressor"
          ? snapshot.gasLogistics?.compressor.cost
          : tool === "pipe" || tool === "tank" || tool === "pump"
            ? (snapshot.liquidLogistics?.[tool].cost ?? 0) +
              (snapshot.liquidLogistics?.containmentProfiles.find(
                (p) => p.id === mode.containmentProfileId,
              )?.additionalCost[tool] ?? 0)
            : tool === "factory"
              ? snapshot.map.factoryCellCost
              : tool === "belt"
                ? snapshot.map.beltCost
                : tool === "port"
                  ? snapshot.map.portCost
                  : (snapshot.definitions.find((d) => d.id === tool)?.cost ??
                    snapshot.storageDefinitions.find((d) => d.id === tool)
                      ?.cost);
  // New imported machines are content, not a fixed compile-time toolbar list.
  // Keep original group shortcuts stable and expose extensions in Processing.
  const packMachineTools = snapshot.definitions
    .filter((definition) => !TOOL_GROUPS.some((group) => group.tools.includes(definition.id)))
    .map((definition) => definition.id);
  const groupFor = (id: ToolGroupId) =>
    TOOL_GROUPS.find((group) => group.id === id)!;
  const groupPrimary = (id: ToolGroupId) =>
    effectiveBuildGroupPrimary(
      id,
      preferences.buildPalette.promoteLastUsed,
      preferences.buildPalette.lastUsedByGroup,
      (tool) => !toolLocked(tool),
    );
  const rememberGroupSelection = (tool: Tool) => {
    const group = toolGroupFor(tool);
    if (
      !group ||
      preferences.buildPalette.lastUsedByGroup[group.id] === tool
    )
      return;
    commitPreferences({
      ...preferences,
      buildPalette: {
        ...preferences.buildPalette,
        lastUsedByGroup: rememberBuildGroupTool(
          preferences.buildPalette.lastUsedByGroup,
          tool,
        ),
      },
    });
  };
  const startGroupPress = (id: ToolGroupId) => {
    cancelGroupHold.current?.();
    suppressGroupClick.current = null;
    cancelGroupHold.current = armBuildGroupHold(id, (groupId) => {
      suppressGroupClick.current = groupId;
      setOpenToolGroup(groupId);
    });
  };
  const cancelGroupPress = () => {
    cancelGroupHold.current?.();
    cancelGroupHold.current = null;
  };
  const activateGroupPrimary = (id: ToolGroupId) => {
    if (suppressGroupClick.current === id) {
      suppressGroupClick.current = null;
      return;
    }
    setOpenToolGroup(null);
    setTool(groupPrimary(id));
  };
  const chooseGroupTool = (tool: Tool) => {
    const locked = toolLocked(tool);
    setTool(tool);
    if (!locked) {
      rememberGroupSelection(tool);
      setOpenToolGroup(null);
    }
  };
  buildKeyboardContext.current = {
    openToolGroup,
    setTool,
    chooseGroupTool,
    groupPrimary,
  };
  useEffect(() => {
    const editingInput = () => {
      const element = document.activeElement;
      return (
        element instanceof HTMLElement &&
        (element.matches("input,textarea,select") || element.isContentEditable)
      );
    };
    const ownEvent = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (editingInput()) return;
      const shortcut = event.key.toLowerCase();

      const context = buildKeyboardContext.current;
      if (!context) return;

      if (context.openToolGroup && shortcut === "escape") {
        ownEvent(event);
        if (!event.repeat) setOpenToolGroup(null);
        return;
      }

      const resolution = resolveBuildShortcut(shortcut, context.openToolGroup);
      if (!resolution) return;

      ownEvent(event);
      if (event.repeat) return;

      if (resolution.kind === "context-tool") {
        context.chooseGroupTool(resolution.tool);
        return;
      }
      if (resolution.kind === "suppressed") return;
      if (resolution.kind === "standalone-tool") {
        setOpenToolGroup(null);
        context.setTool(resolution.tool);
        return;
      }

      if (keyboardGroupHold.current) return;
      const pending = {
        groupId: resolution.groupId,
        shortcut,
        held: false,
        cancel: () => {},
      };
      pending.cancel = armBuildGroupHold(resolution.groupId, (groupId) => {
        pending.held = true;
        setOpenToolGroup(groupId);
      });
      keyboardGroupHold.current = pending;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const pending = keyboardGroupHold.current;
      if (!pending || event.key.toLowerCase() !== pending.shortcut) return;

      ownEvent(event);
      pending.cancel();
      keyboardGroupHold.current = null;
      if (!pending.held) {
        setOpenToolGroup(null);
        const context = buildKeyboardContext.current;
        if (context) context.setTool(context.groupPrimary(pending.groupId));
      }
    };
    const onBlur = () => {
      keyboardGroupHold.current?.cancel();
      keyboardGroupHold.current = null;
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const toolGlyph = (tool: Tool) =>
    tool === "sealed-furnace" ||
    tool === "oversealed-furnace" ||
    tool === "relief-furnace"
      ? "furnace"
      : tool === "deep-extractor"
        ? "extractor"
        : tool === "atmospheric-intake"
          ? "compressor"
          : tool === "sinterer"
            ? "furnace"
            : tool;
  const toolTile = (tool: Tool, shortcut: string | null) => (
    <>
      {shortcut && <small>{shortcut}</small>}
      <Glyph type={toolGlyph(tool)} size={25} />
      <span>{toolName(tool)}</span>
      {toolLocked(tool) ? (
        <em>LOCKED</em>
      ) : toolCost(tool) ? (
        <em>
          {toolCost(tool)}
          {tool === "factory" ||
          tool === "underground-solid" ||
          tool === "underground-liquid"
            ? "/cell"
            : tool === "elevated-solid"
              ? "/deck cell + supports"
              : ""}
        </em>
      ) : (
        <em>—</em>
      )}
    </>
  );
  const close = () => {
    setPanel(null);
    setMode((m) => ({ ...m, selected: null }));
  };
  const scrollContextTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  const brief = onboardingBeat(snapshot, onboarding),
    notebookSummary = knowledgeOverview(snapshot),
    terminalSummary = terminalOverview(snapshot),
    inspectorSummary = selectionOverview(snapshot, mode.selected);
  const overview = (
    entry:
      | ReturnType<typeof selectionOverview>
      | ReturnType<typeof terminalOverview>,
  ) => (
    <section className={"context-overview tone-" + entry.tone}>
      <small>{entry.eyebrow}</small>
      <strong>{entry.title}</strong>
      <p>{entry.detail}</p>
    </section>
  );
  return (
    <main
      className="game"
      data-motion-mode={preferences.accessibility.reducedMotion}
    >
      {packReady ? <GameHost
        key={activePack?.fingerprint ?? "built-in"}
        session={session}
        mode={mode}
        homeToken={homeToken}
        preferences={preferences}
        actions={{
          select,
          command: act,
          preview: session.preview,
          mode: setTool,
          rotate: () =>
            setMode((m) => ({ ...m, direction: (m.direction + 1) % 4 })),
          toggleFactory,
        }}
      /> : <div className="world-host" role="status">Validating selected content pack…</div>}
      <header className="hud-top">
        <div className="site-mark">
          <span className="brand-symbol">Y</span>
          <div>
            UNKNOWN YIELD<small>THE PALE REACH · SITE 01</small>
          </div>
        </div>
        <div className="resources">
          <span title="Construction stock">
            <Glyph type="plates" />
            <b data-testid="plates">{snapshot.stock.plates ?? 0}</b>
            <small>PLATES</small>
          </span>
          <span
            className={snapshot.fuel < 10 ? "low" : ""}
            title="Company fuel allocation"
          >
            <Glyph type="fuel" />
            <b data-testid="fuel">{snapshot.fuel}</b>
            <small>FUEL</small>
          </span>
        </div>
        <nav className="hud-actions" aria-label="Game controls">
          <button
            aria-label="Knowledge notebook"
            title="Knowledge"
            onClick={() => {
              setOnboarding((state) => ({ ...state, knowledgeOpened: true }));
              if (panel !== "knowledge") setKnowledgeFilter("all");
              setPanel(panel === "knowledge" ? null : "knowledge");
              setMode((m) => ({ ...m, tool: "select" }));
            }}
          >
            <Glyph type="book" />
            {fresh > 0 && <i>{fresh}</i>}
          </button>
          <button
            aria-label="Company terminal"
            title="Company terminal"
            onClick={() => {
              setOnboarding((state) => ({ ...state, terminalOpened: true }));
              setPanel(panel === "terminal" ? null : "terminal");
              setMode((m) => ({ ...m, tool: "select", selected: "terminal" }));
            }}
          >
            <Glyph type="terminal" />
          </button>
          <button
            aria-label="Center camera"
            title="Center camera · Home"
            onClick={() => setHomeToken((n) => n + 1)}
          >
            <Glyph type="home" />
          </button>
          <button
            aria-label={paused ? "Resume simulation" : "Pause simulation"}
            title={paused ? "Resume" : "Pause"}
            onClick={() => {
              session.suspend();
              setPaused(!paused);
            }}
          >
            <Glyph type={paused ? "play" : "pause"} />
          </button>
          <button
            aria-label="Game configuration"
            title="Game configuration"
            onClick={() => {
              setPanel(panel === "configuration" ? null : "configuration");
              setMode((m) => ({ ...m, tool: "select", selected: null }));
            }}
          >
            <Glyph type="settings" />
          </button>
          <button
            aria-label="Game menu"
            title="Expedition menu"
            onClick={() => setPanel(panel === "menu" ? null : "menu")}
          >
            <Glyph type="menu" />
          </button>
        </nav>
      </header>
      {guide && (
        <aside
          className={"field-guide beat-" + brief.id}
          data-onboarding-beat={brief.id}
          aria-live="polite"
        >
          <button
            aria-label="Close field brief"
            onClick={() => setGuide(false)}
          >
            ×
          </button>
          <small>
            {brief.eyebrow}
            {brief.step ? " · " + brief.step + "/" + brief.total : ""}
          </small>
          <h2>{brief.title}</h2>
          <p className="guide-body">{brief.body}</p>
          <p>{brief.hint}</p>
        </aside>
      )}
      {!guide && (
        <button
          className="guide-toggle"
          aria-label="Open field brief"
          onClick={() => setGuide(true)}
        >
          <Glyph type="help" size={16} />
        </button>
      )}
      {notice && (
        <div role="status" className={"toast " + (notice.ok ? "" : "error")}>
          {notice.ok ? "◇" : "!"} <span>{notice.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
      {paused && <div className="paused-label">PAUSED</div>}
      {panel && (
        <aside className="context-panel">
          <div className="context-header">
            <span>
              {panel === "knowledge"
                ? "FIELD NOTEBOOK"
                : panel === "terminal"
                  ? "COMPANY TERMINAL"
                  : panel === "configuration"
                    ? "GAME CONFIGURATION"
                    : panel === "menu"
                      ? "EXPEDITION MENU"
                      : "INSPECT"}
            </span>
            <button aria-label="Close panel" onClick={close}>
              ×
            </button>
          </div>
          <div className="context-body">
            {panel === "selection" && overview(inspectorSummary)}
            {panel === "knowledge" && (
              <>
                {overview({
                  tone:
                    notebookSummary.hazards > 0
                      ? "bad"
                      : notebookSummary.open > 0
                        ? "warn"
                        : "calm",
                  eyebrow: "EVIDENCE STATUS",
                  title:
                    notebookSummary.open +
                    " open · " +
                    notebookSummary.confirmed +
                    " confirmed · " +
                    notebookSummary.hazards +
                    " hazards",
                  detail:
                    "Filter what you know without exposing the authored recipe graph. Unconfirmed outcomes stay unnamed.",
                })}
                <nav className="context-tabs" aria-label="Notebook filters">
                  {(
                    [
                      ["all", "All"],
                      ["open", "Open"],
                      ["hazards", "Hazards"],
                      ["confirmed", "Confirmed"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className={knowledgeFilter === id ? "active" : ""}
                      aria-pressed={knowledgeFilter === id}
                      onClick={() => setKnowledgeFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </>
            )}
            {panel === "terminal" && (
              <>
                {overview(terminalSummary)}
                <nav className="context-tabs" aria-label="Terminal sections">
                  <button onClick={() => scrollContextTo("terminal-work")}>
                    Work
                  </button>
                  <button onClick={() => scrollContextTo("terminal-handling")}>
                    Handling
                  </button>
                  <button onClick={() => scrollContextTo("terminal-shipment")}>
                    Shipment
                  </button>
                  <button onClick={() => scrollContextTo("terminal-company")}>
                    Company
                  </button>
                </nav>
              </>
            )}
            {panel === "selection" && (
              <>
                {selectedDefinition && (
                  <>
                    <p>
                      {t("ui.containment.input")}:{" "}
                      {capabilityNames(selectedDefinition.inputContainment)}
                    </p>
                    <p>
                      {t("ui.containment.output")}:{" "}
                      {capabilityNames(selectedDefinition.outputContainment)}
                    </p>
                  </>
                )}
                {selectedCapabilities && (
                  <p>
                    {t("ui.containment.capabilities")}:{" "}
                    {capabilityNames(selectedCapabilities)}
                  </p>
                )}
                {!(pipe || tank || pump) &&
                  mode.selected &&
                  snapshot.transportDiagnostics[mode.selected] && (
                    <p>
                      {t(
                        "ui.containment.reason." +
                          snapshot.transportDiagnostics[mode.selected].reason,
                      )}
                      {snapshot.transportDiagnostics[mode.selected]
                        .missingContainment?.length
                        ? capabilityNames(
                            snapshot.transportDiagnostics[mode.selected]
                              .missingContainment!,
                          )
                        : null}
                    </p>
                  )}
                {elevatedSolid && (
                  <>
                    <h2>Elevated gantry</h2>
                    <p>
                      {elevatedSolid.entry.x},{elevatedSolid.entry.y} →{" "}
                      {elevatedSolid.exit.x},{elevatedSolid.exit.y}
                    </p>
                    <p>
                      Supports every ≤ {snapshot.map.elevatedSolid.maxSupportSpan} cells
                      · support cost {snapshot.map.elevatedSolid.supportCost}
                    </p>
                    <p>
                      {elevatedSolid.cargo
                        ? materialName(elevatedSolid.cargo.materialId) +
                          " · " +
                          elevatedSolid.cargo.remainingSteps +
                          " raised steps remaining"
                        : "Empty"}
                    </p>
                  </>
                )}
                {undergroundSolid && (
                  <>
                    <h2>Underground belt</h2>
                    <p>
                      {undergroundSolid.entry.x},{undergroundSolid.entry.y} →{" "}
                      {undergroundSolid.exit.x},{undergroundSolid.exit.y}
                    </p>
                    <p>
                      {undergroundSolid.cargo
                        ? materialName(undergroundSolid.cargo.materialId) +
                          " · " +
                          undergroundSolid.cargo.remainingSteps +
                          " buried steps remaining"
                        : "Empty"}
                    </p>
                  </>
                )}
                {undergroundLiquid && (
                  <>
                    <h2>Underground pipe</h2>
                    <p>
                      {undergroundLiquid.entry.x},{undergroundLiquid.entry.y} →{" "}
                      {undergroundLiquid.exit.x},{undergroundLiquid.exit.y}
                    </p>
                    <p>
                      {t("ui.containment.profile")}:{" "}
                      {t(
                        snapshot.liquidLogistics!.containmentProfiles.find(
                          (profile) =>
                            profile.id ===
                            undergroundLiquid.containmentProfileId,
                        )!.nameKey,
                      )}
                    </p>
                    <p>
                      {undergroundLiquid.materialId
                        ? materialName(undergroundLiquid.materialId) +
                          " · " +
                          undergroundLiquid.quantity +
                          " · " +
                          undergroundLiquid.remainingSteps +
                          " buried steps remaining"
                        : "Empty"}
                    </p>
                  </>
                )}
                {(pipe || tank || pump) && (
                  <>
                    <h2>
                      {t(
                        "ui.liquid." +
                          (pipe ? "pipe" : tank ? "tank" : "pump") +
                          ".name",
                      )}
                    </h2>
                    <label>
                      {t("ui.containment.profile")}
                      <select
                        aria-label={t("ui.containment.profile")}
                        value={(pipe ?? tank ?? pump)!.containmentProfileId}
                        disabled={
                          !!(
                            pipe?.quantity ||
                            tank?.quantity ||
                            pump?.enabled ||
                            pump?.incident?.quantity
                          )
                        }
                        onChange={(e) =>
                          act({
                            type: "setLiquidContainmentProfile",
                            id: (pipe ?? tank ?? pump)!.id,
                            containmentProfileId: e.target.value,
                          })
                        }
                      >
                        {snapshot.liquidLogistics!.containmentProfiles.map(
                          (p) => (
                            <option key={p.id} value={p.id}>
                              {t(p.nameKey)} ·{" "}
                              {t("ui.containment.cost", {
                                count:
                                  snapshot.liquidLogistics![
                                    pipe ? "pipe" : tank ? "tank" : "pump"
                                  ].cost +
                                  p.additionalCost[
                                    pipe ? "pipe" : tank ? "tank" : "pump"
                                  ],
                              })}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <p>
                      {t("ui.containment.capabilities")}:{" "}
                      {capabilityNames([
                        ...new Set([
                          ...snapshot.liquidLogistics![
                            pipe ? "pipe" : tank ? "tank" : "pump"
                          ].containmentCapabilities,
                          ...snapshot.liquidLogistics!.containmentProfiles.find(
                            (p) =>
                              p.id ===
                              (pipe ?? tank ?? pump)!.containmentProfileId,
                          )!.capabilities,
                        ]),
                      ])}
                    </p>
                    {snapshot.transportDiagnostics[
                      (pipe ?? tank ?? pump)!.id
                    ] && (
                      <p>
                        {t(
                          "ui.containment.reason." +
                            snapshot.transportDiagnostics[
                              (pipe ?? tank ?? pump)!.id
                            ].reason,
                        )}
                        {snapshot.transportDiagnostics[
                          (pipe ?? tank ?? pump)!.id
                        ].missingContainment
                          ?.map((id) =>
                            t(
                              snapshot.containmentCapabilities.find(
                                (c) => c.id === id,
                              )!.nameKey,
                            ),
                          )
                          .join(", ")}
                      </p>
                    )}
                    {(pipe ?? tank)?.materialId &&
                      snapshot.materials.some(
                        (m) => m.id === (pipe ?? tank)!.materialId,
                      ) && (
                        <p>
                          {t("ui.containment.requires")}:{" "}
                          {capabilityNames(
                            snapshot.materials.find(
                              (m) => m.id === (pipe ?? tank)!.materialId,
                            )?.requiredContainment ?? [],
                          )}
                        </p>
                      )}
                    {(pipe || tank) && (
                      <p>
                        {(pipe ?? tank)!.materialId
                          ? materialName((pipe ?? tank)!.materialId!)
                          : t("ui.liquid.empty")}{" "}
                        · {(pipe ?? tank)!.quantity} /{" "}
                        {tank?.capacity ??
                          snapshot.liquidLogistics!.pipe.capacity}
                      </p>
                    )}
                    {pump && (
                      <>
                        <p>{t("ui.liquid.status." + pump.status)}</p>
                        {pump.incident && (
                          <>
                            <p>
                              {t(
                                snapshot.liquidLogistics!.pump
                                  .containmentFailure!.descriptionKey,
                              )}
                            </p>
                            <p>
                              {pump.incident.materialId
                                ? materialName(pump.incident.materialId)
                                : t("ui.recovery.unidentified")}{" "}
                              · {pump.incident.quantity} /{" "}
                              {
                                snapshot.liquidLogistics!.pump
                                  .containmentFailure!.trappedCapacity
                              }
                            </p>
                            {pump.recoveryDiagnostic && (
                              <p>
                                {t(
                                  "ui.containment.reason." +
                                    pump.recoveryDiagnostic.reason,
                                )}
                                {pump.recoveryDiagnostic.missingContainment
                                  ? capabilityNames(
                                      pump.recoveryDiagnostic
                                        .missingContainment,
                                    )
                                  : null}
                              </p>
                            )}
                            <button
                              onClick={() =>
                                act({
                                  type: "setPumpRecoveryDrain",
                                  id: pump.id,
                                  enabled: !pump.incident!.drainEnabled,
                                })
                              }
                            >
                              {t(
                                pump.incident.drainEnabled
                                  ? "ui.recovery.stop-drain"
                                  : "ui.recovery.start-drain",
                              )}
                            </button>
                            <button
                              disabled={!pump.canRepair}
                              onClick={() =>
                                act({ type: "repairPump", id: pump.id })
                              }
                            >
                              {t("ui.recovery.repair")}
                            </button>
                          </>
                        )}
                        <button
                          disabled={!!pump.incident}
                          onClick={() =>
                            act({
                              type: "setPumpEnabled",
                              id: pump.id,
                              enabled: !pump.enabled,
                            })
                          }
                        >
                          {t(
                            pump.enabled
                              ? "ui.liquid.disable"
                              : "ui.liquid.enable",
                          )}
                        </button>
                      </>
                    )}
                    {pipe && (
                      <>
                        <p>
                          {t("ui.liquid.inlet")}:{" "}
                          {t(
                            "ui.direction." +
                              ["east", "south", "west", "north"][pipe.inlet],
                          )}{" "}
                          · {t("ui.liquid.outlet")}:{" "}
                          {t(
                            "ui.direction." +
                              ["east", "south", "west", "north"][pipe.outlet],
                          )}
                        </p>
                        <button
                          disabled={pipe.quantity > 0}
                          onClick={() =>
                            act({
                              type: "configurePipe",
                              id: pipe.id,
                              inlet: (pipe.inlet + 1) % 4,
                              outlet: (pipe.outlet + 1) % 4,
                            })
                          }
                        >
                          {t("ui.liquid.rotate")}
                        </button>
                        {[0, 1, 2, 3]
                          .filter((d) => d !== pipe.inlet && d !== pipe.outlet)
                          .map((d) => (
                            <button
                              key={d}
                              disabled={pipe.quantity > 0}
                              onClick={() =>
                                act({
                                  type: "configurePipe",
                                  id: pipe.id,
                                  inlet: pipe.inlet,
                                  outlet: d,
                                })
                              }
                            >
                              {t("ui.liquid.outlet")}:{" "}
                              {t(
                                "ui.direction." +
                                  ["east", "south", "west", "north"][d],
                              )}
                            </button>
                          ))}
                      </>
                    )}
                    {pipe?.quantity ||
                    tank?.quantity ||
                    pump?.incident?.quantity ? (
                      <p>{t("ui.liquid.drain-first")}</p>
                    ) : (
                      <button
                        onClick={() =>
                          act({
                            type: "dismantle",
                            id: (pipe ?? tank ?? pump)!.id,
                          })
                        }
                      >
                        {t("ui.liquid.reclaim")}
                      </button>
                    )}
                  </>
                )}
                {(pressureLine || pressureVessel || compressor) && (
                  <>
                    <h2>
                      {t(
                        "ui.gas." +
                          (pressureLine
                            ? "pressure-line"
                            : pressureVessel
                              ? "pressure-vessel"
                              : "compressor") +
                          ".name",
                      )}
                    </h2>
                    {(pressureLine || pressureVessel) && (
                      <p>
                        {(pressureLine ?? pressureVessel)!.materialId
                          ? materialName(
                              (pressureLine ?? pressureVessel)!.materialId!,
                            )
                          : t("ui.gas.empty")}{" "}
                        · {(pressureLine ?? pressureVessel)!.quantity} /{" "}
                        {pressureVessel?.capacity ??
                          snapshot.gasLogistics!.line.capacity}
                      </p>
                    )}
                    {compressor && (
                      <>
                        <p>{t("ui.gas.status." + compressor.status)}</p>
                        <button
                          onClick={() =>
                            act({
                              type: "setCompressorEnabled",
                              id: compressor.id,
                              enabled: !compressor.enabled,
                            })
                          }
                        >
                          {t(
                            compressor.enabled
                              ? "ui.gas.disable"
                              : "ui.gas.enable",
                          )}
                        </button>
                      </>
                    )}
                    {pressureLine && (
                      <>
                        <p>
                          {t("ui.gas.inlet")}:{" "}
                          {t(
                            "ui.direction." +
                              ["east", "south", "west", "north"][
                                pressureLine.inlet
                              ],
                          )}{" "}
                          · {t("ui.gas.outlet")}:{" "}
                          {t(
                            "ui.direction." +
                              ["east", "south", "west", "north"][
                                pressureLine.outlet
                              ],
                          )}
                        </p>
                        <button
                          disabled={pressureLine.quantity > 0}
                          onClick={() =>
                            act({
                              type: "configurePressureLine",
                              id: pressureLine.id,
                              inlet: (pressureLine.inlet + 1) % 4,
                              outlet: (pressureLine.outlet + 1) % 4,
                            })
                          }
                        >
                          {t("ui.gas.rotate")}
                        </button>
                        {[0, 1, 2, 3]
                          .filter(
                            (d) =>
                              d !== pressureLine.inlet &&
                              d !== pressureLine.outlet,
                          )
                          .map((d) => (
                            <button
                              key={d}
                              disabled={pressureLine.quantity > 0}
                              onClick={() =>
                                act({
                                  type: "configurePressureLine",
                                  id: pressureLine.id,
                                  inlet: pressureLine.inlet,
                                  outlet: d,
                                })
                              }
                            >
                              {t("ui.gas.outlet")}:{" "}
                              {t(
                                "ui.direction." +
                                  ["east", "south", "west", "north"][d],
                              )}
                            </button>
                          ))}
                      </>
                    )}
                    {pressureLine?.quantity || pressureVessel?.quantity ? (
                      <p>{t("ui.gas.drain-first")}</p>
                    ) : (
                      <button
                        onClick={() =>
                          act({
                            type: "dismantle",
                            id: (pressureLine ?? pressureVessel ?? compressor)!
                              .id,
                          })
                        }
                      >
                        {t("ui.gas.reclaim")}
                      </button>
                    )}
                  </>
                )}
                {machine && (
                  <>
                    <small className="eyebrow">
                      {machine.id.toUpperCase()} · AUTOMATED EQUIPMENT
                    </small>
                    <h2>{t(machine.nameKey)}</h2>
                    <div
                      className={
                        "status-line " +
                        (machine.status === "processing" ? "running" : "")
                      }
                    >
                      {machineStatusLabel(machine.status)}
                    </div>
                    <div className="progress-track">
                      <i style={{ width: machine.progress * 100 + "%" }} />
                    </div>
                    <div className="facts">
                      <span>
                        {selectedFuelClass
                          ? t(selectedFuelClass.nameKey)
                          : t("ui.machine.fuel.company")}{" "}
                        / batch
                        <b>{machine.fuelCost}</b>
                      </span>
                      <span>
                        Batch time<b>{machine.durationMs / 1000}s</b>
                      </span>
                    </div>
                    {selectedFuelClass && (
                      <p className="hint">
                        {t("ui.machine.fuel.terminal-held", {
                          count: selectedFuelClass.held,
                          module: t(
                            snapshot.terminalModules.find(
                              (entry) =>
                                entry.id === selectedFuelClass.terminalModuleId,
                            )?.nameKey ?? selectedFuelClass.terminalModuleId,
                          ),
                        })}
                        {!selectedFuelClass.unlocked
                          ? " · " + t("ui.machine.fuel.locked")
                          : ""}
                      </p>
                    )}
                    {machine.operation && (
                      <label className="operation-label">
                        Operation
                        <select
                          aria-label="Machine operation"
                          value={machine.operation}
                          disabled={!!machine.job}
                          onChange={(e) =>
                            act({
                              type: "setOperation",
                              machineId: machine.id,
                              operation: e.target.value,
                            })
                          }
                        >
                          {snapshot.definitions
                            .find((d) => d.id === machine.definitionId)!
                            .operations.map((id) => (
                              <option value={id} key={id}>
                                {t(
                                  snapshot.operations.find((o) => o.id === id)
                                    ?.nameKey ?? id,
                                )}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    {machine.incident && (
                      <div className="milestone">
                        <small>
                          INCIDENT LOCKOUT · {t(machine.incident.classNameKey)}
                        </small>
                        <h3>{t(machine.incident.nameKey)}</h3>
                        <p>{t(machine.incident.textKey)}</p>
                        <p>{t(machine.incident.evidenceKey)}</p>
                        <strong>SAFER NEXT TEST</strong>
                        <p>{t(machine.incident.saferHintKey)}</p>
                        {Object.values(machine.incidentInventory).some(
                          (quantity) => quantity > 0,
                        ) && (
                          <>
                            <strong>TRAPPED MATERIAL</strong>
                            {buffer(machine.incidentInventory)}
                            <button
                              className="primary"
                              onClick={() =>
                                act({
                                  type: "recoverMachineIncident",
                                  machineId: machine.id,
                                })
                              }
                            >
                              Reclaim trapped material to output
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <button
                      className="primary"
                      disabled={
                        !!machine.incident &&
                        Object.values(machine.incidentInventory).some(
                          (quantity) => quantity > 0,
                        )
                      }
                      onClick={() =>
                        act({
                          type: "setEnabled",
                          machineId: machine.id,
                          enabled: !machine.enabled,
                        })
                      }
                    >
                      {machine.incident &&
                      Object.values(machine.incidentInventory).some(
                        (quantity) => quantity > 0,
                      )
                        ? "Recover trapped material first"
                        : machine.incident
                          ? "Acknowledge incident & re-enable"
                          : machine.enabled
                            ? "Stop after this batch"
                            : "Enable automatic operation"}
                    </button>
                    {machine.role === "processor" && (
                      <>
                        <h3>
                          Input{" "}
                          <small>
                            {Object.values(machine.input).reduce(
                              (a, b) => a + b,
                              0,
                            )}{" "}
                            / {machine.capacity}
                          </small>
                        </h3>
                        {buffer(machine.input)}
                      </>
                    )}
                    <h3>
                      Output{" "}
                      <small>
                        {Object.values(machine.output).reduce(
                          (a, b) => a + b,
                          0,
                        )}{" "}
                        / {machine.capacity}
                      </small>
                    </h3>
                    {buffer(machine.output)}
                    <p className="hint">
                      {snapshot.definitions
                        .find((d) => d.id === machine.definitionId)
                        ?.inputStates.includes("gas")
                        ? t("ui.gas.processor-input-help")
                        : snapshot.definitions
                              .find((d) => d.id === machine.definitionId)
                              ?.outputStates.includes("gas")
                          ? t("ui.gas.processor-output-help")
                          : snapshot.definitions
                                .find((d) => d.id === machine.definitionId)
                                ?.inputStates.includes("liquid")
                            ? t("ui.liquid.processor-input-help")
                            : snapshot.definitions
                                  .find((d) => d.id === machine.definitionId)
                                  ?.outputStates.includes("liquid")
                              ? t("ui.liquid.processor-output-help")
                              : "Cyan arrow: incoming belt. Gold arrow: outgoing belt. Unfamiliar outcomes are recorded after processing. Buffers survive disable and save/load. Dismantling needs empty buffers: drain output through belts first."}
                    </p>
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: machine.id })}
                    >
                      Dismantle & reclaim
                    </button>
                  </>
                )}
                {factory && (
                  <>
                    <small className="eyebrow">
                      {factory.width} × {factory.height} CELLS
                    </small>
                    <h2>Factory {factory.id.slice(1)}</h2>
                    <button
                      className="primary"
                      onClick={() => toggleFactory(factory.id)}
                    >
                      <Glyph type="roof" size={16} />
                      {factoryOpen
                        ? "Close roof"
                        : factoryPresentation?.certified
                          ? "Open interior"
                          : "Open interior for diagnosis"}{" "}
                      <kbd>F</kbd>
                    </button>
                    <p className="hint">
                      Roof state is presentation-only. Every machine, belt,
                      buffer and cargo slot continues in the detailed
                      simulation.
                    </p>
                    {factory.relocation && (
                      <div className="milestone">
                        <small>{t("ui.factory.relocation.hold")}</small>
                        <h3>
                          {factory.relocation.remainingTicks > 0
                            ? t("ui.factory.relocation.downtime", {
                                ticks: factory.relocation.remainingTicks,
                              })
                            : factory.relocation.connectionsRestored
                              ? t("ui.factory.relocation.restored")
                              : t("ui.factory.relocation.reconnect")}
                        </h3>
                        <p>
                          {t("ui.factory.relocation.requirements", {
                            count: factory.relocation.requiredConnections,
                          })}
                        </p>
                      </div>
                    )}
                    <h3>Shell reshape</h3>
                    <p className="hint">
                      Move one wall at a time around the existing interior.
                      Equipment stays at its world coordinates; ports and
                      external logistics are never moved implicitly.
                    </p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x - 1,
                            y: factory.y,
                            width: factory.width + 1,
                            height: factory.height,
                          })
                        }
                      >
                        Expand west
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y,
                            width: factory.width + 1,
                            height: factory.height,
                          })
                        }
                      >
                        Expand east
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y - 1,
                            width: factory.width,
                            height: factory.height + 1,
                          })
                        }
                      >
                        Expand north
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y,
                            width: factory.width,
                            height: factory.height + 1,
                          })
                        }
                      >
                        Expand south
                      </button>
                    </div>
                    <div className="button-row">
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x + 1,
                            y: factory.y,
                            width: factory.width - 1,
                            height: factory.height,
                          })
                        }
                      >
                        Trim west
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y,
                            width: factory.width - 1,
                            height: factory.height,
                          })
                        }
                      >
                        Trim east
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y + 1,
                            width: factory.width,
                            height: factory.height - 1,
                          })
                        }
                      >
                        Trim north
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "reshapeFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y,
                            width: factory.width,
                            height: factory.height - 1,
                          })
                        }
                      >
                        Trim south
                      </button>
                    </div>
                    <h3>Intact relocation</h3>
                    <p className="hint">
                      {t("ui.factory.relocation.move-hint", {
                        fuel: snapshot.map.factoryRelocationFuelPerStep,
                        ticks: snapshot.map.factoryRelocationDowntimeTicks,
                      })}
                    </p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "relocateFactory",
                            factoryId: factory.id,
                            x: factory.x - 1,
                            y: factory.y,
                          })
                        }
                      >
                        Move west
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "relocateFactory",
                            factoryId: factory.id,
                            x: factory.x + 1,
                            y: factory.y,
                          })
                        }
                      >
                        Move east
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "relocateFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y - 1,
                          })
                        }
                      >
                        Move north
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          act({
                            type: "relocateFactory",
                            factoryId: factory.id,
                            x: factory.x,
                            y: factory.y + 1,
                          })
                        }
                      >
                        Move south
                      </button>
                    </div>
                    <h3>External contract</h3>
                    {factoryPresentation && (
                      <div
                        className={
                          "status-line " +
                          (factoryPresentation.certified ? "running" : "")
                        }
                      >
                        {factoryPresentation.status}
                      </div>
                    )}
                    <div className="facts">
                      <span>
                        Machines<b>{factory.contract.machineCount}</b>
                      </span>
                      <span>
                        Input ports
                        <b>
                          {
                            factory.ports.filter(
                              (port) => port.role === "input",
                            ).length
                          }
                        </b>
                      </span>
                      <span>
                        Output ports
                        <b>
                          {
                            factory.ports.filter(
                              (port) => port.role === "output",
                            ).length
                          }
                        </b>
                      </span>
                    </div>
                    <div className="inventory">
                      {(
                        Object.entries(factory.contract.statusCounts) as [
                          MachineStatus,
                          number,
                        ][]
                      )
                        .filter(([, count]) => count > 0)
                        .map(([status, count]) => (
                          <div key={status}>
                            <span>{machineStatusLabel(status)}</span>
                            <b>{count}</b>
                          </div>
                        ))}
                      {factory.contract.machineCount === 0 && (
                        <span className="muted">No internal equipment</span>
                      )}
                    </div>
                    {!!Object.keys(factory.contract.gasInventory ?? {})
                      .length && (
                      <>
                        <h3>{t("ui.gas.factory-buffer")}</h3>
                        {buffer(factory.contract.gasInventory ?? {})}
                      </>
                    )}
                    {!!Object.keys(factory.contract.liquidInventory ?? {})
                      .length && (
                      <>
                        <h3>{t("ui.liquid.factory-buffer")}</h3>
                        {buffer(factory.contract.liquidInventory ?? {})}
                      </>
                    )}
                    <h3>Measured throughput</h3>
                    {factoryPresentation?.certified ? (
                      <>
                        <p className="hint">{factoryPresentation.detail}</p>
                        <h4>Inputs</h4>
                        <div className="inventory">
                          {factoryPresentation.inputs.map((rate) => (
                            <div key={"in-" + rate.materialId}>
                              <span>{rate.name}</span>
                              <b>{rate.unitsPerMinute}/min</b>
                            </div>
                          ))}
                        </div>
                        <h4>Outputs</h4>
                        <div className="inventory">
                          {factoryPresentation.outputs.map((rate) => (
                            <div key={"out-" + rate.materialId}>
                              <span>{rate.name}</span>
                              <b>{rate.unitsPerMinute}/min</b>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="hint">
                        {factoryPresentation?.detail ??
                          "Contract presentation unavailable."}
                      </p>
                    )}
                    <p className="hint">
                      This is a read-only view of detailed simulation. Closing
                      the roof never replaces it with aggregate execution.
                    </p>
                    <h3>
                      {factoryOpen ? "Diagnostic buffers" : "Observed buffers"}
                    </h3>
                    {buffer(
                      snapshot.machines
                        .filter((m) => m.factoryId === factory.id)
                        .reduce<Inventory>((sum, m) => {
                          for (const [id, n] of Object.entries(m.output))
                            sum[id] = (sum[id] ?? 0) + n;
                          return sum;
                        }, {}),
                    )}
                    <h3>
                      {factoryOpen ? "Diagnostic equipment" : "Equipment"}
                    </h3>
                    {snapshot.machines
                      .filter((m) => m.factoryId === factory.id)
                      .map((m) => (
                        <button
                          className="entity-row"
                          key={m.id}
                          onClick={() => {
                            if (!mode.openFactories.includes(factory.id))
                              toggleFactory(factory.id);
                            select(m.id);
                          }}
                        >
                          <span>{t(m.nameKey)}</span>
                          <small>{machineStatusLabel(m.status)}</small>
                        </button>
                      ))}
                    <button
                      className="secondary"
                      onClick={() => setTool("port")}
                    >
                      Add a wall port
                    </button>
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: factory.id })}
                    >
                      Dismantle empty factory
                    </button>
                  </>
                )}
                {belt && (
                  <>
                    <h2>Ground belt</h2>
                    <p className="hint">
                      Direction:{" "}
                      {["east", "south", "west", "north"][belt.direction]}. One
                      cargo slot; stops when the next cell is occupied.
                    </p>
                    {belt.cargo ? (
                      buffer({ [belt.cargo]: 1 })
                    ) : (
                      <p className="muted">No cargo</p>
                    )}
                    {!belt.junction && (
                      <>
                        <h3>{t("ui.diverter.heading")}</h3>
                        <p className="hint">
                          {belt.alternate === null
                            ? t("ui.diverter.none")
                            : t("ui.diverter.status", {
                                direction: t(
                                  "ui.direction." + belt.alternate,
                                ),
                                route: t(
                                  belt.switched
                                    ? "ui.diverter.route-name.alternate"
                                    : "ui.diverter.route-name.primary",
                                ),
                              })}
                        </p>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({ type: "rotateDivert", beltId: belt.id })
                          }
                        >
                          {t("ui.diverter.cycle")}
                        </button>
                        <button
                          className="secondary"
                          disabled={!belt.switched}
                          onClick={() =>
                            act({
                              type: "setDivertRoute",
                              beltId: belt.id,
                              route: "primary",
                            })
                          }
                        >
                          {t("ui.diverter.select-primary")}
                        </button>
                        <button
                          className="secondary"
                          disabled={
                            belt.alternate === null || belt.switched
                          }
                          onClick={() =>
                            act({
                              type: "setDivertRoute",
                              beltId: belt.id,
                              route: "alternate",
                            })
                          }
                        >
                          {t("ui.diverter.select-alternate")}
                        </button>
                      </>
                    )}
                    <h3>
                      {belt.junction
                        ? t(
                            snapshot.junctionDefinitions.find(
                              (d) => d.id === belt.junction!.definitionId,
                            )?.nameKey ?? "ui.junction.upgrade",
                          )
                        : t("ui.junction.upgrade")}
                    </h3>
                    <p className="hint">
                      {t(
                        belt.junction?.crossing
                          ? "ui.crossing.rule"
                          : "ui.junction.rule",
                      )}
                    </p>
                    {snapshot.junctionDefinitions
                      .filter((d) => d.id !== belt.junction?.definitionId)
                      .map((d) => (
                        <button
                          className="secondary"
                          key={d.id}
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: d.id,
                              direction: belt.direction,
                              branch: belt.junction?.branch ?? 1,
                            })
                          }
                        >
                          {t(d.nameKey)} ·{" "}
                          {t("ui.junction.cost-label", {
                            cost:
                              d.cost -
                              (snapshot.junctionDefinitions.find(
                                (old) => old.id === belt.junction?.definitionId,
                              )?.cost ?? 0),
                          })}
                        </button>
                      ))}
                    {belt.junction && (
                      <>
                        {belt.junction.crossing ? (
                          <>
                            <p className="hint">
                              {t("ui.crossing.signal", {
                                axis: t(
                                  belt.junction.crossing.axis === 0
                                    ? "ui.crossing.horizontal"
                                    : "ui.crossing.vertical",
                                ),
                                steps: belt.junction.crossing.remaining,
                              })}
                            </p>
                            {belt.junction.crossing.pending !== null && (
                              <p className="hint">
                                {t("ui.crossing.pending", {
                                  axis: t(
                                    belt.junction.crossing.pending === 0
                                      ? "ui.crossing.horizontal"
                                      : "ui.crossing.vertical",
                                  ),
                                })}
                              </p>
                            )}
                            {belt.junction.crossing.held !== null && (
                              <p className="hint">
                                {t("ui.crossing.held", {
                                  axis: t(
                                    belt.junction.crossing.held === 0
                                      ? "ui.crossing.horizontal"
                                      : "ui.crossing.vertical",
                                  ),
                                  direction: t(
                                    "ui.direction." +
                                      ["east", "south", "west", "north"][
                                        beltArms(
                                          {
                                            junctions:
                                              snapshot.junctionDefinitions,
                                          },
                                          belt,
                                        ).outlets[belt.junction.crossing.held]
                                      ],
                                  ),
                                })}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="hint">
                            {t("ui.junction.preferred")}:{" "}
                            {t(
                              "ui.direction." +
                                ["east", "south", "west", "north"][
                                  (snapshot.junctionDefinitions.find(
                                    (d) => d.id === belt.junction!.definitionId,
                                  )?.kind === "merger"
                                    ? beltArms(
                                        {
                                          junctions:
                                            snapshot.junctionDefinitions,
                                        },
                                        belt,
                                      ).inlets
                                    : beltArms(
                                        {
                                          junctions:
                                            snapshot.junctionDefinitions,
                                        },
                                        belt,
                                      ).outlets)[belt.junction.cursor]
                                ],
                            )}
                          </p>
                        )}
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: belt.junction!.definitionId,
                              direction: (belt.direction + 1) % 4,
                              branch: belt.junction!.branch,
                            })
                          }
                        >
                          {t(
                            belt.junction.crossing
                              ? "ui.crossing.rotate"
                              : "ui.junction.rotate",
                          )}
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: belt.junction!.definitionId,
                              direction: belt.direction,
                              branch: belt.junction!.branch === 1 ? -1 : 1,
                            })
                          }
                        >
                          {t("ui.junction.mirror")}
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: null,
                              direction: belt.direction,
                              branch: 1,
                            })
                          }
                        >
                          {t(
                            belt.junction.crossing
                              ? "ui.crossing.remove"
                              : "ui.junction.remove",
                          )}
                        </button>
                      </>
                    )}
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: belt.id })}
                    >
                      {belt.junction
                        ? t("ui.junction.reclaim")
                        : "Reclaim belt & cargo"}
                    </button>
                  </>
                )}
                {storage && (
                  <>
                    <small className="eyebrow">
                      {storage.id.toUpperCase()} · BULK STORAGE
                    </small>
                    <h2>
                      {t(
                        snapshot.storageDefinitions.find(
                          (d) => d.id === storage.definitionId,
                        )?.nameKey ?? storage.definitionId,
                      )}
                    </h2>
                    <div className="facts">
                      <span>
                        Stored
                        <b>
                          {Object.values(storage.inventory).reduce(
                            (a, b) => a + b,
                            0,
                          )}{" "}
                          / {storage.capacity}
                        </b>
                      </span>
                    </div>
                    {buffer(storage.inventory)}
                    <p className="hint">
                      Belts move any material in and out. Empty storage before
                      dismantling.
                    </p>
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: storage.id })}
                    >
                      Dismantle empty storage
                    </button>
                  </>
                )}
                {portFactory && !belt && !machine && (
                  <>
                    <h2>Wall port</h2>
                    <p className="hint">
                      Place a belt on this cell with the same flow direction.
                      Remove that belt before reclaiming the port.
                    </p>
                    <button
                      className="danger"
                      onClick={() =>
                        act({ type: "dismantle", id: mode.selected! })
                      }
                    >
                      Reclaim port
                    </button>
                  </>
                )}
                {deposit && (
                  <>
                    <small className="eyebrow">SURFACE DEPOSIT</small>
                    <h2>{materialName(deposit.material)}</h2>
                    <div className="facts">
                      <span>
                        Remaining<b>{deposit.remaining}</b>
                      </span>
                    </div>
                    <p className="hint">
                      Place an extractor entirely inside this field. Route its
                      output to a processor.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setTool("extractor")}
                    >
                      Place {toolName("extractor").toLowerCase()}
                    </button>
                  </>
                )}
              </>
            )}
            {panel === "knowledge" && (
              <>
                <h2>Learn by doing.</h2>
                <p className="hint">
                  Known construction methods and your observed discoveries.
                  There is no complete recipe book.
                </p>
                {snapshot.knowledgeInsights.length > 0 && (
                  <>
                    <h3>{t("ui.knowledge.insights.heading")}</h3>
                    {snapshot.knowledgeInsights
                      .filter((entry) =>
                        knowledgeVisible(
                          knowledgeFilter,
                          entry.kind === "branch"
                            ? "insight-branch"
                            : "insight-other",
                        ),
                      )
                      .map((entry) => (
                      <article
                        className="observation"
                        key={"insight-" + entry.id}
                      >
                        <small>
                          {t(
                            "ui.knowledge.insight." + entry.kind,
                          ).toUpperCase()}
                        </small>
                        <h3>{materialName(entry.materialId)}</h3>
                        <p>{t(entry.textKey)}</p>
                      </article>
                    ))}
                  </>
                )}
                {snapshot.hazardEvidence
                  .filter(() => knowledgeVisible(knowledgeFilter, "hazard"))
                  .map((entry) => {
                  const operationKey = snapshot.operations.find(
                    (op) => op.id === entry.operationId,
                  )?.nameKey;
                  const operationName = operationKey
                    ? t(operationKey)
                    : "Unknown operation";
                  const setupName = entry.setupNameKey
                    ? t(entry.setupNameKey)
                    : null;
                  return (
                    <article className="observation" key={"hazard-" + entry.id}>
                      <small>
                        HAZARD EVIDENCE · {t(entry.classNameKey).toUpperCase()}
                      </small>
                      <h3>{t(entry.nameKey)}</h3>
                      <p>{t(entry.textKey)}</p>
                      <p>{t(entry.evidenceKey)}</p>
                      <strong>SAFER NEXT TEST</strong>
                      <p>{t(entry.saferHintKey)}</p>
                      <span>
                        {materialName(entry.inputId)} → {operationName}
                        {setupName ? " · " + setupName : ""}
                      </span>
                    </article>
                  );
                })}
                {snapshot.knowledgeEntries
                  .filter((entry) =>
                    knowledgeVisible(
                      knowledgeFilter,
                      entry.state === "hinted" ? "hinted" : "confirmed",
                    ),
                  )
                  .map((entry) => {
                  const operationKey = snapshot.operations.find(
                    (op) => op.id === entry.operationId,
                  )?.nameKey;
                  const operationName = operationKey
                    ? t(operationKey)
                    : "Unknown operation";
                  const setupName = entry.setupNameKey
                    ? t(entry.setupNameKey)
                    : null;
                  return (
                    <article className="observation" key={entry.id}>
                      <small>
                        {entry.state === "hinted"
                          ? "UNCONFIRMED"
                          : entry.initial
                            ? "KNOWN METHOD"
                            : "OBSERVED"}{" "}
                        · {operationName.toUpperCase()}
                      </small>
                      <h3>
                        {entry.state === "hinted"
                          ? "Outcome unconfirmed"
                          : materialName(entry.outputId!)}
                      </h3>
                      <p>
                        {entry.state === "hinted"
                          ? "This setup has been tried. Its result is not confirmed yet."
                          : t(entry.textKey!)}
                      </p>
                      <span>
                        {materialName(entry.inputId)} → {operationName}
                        {setupName ? " · " + setupName : ""}
                      </span>
                    </article>
                  );
                })}
              </>
            )}
            {panel === "terminal" && (
              <>
                <small className="eyebrow">ORBITAL UPLINK · CONNECTED</small>
                <h2>Keep the expedition moving.</h2>
                <div className="facts">
                  <span>
                    Exported<b data-testid="exported">{snapshot.exported}</b>
                  </span>
                  <span>
                    Obligation<b>{snapshot.debt} fuel</b>
                  </span>
                </div>
                {snapshot.milestone && (
                  <div className="milestone">◇ FIRST EXPORT CONFIRMED</div>
                )}
                <h3>{t("ui.terminal.milestones.heading")}</h3>
                {snapshot.milestones.map((milestone) => (
                  <article className="observation" key={milestone.id}>
                    <small>
                      {t(
                        milestone.completed
                          ? "ui.terminal.milestone.completed"
                          : "ui.terminal.milestone.pending",
                      )}
                    </small>
                    <h3>{t(milestone.nameKey)}</h3>
                    <p>{t(milestone.hintKey)}</p>
                  </article>
                ))}
                <h3>{t("ui.terminal.market-bulletins.heading")}</h3>
                <p className="hint">
                  {t("ui.terminal.market-bulletins.hint")}
                </p>
                {snapshot.marketBulletins.length ? (
                  snapshot.marketBulletins.map((bulletin) => (
                    <article className="observation" key={bulletin.id}>
                      <small>
                        {t("ui.terminal.market-bulletin.meta", {
                          material: materialName(bulletin.materialId),
                          direction: bulletin.demandDeltaBps > 0 ? "+" : "",
                          delta: Math.round(bulletin.demandDeltaBps / 100),
                        })}
                      </small>
                      <h3>{t(bulletin.nameKey)}</h3>
                      <p>{t(bulletin.briefKey)}</p>
                    </article>
                  ))
                ) : (
                  <p className="hint">
                    {t("ui.terminal.market-bulletins.empty")}
                  </p>
                )}
                <h3 id="terminal-work">{t("ui.terminal.opportunities.heading")}</h3>
                <p className="hint">{t("ui.terminal.opportunities.hint")}</p>
                {snapshot.opportunities.length ? (
                  snapshot.opportunities.map((opportunity) => {
                    const operation =
                        opportunity.kind === "directive"
                          ? snapshot.operations.find(
                              (entry) => entry.id === opportunity.operationId,
                            )
                          : null,
                      operationName = operation
                        ? t(operation.nameKey)
                        : t("ui.terminal.opportunity.experiment-fallback"),
                      rewardSupply =
                        opportunity.kind === "property-directive" &&
                        opportunity.rewardImportSupplyId
                          ? snapshot.importSupplies.find(
                              (entry) =>
                                entry.id === opportunity.rewardImportSupplyId,
                            )
                          : null;
                    return (
                      <article className="observation" key={opportunity.id}>
                        <small>
                          {opportunity.kind === "order"
                            ? t("ui.terminal.opportunity.order-meta", {
                                reward: opportunity.rewardFuel,
                              })
                            : opportunity.kind === "property-directive" &&
                                rewardSupply
                              ? t("ui.terminal.opportunity.property-meta", {
                                  supply: t(rewardSupply.nameKey),
                                })
                              : opportunity.kind === "property-directive" &&
                                  opportunity.rewardImportSupplyId
                                ? t("ui.terminal.opportunity.research-meta")
                                : t("ui.terminal.opportunity.directive-meta", {
                                    reward: opportunity.rewardFuel,
                                  })}
                        </small>
                        <h3>{t(opportunity.nameKey)}</h3>
                        <p>{t(opportunity.briefKey)}</p>
                        <span>
                          {opportunity.kind === "order"
                            ? t("ui.terminal.opportunity.order-progress", {
                                material: materialName(opportunity.materialId),
                                progress: opportunity.progress,
                                quantity: opportunity.quantity,
                              })
                            : opportunity.kind === "property-directive"
                              ? t(
                                  "ui.terminal.opportunity.property-progress",
                                  {
                                    material: materialName(
                                      opportunity.targetMaterialId,
                                    ),
                                    property: t(opportunity.propertyKey),
                                  },
                                )
                              : opportunity.setupNameKey
                                ? t(
                                    "ui.terminal.opportunity.directive-progress-setup",
                                    {
                                      material: materialName(
                                        opportunity.inputMaterialId,
                                      ),
                                      operation: operationName,
                                      setup: t(opportunity.setupNameKey),
                                    },
                                  )
                                : t(
                                    "ui.terminal.opportunity.directive-progress",
                                    {
                                      material: materialName(
                                        opportunity.inputMaterialId,
                                      ),
                                      operation: operationName,
                                    },
                                  )}
                        </span>
                      </article>
                    );
                  })
                ) : (
                  <p className="hint">{t("ui.terminal.opportunities.empty")}</p>
                )}
                <h3 id="terminal-handling">{t("ui.terminal.module.heading")}</h3>
                {snapshot.terminalModules.map((d) => (
                  <div className="opportunity" key={d.id}>
                    <h4>{t(d.nameKey)}</h4>
                    <p>
                      {t("ui.terminal.module.meta", {
                        quantity: d.contents.quantity,
                        capacity: d.capacity,
                        cost: d.cost,
                      })}
                    </p>
                    <p>
                      {d.contents.materialId
                        ? materialName(d.contents.materialId)
                        : t("ui.terminal.module.empty")}
                    </p>
                    <p className="hint">
                      {t("ui.terminal.module.inlet", {
                        x: snapshot.map.terminal.x + d.inlet.x,
                        y: snapshot.map.terminal.y + d.inlet.y,
                        side: t("ui.direction." + d.inlet.side),
                      })}
                    </p>
                    {d.blockedReason && (
                      <p className="hint">
                        {t("ui.terminal.module.result." + d.blockedReason)}
                      </p>
                    )}
                    <button
                      disabled={d.installed ? !d.canRemove : !d.canInstall}
                      onClick={() =>
                        act({
                          type: d.installed
                            ? "removeTerminalModule"
                            : "installTerminalModule",
                          definitionId: d.id,
                        })
                      }
                    >
                      {t(
                        d.installed
                          ? "ui.terminal.module.remove"
                          : "ui.terminal.module.install",
                        { module: t(d.nameKey) },
                      )}
                    </button>
                  </div>
                ))}
                <h3>{t("ui.terminal.import.heading")}</h3>
                <p className="hint">{t("ui.terminal.import.hint")}</p>
                <p>
                  {t("ui.terminal.import.capacity", {
                    used: Object.values(snapshot.importStaging).reduce(
                      (sum, units) => sum + units,
                      0,
                    ),
                    capacity: snapshot.map.terminalShipmentCapacity,
                  })}
                </p>
                <p className="hint">
                  {t("ui.terminal.import.outlet", {
                    x: snapshot.importOutlet.x,
                    y: snapshot.importOutlet.y,
                    side: t("ui.direction." + snapshot.importOutlet.direction),
                  })}
                </p>
                {snapshot.importSupplies.map((supply) => (
                  <article className="observation" key={supply.id}>
                    <small>
                      {t("ui.terminal.import.meta", {
                        quantity: supply.quantity,
                        cost: supply.fuelCost,
                      })}
                    </small>
                    <h3>{t(supply.nameKey)}</h3>
                    <p>{t(supply.briefKey)}</p>
                    <span>
                      {t("ui.terminal.import.held", {
                        material: materialName(supply.materialId),
                        quantity: supply.held,
                      })}
                    </span>
                    {supply.allocations > 0 && (
                      <span>
                        {t("ui.terminal.import.allocation", {
                          count: supply.allocations,
                        })}
                      </span>
                    )}
                    <button
                      className="secondary"
                      disabled={!supply.eligible}
                      onClick={() =>
                        act({ type: "requestImport", supplyId: supply.id })
                      }
                    >
                      {t("ui.terminal.import.request", {
                        supply: t(supply.nameKey),
                      })}
                    </button>
                    {!supply.eligible && supply.reason && (
                      <span>
                        {t("ui.terminal.import.result." + supply.reason)}
                      </span>
                    )}
                  </article>
                ))}
                <h3 id="terminal-shipment">{t("ui.terminal.shipment.heading")}</h3>
                <p className="hint">{t("ui.terminal.shipment.hint")}</p>
                <p>
                  {t("ui.terminal.shipment.capacity", {
                    selected: shipmentSelected,
                    capacity: snapshot.map.terminalShipmentCapacity,
                  })}
                </p>
                {snapshot.materials
                  .filter((material) => exchangeFor(material.id))
                  .map((material) => {
                    const listing = exchangeFor(material.id)!;
                    const available = terminalQuantity(material.id);
                    const handlingLocked =
                      listing.handling !== null && !listing.handling.unlocked;
                    return (
                      <div className="policy" key={"manifest-" + material.id}>
                        <div>
                          <i style={{ background: material.color }} />
                          <span>
                            {t(material.nameKey)}
                            <small>{available} physically staged</small>
                          </span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={Math.min(
                            available,
                            snapshot.map.terminalShipmentCapacity,
                          )}
                          step={1}
                          disabled={handlingLocked || available === 0}
                          aria-label={t("ui.terminal.shipment.quantity", {
                            material: t(material.nameKey),
                          })}
                          value={snapshot.shipmentManifest[material.id] ?? 0}
                          onChange={(e) =>
                            act({
                              type: "setShipmentQuantity",
                              materialId: material.id,
                              quantity: Math.max(
                                0,
                                Math.floor(Number(e.target.value) || 0),
                              ),
                            })
                          }
                        />
                      </div>
                    );
                  })}
                <button
                  className="primary"
                  disabled={shipmentSelected === 0}
                  onClick={() => act({ type: "dispatchShipment" })}
                >
                  {t("ui.terminal.shipment.dispatch")}
                </button>
                <h3>Terminal staging & policies</h3>
                <p className="hint">
                  Exportable cargo remains physical at the terminal. Use a
                  manifest for exact one-off shipments, or keep legacy
                  auto-export enabled for continuous flow. Both paths share the
                  same cargo capacity and handling gates. Reserved{" "}
                  {materialName(snapshot.map.buildMaterial).toLowerCase()} fund
                  construction. Exports repay obligations before allocating
                  fuel.
                </p>
                {snapshot.materials.map((m) => (
                  <div className="policy" key={m.id}>
                    <div>
                      <i style={{ background: m.color }} />
                      <span>
                        {t(m.nameKey)}
                        <small>
                          {(m.id === snapshot.map.buildMaterial
                            ? snapshot.stock[m.id]
                            : m.handlingState === "solid"
                              ? snapshot.staging[m.id]
                              : snapshot.terminalModules.reduce(
                                  (n, d) =>
                                    n +
                                    (d.contents.materialId === m.id
                                      ? d.contents.quantity
                                      : 0),
                                  0,
                                )) ?? 0}{" "}
                          {m.id === snapshot.map.buildMaterial
                            ? "reserved"
                            : m.handlingState === "solid"
                              ? "staged"
                              : t("ui.terminal.module.staged")}{" "}
                          {exchangeFor(m.id)
                            ? "· " +
                              exchangeFor(m.id)!.compensationPerUnit +
                              " fuel/unit · " +
                              Math.round(exchangeFor(m.id)!.demandBps / 100) +
                              "% demand · " +
                              Math.round(
                                exchangeFor(m.id)!.saturationBps / 100,
                              ) +
                              "% saturated"
                            : ""}
                          {exchangeFor(m.id)?.handling
                            ? " · " +
                              t(
                                exchangeFor(m.id)!.handling!.unlocked
                                  ? "ui.terminal.handling.ready"
                                  : "ui.terminal.handling.locked",
                                {
                                  capability: t(
                                    exchangeFor(m.id)!.handling!.nameKey,
                                  ),
                                },
                              )
                            : ""}
                        </small>
                      </span>
                    </div>
                    <select
                      aria-label={t(m.nameKey) + " policy"}
                      value={snapshot.policies[m.id] ?? "keep"}
                      onChange={(e) =>
                        act({
                          type: "setPolicy",
                          materialId: m.id,
                          policy: e.target.value as "keep" | "export",
                        })
                      }
                    >
                      <option value="keep">Keep</option>
                      {exchangeFor(m.id) && (
                        <option value="export">Auto-export</option>
                      )}
                    </select>
                  </div>
                ))}
                <h3 id="terminal-company">{t("ui.terminal.assistance.heading")}</h3>
                <p className="hint">
                  {t(
                    snapshot.company.standing === "clear"
                      ? "ui.terminal.assistance.clear"
                      : "ui.terminal.assistance.recovery",
                  )}
                  {snapshot.company.standing === "recovery"
                    ? " · " +
                      t("ui.terminal.assistance.progress", {
                        progress: snapshot.company.recoveryNetFuel,
                        target: snapshot.company.recoveryTargetNetFuel,
                      })
                    : ""}
                </p>
                {snapshot.assistance.map((assistance) => (
                  <article className="observation" key={assistance.id}>
                    <small>
                      {t("ui.terminal.assistance.package-meta", {
                        grant: assistance.grantFuel,
                        obligation: assistance.nextObligationFuel,
                      })}
                    </small>
                    <h3>{t(assistance.nameKey)}</h3>
                    <p>{t(assistance.briefKey)}</p>
                    <button
                      className="secondary"
                      disabled={!assistance.eligible}
                      onClick={() =>
                        act({
                          type: "assistance",
                          packageId: assistance.id,
                        })
                      }
                    >
                      {t("ui.terminal.assistance.request")}
                    </button>
                    {!assistance.eligible && assistance.reason && (
                      <span>
                        {t(
                          assistance.reason === "obligation-open"
                            ? "ui.terminal.assistance.unavailable-obligation"
                            : "ui.terminal.assistance.unavailable-fuel",
                        )}
                      </span>
                    )}
                  </article>
                ))}
              </>
            )}
            {panel === "configuration" && (
              <>
                <h2>Game Configuration</h2>
                <p className="hint">
                  Camera, controls, and interface preferences are stored on
                  this device, separately from expedition saves.
                </p>
                <section className="configuration-section">
                  <small className="eyebrow">CAMERA</small>
                  <label className="configuration-option">
                    <span>
                      Smooth camera motion
                      <small>Ease camera movement instead of snapping.</small>
                    </span>
                    <input
                      type="checkbox"
                      aria-label="Smooth camera motion"
                      checked={preferences.camera.smooth}
                      onChange={(event) =>
                        updateCamera({ smooth: event.currentTarget.checked })
                      }
                    />
                  </label>
                  {(
                    [
                      ["panSpeed", "Pan speed", "How quickly the camera moves"],
                      [
                        "zoomSensitivity",
                        "Zoom sensitivity",
                        "How much each wheel or pinch step changes the view",
                      ],
                      [
                        "inertia",
                        "Camera inertia",
                        "How gently camera movement settles",
                      ],
                    ] as const
                  ).map(([key, title, description]) => (
                    <label className="configuration-range" key={key}>
                      <span>
                        {title}
                        <small>{description}</small>
                      </span>
                      <input
                        type="range"
                        aria-label={title}
                        min={CAMERA_TUNING_BOUNDS[key].min}
                        max={CAMERA_TUNING_BOUNDS[key].max}
                        step={CAMERA_TUNING_BOUNDS[key].step}
                        value={preferences.camera[key]}
                        onChange={(event) =>
                          updateCamera({
                            [key]: Number(event.currentTarget.value),
                          })
                        }
                      />
                      <output>{preferences.camera[key].toFixed(1)}×</output>
                    </label>
                  ))}
                </section>
                <section className="configuration-section">
                  <small className="eyebrow">CONTROLS</small>
                  <label className="configuration-option">
                    <span>
                      Invert mouse wheel zoom
                      <small>Reverse the wheel direction for zooming.</small>
                    </span>
                    <input
                      type="checkbox"
                      aria-label="Invert mouse wheel zoom"
                      checked={preferences.controls.invertWheelZoom}
                      onChange={(event) =>
                        commitPreferences({
                          ...preferences,
                          controls: {
                            ...preferences.controls,
                            invertWheelZoom: event.currentTarget.checked,
                          },
                        })
                      }
                    />
                  </label>
                </section>
                <section className="configuration-section">
                  <small className="eyebrow">INTERFACE & ACCESSIBILITY</small>
                  <label className="configuration-option">
                    <span>
                      Show FPS
                      <small>
                        Display an unobtrusive frame rate counter during play.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      aria-label="Show FPS"
                      checked={preferences.interface.showFps}
                      onChange={(event) =>
                        commitPreferences({
                          ...preferences,
                          interface: {
                            ...preferences.interface,
                            showFps: event.currentTarget.checked,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="configuration-option">
                    <span>
                      Reduce motion
                      <small>
                        System follows your device preference. On disables
                        decorative easing; Off allows game motion.
                      </small>
                    </span>
                    <select
                      aria-label="Reduce motion"
                      value={preferences.accessibility.reducedMotion}
                      onChange={(event) =>
                        commitPreferences({
                          ...preferences,
                          accessibility: {
                            reducedMotion: event.currentTarget.value as
                              GamePreferences["accessibility"]["reducedMotion"],
                          },
                        })
                      }
                    >
                      <option value="system">System</option>
                      <option value="on">On</option>
                      <option value="off">Off</option>
                    </select>
                  </label>
                  <label className="configuration-option">
                    <span>
                      Promote last-used group tool
                      <small>
                        Make the most recently chosen tool the primary of its
                        build group.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      aria-label="Promote last-used group tool"
                      checked={preferences.buildPalette.promoteLastUsed}
                      onChange={(event) =>
                        setPromoteLastUsed(event.currentTarget.checked)
                      }
                    />
                  </label>
                </section>
                <button className="secondary" onClick={resetPreferences}>
                  Reset configuration to defaults
                </button>
                <p className="hint">
                  Configuration version {preferences.version}. These
                  preferences persist independently of your saved world.
                </p>
              </>
            )}
            {panel === "menu" && (
              <>
                <h2>Expedition controls</h2>
                <button
                  className="secondary"
                  onClick={() => setPanel("configuration")}
                >
                  <Glyph type="settings" size={17} />
                  Game settings &amp; controls
                </button>
                <button className="primary" onClick={() => persist(false)}>
                  <Glyph type="save" size={17} />
                  Save world
                </button>
                <button className="secondary" onClick={() => persist(true)}>
                  Load saved world
                </button>
                <p className="hint">
                  Saved locally on this device. Worlds pause while the tab is
                  hidden. Old fixed-site saves are incompatible.
                </p>
                <section className="configuration-section">
                  <h3>Offline content packs</h3>
                  <p className="hint">Import a validated Studio JSON bundle into this already-built client. Selecting it always starts a NEW expedition; existing saves stay separate.</p>
                  <p className="hint">Active: {activePack ? "Imported · " + activePack.fingerprint.slice(0, 12) : "Built-in content"}</p>
                  <label className="configuration-option">
                    <span>Choose Studio JSON bundle (max 2 MiB)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      aria-label="Choose Studio JSON content pack"
                      onChange={(event) => {
                        void importPack(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {pendingPack && (
                    <div className="reset-confirm">
                      <p>Validated SHA-256: {pendingPack.fingerprint.slice(0, 16)}. Start a NEW expedition? Unsaved world progress will be lost; all existing saved worlds remain stored.</p>
                      <button className="primary" onClick={() => choosePack(pendingPack)}>
                        Play new expedition with imported pack
                      </button>
                      <button className="secondary" onClick={() => setPendingPack(null)}>Cancel import</button>
                    </div>
                  )}
                  {activePack && (
                    <button className="secondary" onClick={() => choosePack(null)}>
                      Start new expedition with built-in content
                    </button>
                  )}
                </section>
                <h3>Controls</h3>
                <dl className="controls-list">
                  <dt>Pan</dt>
                  <dd>WASD / arrows / right-drag</dd>
                  <dt>Zoom</dt>
                  <dd>Mouse wheel</dd>
                  <dt>Rotate</dt>
                  <dd>R</dd>
                  <dt>Cancel / close</dt>
                  <dd>Esc</dd>
                  <dt>Center site</dt>
                  <dd>Home</dd>
                  <dt>Factory roof</dt>
                  <dd>Select factory + F</dd>
                  <dt>Build groups</dt>
                  <dd>1–8 · tap selects, hold opens group</dd>
                  <dt>Open group</dt>
                  <dd>1–N selects the shown child</dd>
                  <dt>Dismantle</dt>
                  <dd>X</dd>
                </dl>
                {confirmReset ? (
                  <div className="reset-confirm">
                    <p>
                      Start a new expedition? Unsaved progress will be lost;
                      your saved world stays available.
                    </p>
                    <button
                      className="danger"
                      onClick={() => {
                        session.reset();
                        setMode(DEFAULT_MODE);
                        setPanel(null);
                        setConfirmReset(false);
                        setGuide(true);
                        setHomeToken((n) => n + 1);
                      }}
                    >
                      Start new expedition
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="danger"
                    onClick={() => setConfirmReset(true)}
                  >
                    New expedition
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      )}
      <div className="build-zone">
        {mode.tool !== "select" && (
          <div className="build-hint">
            <strong>{toolName(mode.tool)}</strong>
            <span>{toolDescription(mode.tool)}</span>
            <button
              aria-label="Rotate build direction"
              onClick={() =>
                setMode((m) => ({ ...m, direction: (m.direction + 1) % 4 }))
              }
            >
              <kbd>R</kbd> {["→", "↓", "←", "↑"][mode.direction]}
            </button>
            <button
              aria-label="Cancel building"
              onClick={() => setTool("select")}
            >
              <kbd>Esc</kbd>
            </button>
          </div>
        )}
        {openToolGroup && (
          <button
            className="build-menu-scrim"
            aria-label="Close build submenu"
            onPointerDown={() => setOpenToolGroup(null)}
          />
        )}
        <nav className="build-bar" aria-label="Build tools">
          {BUILD_PALETTE.map((entry) => {
            if (entry.kind === "tool") {
              const tool = entry.tool;
              return (
                <button
                  key={tool}
                  className={
                    (mode.tool === tool ? "active " : "") +
                    (toolLocked(tool) ? "locked" : "")
                  }
                  aria-label={toolName(tool)}
                  aria-pressed={mode.tool === tool}
                  aria-disabled={toolLocked(tool)}
                  aria-keyshortcuts={tool === "demolish" ? "x" : undefined}
                  title={toolDescription(tool)}
                  onClick={() => {
                    setOpenToolGroup(null);
                    setTool(tool);
                  }}
                >
                  {toolTile(tool, TOOL_HOTKEYS[tool])}
                </button>
              );
            }

            const group = groupFor(entry.groupId);
            const primary = groupPrimary(group.id);
            const open = openToolGroup === group.id;
            const groupActive = group.tools.includes(mode.tool) ||
              (group.id === "processing" && packMachineTools.includes(mode.tool));
            return (
              <div className="build-group" key={group.id}>
                {open && (
                  <div
                    className="build-submenu"
                    role="menu"
                    aria-label={toolName(primary) + " related tools"}
                  >
                    {group.tools.map((tool) => {
                      const shortcut = buildContextShortcutForTool(group.id, tool);
                      return (
                        <button
                          key={tool}
                          role="menuitem"
                          className={
                            (mode.tool === tool ? "active " : "") +
                            (toolLocked(tool) ? "locked" : "")
                          }
                          aria-label={toolName(tool)}
                          aria-disabled={toolLocked(tool)}
                          aria-keyshortcuts={shortcut ?? undefined}
                          title={toolDescription(tool)}
                          onClick={() => chooseGroupTool(tool)}
                        >
                          {toolTile(tool, shortcut)}
                        </button>
                      );
                    })}
                    {group.id === "processing" && packMachineTools.map((tool) => (
                      <button
                        key={tool}
                        role="menuitem"
                        className={mode.tool === tool ? "active" : ""}
                        aria-label={toolName(tool)}
                        aria-disabled={toolLocked(tool)}
                        title={toolDescription(tool) || "Imported machine · new expedition content"}
                        onClick={() => chooseGroupTool(tool)}
                      >
                        {toolTile(tool, null)}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={
                    (groupActive ? "active " : "") +
                    (toolLocked(primary) ? "locked " : "") +
                    "group-primary"
                  }
                  data-build-group={group.id}
                  aria-label={toolName(primary) + " group"}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  aria-pressed={groupActive}
                  aria-disabled={toolLocked(primary)}
                  aria-keyshortcuts={group.shortcut}
                  title={toolDescription(primary) + " · Hold for related tools"}
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse" && event.button !== 0) return;
                    startGroupPress(group.id);
                  }}
                  onPointerUp={cancelGroupPress}
                  onPointerCancel={cancelGroupPress}
                  onPointerLeave={cancelGroupPress}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={() => activateGroupPrimary(group.id)}
                >
                  {toolTile(primary, group.shortcut)}
                  <i className="group-marker" aria-hidden="true">▲</i>
                </button>
              </div>
            );
          })}
        </nav>
        {["pipe", "underground-liquid", "tank", "pump"].includes(mode.tool) && (
          <label>
            {t("ui.containment.profile")}
            <select
              aria-label={t("ui.containment.build-profile")}
              value={mode.containmentProfileId}
              onChange={(e) =>
                setMode((m) => ({ ...m, containmentProfileId: e.target.value }))
              }
            >
              {snapshot.liquidLogistics!.containmentProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.nameKey)} ·{" "}
                  {p.capabilities
                    .map((id) =>
                      t(
                        snapshot.containmentCapabilities.find(
                          (c) => c.id === id,
                        )!.nameKey,
                      ),
                    )
                    .join(", ") || t("ui.containment.none")}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="bottom-caption">
          <span>NO CREW. JUST MACHINES.</span>
          <span>R rotate · Esc cancel · Home center</span>
        </div>
      </div>
    </main>
  );
}

export default function GameClient() {
  return (
    <I18nextProvider i18n={i18n}>
      <GameClientInner />
    </I18nextProvider>
  );
}
