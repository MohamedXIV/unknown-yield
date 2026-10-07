export const GAME_PREFERENCES_STORAGE_KEY = "unknown-yield-game-preferences";
export const CURRENT_GAME_PREFERENCES_VERSION = 1 as const;

export type GamePreferences = {
  version: typeof CURRENT_GAME_PREFERENCES_VERSION;
  buildPalette: {
    promoteLastUsed: boolean;
    lastUsedByGroup: Record<string, string>;
  };
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  version: CURRENT_GAME_PREFERENCES_VERSION,
  buildPalette: {
    promoteLastUsed: true,
    lastUsedByGroup: {},
  },
};

type StorageReader = { getItem(key: string): string | null };
type StorageWriter = { setItem(key: string, value: string): void };

function defaults(): GamePreferences {
  return {
    version: CURRENT_GAME_PREFERENCES_VERSION,
    buildPalette: {
      promoteLastUsed: DEFAULT_GAME_PREFERENCES.buildPalette.promoteLastUsed,
      lastUsedByGroup: {},
    },
  };
}

function isCurrentPreferences(value: unknown): value is GamePreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GamePreferences>;
  return (
    candidate.version === CURRENT_GAME_PREFERENCES_VERSION &&
    !!candidate.buildPalette &&
    typeof candidate.buildPalette.promoteLastUsed === "boolean" &&
    !!candidate.buildPalette.lastUsedByGroup &&
    typeof candidate.buildPalette.lastUsedByGroup === "object" &&
    !Array.isArray(candidate.buildPalette.lastUsedByGroup) &&
    Object.values(candidate.buildPalette.lastUsedByGroup).every(
      (value) => typeof value === "string",
    )
  );
}

export function loadGamePreferences(storage: StorageReader): GamePreferences {
  try {
    const raw = storage.getItem(GAME_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaults();
    const parsed: unknown = JSON.parse(raw);
    if (!isCurrentPreferences(parsed)) return defaults();
    return {
      version: CURRENT_GAME_PREFERENCES_VERSION,
      buildPalette: {
        promoteLastUsed: parsed.buildPalette.promoteLastUsed,
        lastUsedByGroup: { ...parsed.buildPalette.lastUsedByGroup },
      },
    };
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
      JSON.stringify({
        version: CURRENT_GAME_PREFERENCES_VERSION,
        buildPalette: {
          promoteLastUsed: preferences.buildPalette.promoteLastUsed,
          lastUsedByGroup: { ...preferences.buildPalette.lastUsedByGroup },
        },
      } satisfies GamePreferences),
    );
    return true;
  } catch {
    return false;
  }
}
