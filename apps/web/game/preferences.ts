export const GAME_PREFERENCES_STORAGE_KEY = "unknown-yield-game-preferences";
export const CURRENT_GAME_PREFERENCES_VERSION = 2 as const;

export type ReducedMotionPreference = "system" | "on" | "off";

export type GamePreferences = {
  version: typeof CURRENT_GAME_PREFERENCES_VERSION;
  buildPalette: {
    promoteLastUsed: boolean;
    lastUsedByGroup: Record<string, string>;
  };
  camera: {
    smooth: boolean;
    panSpeed: number;
    zoomSensitivity: number;
    inertia: number;
  };
  controls: {
    invertWheelZoom: boolean;
  };
  interface: {
    showFps: boolean;
  };
  accessibility: {
    reducedMotion: ReducedMotionPreference;
  };
};

export const CAMERA_TUNING_BOUNDS = {
  panSpeed: { min: 0.5, max: 2, step: 0.1 },
  zoomSensitivity: { min: 0.5, max: 2, step: 0.1 },
  inertia: { min: 0, max: 1, step: 0.1 },
} as const;

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  version: CURRENT_GAME_PREFERENCES_VERSION,
  buildPalette: { promoteLastUsed: true, lastUsedByGroup: {} },
  camera: {
    smooth: true,
    panSpeed: 1,
    zoomSensitivity: 1,
    inertia: 0.4,
  },
  controls: {
    invertWheelZoom: false,
  },
  interface: {
    showFps: false,
  },
  accessibility: {
    reducedMotion: "system",
  },
};

type StorageReader = { getItem(key: string): string | null };
type StorageWriter = { setItem(key: string, value: string): void };
type ValueRecord = Record<string, unknown>;

function record(value: unknown): ValueRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ValueRecord)
    : null;
}

function defaults(): GamePreferences {
  return {
    version: CURRENT_GAME_PREFERENCES_VERSION,
    buildPalette: {
      promoteLastUsed: DEFAULT_GAME_PREFERENCES.buildPalette.promoteLastUsed,
      lastUsedByGroup: {},
    },
    camera: { ...DEFAULT_GAME_PREFERENCES.camera },
    controls: { ...DEFAULT_GAME_PREFERENCES.controls },
    interface: { ...DEFAULT_GAME_PREFERENCES.interface },
    accessibility: { ...DEFAULT_GAME_PREFERENCES.accessibility },
  };
}

function numeric(
  value: unknown,
  fallback: number,
  bounds: { min: number; max: number },
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(bounds.max, Math.max(bounds.min, value))
    : fallback;
}

function buildPaletteFrom(
  value: unknown,
): GamePreferences["buildPalette"] | null {
  const palette = record(value);
  if (!palette || typeof palette.promoteLastUsed !== "boolean") return null;
  const memory = record(palette.lastUsedByGroup);
  if (!memory || !Object.values(memory).every((entry) => typeof entry === "string"))
    return null;
  return {
    promoteLastUsed: palette.promoteLastUsed,
    lastUsedByGroup: { ...(memory as Record<string, string>) },
  };
}

/**
 * Preserves valid Phase 17 v1 build-palette preferences without an expedition
 * migration. Unknown versions and malformed input revert to explicit defaults.
 * Invalid v2 camera numbers are clamped/recovered field by field.
 */
export function normalizeGamePreferences(value: unknown): GamePreferences {
  const source = record(value);
  if (!source || (source.version !== 1 && source.version !== 2))
    return defaults();
  const palette = buildPaletteFrom(source.buildPalette);
  if (!palette) return defaults();

  const next = defaults();
  next.buildPalette = palette;
  if (source.version === 1) return next;

  const camera = record(source.camera);
  const controls = record(source.controls);
  const interfacePreferences = record(source.interface);
  const accessibility = record(source.accessibility);
  next.camera = {
    smooth:
      typeof camera?.smooth === "boolean"
        ? camera.smooth
        : DEFAULT_GAME_PREFERENCES.camera.smooth,
    panSpeed: numeric(
      camera?.panSpeed,
      next.camera.panSpeed,
      CAMERA_TUNING_BOUNDS.panSpeed,
    ),
    zoomSensitivity: numeric(
      camera?.zoomSensitivity,
      next.camera.zoomSensitivity,
      CAMERA_TUNING_BOUNDS.zoomSensitivity,
    ),
    inertia: numeric(
      camera?.inertia,
      next.camera.inertia,
      CAMERA_TUNING_BOUNDS.inertia,
    ),
  };
  next.controls.invertWheelZoom =
    typeof controls?.invertWheelZoom === "boolean"
      ? controls.invertWheelZoom
      : next.controls.invertWheelZoom;
  // Additive v2 preference: existing saves without interface.showFps
  // keep their camera/palette configuration and default the HUD to off.
  next.interface.showFps =
    typeof interfacePreferences?.showFps === "boolean"
      ? interfacePreferences.showFps
      : DEFAULT_GAME_PREFERENCES.interface.showFps;
  const motion = accessibility?.reducedMotion;
  next.accessibility.reducedMotion =
    motion === "system" || motion === "on" || motion === "off"
      ? motion
      : "system";
  return next;
}

export function loadGamePreferences(storage: StorageReader): GamePreferences {
  try {
    const raw = storage.getItem(GAME_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaults();
    return normalizeGamePreferences(JSON.parse(raw) as unknown);
  } catch {
    return defaults();
  }
}

export function saveGamePreferences(
  storage: StorageWriter,
  preferences: GamePreferences,
): boolean {
  try {
    storage.setItem(
      GAME_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeGamePreferences(preferences)),
    );
    return true;
  } catch {
    return false;
  }
}
