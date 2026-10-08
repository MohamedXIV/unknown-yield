import { expect, it } from "vitest";
import {
  CAMERA_TUNING_BOUNDS,
  CURRENT_GAME_PREFERENCES_VERSION,
  DEFAULT_GAME_PREFERENCES,
  GAME_PREFERENCES_STORAGE_KEY,
  loadGamePreferences,
  normalizeGamePreferences,
  saveGamePreferences,
} from "../game/preferences";

it("uses deep-copy Game Configuration defaults if storage is empty", () => {
  const preferences = loadGamePreferences({ getItem: () => null });
  expect(preferences).toEqual(DEFAULT_GAME_PREFERENCES);
  expect(preferences).not.toBe(DEFAULT_GAME_PREFERENCES);
  expect(preferences.buildPalette.lastUsedByGroup).not.toBe(
    DEFAULT_GAME_PREFERENCES.buildPalette.lastUsedByGroup,
  );
  expect(preferences.camera).not.toBe(DEFAULT_GAME_PREFERENCES.camera);
  expect(preferences.interface).not.toBe(DEFAULT_GAME_PREFERENCES.interface);
  expect(preferences.interface.showFps).toBe(false);
});

it("persists camera, input and palette preferences outside expedition saves", () => {
  const records = new Map<string, string>();
  const configured = normalizeGamePreferences({
    ...DEFAULT_GAME_PREFERENCES,
    buildPalette: {
      promoteLastUsed: false,
      lastUsedByGroup: { acquisition: "deep-extractor" },
    },
    camera: {
      smooth: false,
      panSpeed: 1.6,
      zoomSensitivity: 0.8,
      inertia: 0.1,
    },
    controls: { invertWheelZoom: true },
    interface: { showFps: true },
    accessibility: { reducedMotion: "on" },
  });

  expect(
    saveGamePreferences(
      { setItem: (key, value) => { records.set(key, value); } },
      configured,
    ),
  ).toBe(true);
  expect([...records.keys()]).toEqual([GAME_PREFERENCES_STORAGE_KEY]);
  expect(
    loadGamePreferences({ getItem: (key) => records.get(key) ?? null }),
  ).toEqual(configured);
});

it("migrates valid v1 data preserving last-used memory and the old toggle", () => {
  const v1 = {
    version: 1,
    buildPalette: {
      promoteLastUsed: false,
      lastUsedByGroup: {
        thermal: "sealed-furnace",
        acquisition: "deep-extractor",
      },
    },
  };
  const migrated = loadGamePreferences({
    getItem: () => JSON.stringify(v1),
  });
  expect(migrated.version).toBe(CURRENT_GAME_PREFERENCES_VERSION);
  expect(migrated.buildPalette).toEqual(v1.buildPalette);
  expect(migrated.camera).toEqual(DEFAULT_GAME_PREFERENCES.camera);
  expect(migrated.controls).toEqual(DEFAULT_GAME_PREFERENCES.controls);
  expect(migrated.interface).toEqual(DEFAULT_GAME_PREFERENCES.interface);
  expect(migrated.accessibility).toEqual(DEFAULT_GAME_PREFERENCES.accessibility);
});

it("clamps bounded tuning and repairs invalid v2 fields independently", () => {
  const parsed = normalizeGamePreferences({
    version: 2,
    buildPalette: {
      promoteLastUsed: false,
      lastUsedByGroup: { thermal: "furnace" },
    },
    camera: {
      smooth: "not boolean",
      panSpeed: 999,
      zoomSensitivity: -4,
      inertia: Number.NaN,
    },
    controls: { invertWheelZoom: true },
    interface: { showFps: "sometimes" },
    accessibility: { reducedMotion: "unrecognized" },
  });
  expect(parsed.buildPalette.lastUsedByGroup).toEqual({ thermal: "furnace" });
  expect(parsed.camera).toEqual({
    smooth: true,
    panSpeed: CAMERA_TUNING_BOUNDS.panSpeed.max,
    zoomSensitivity: CAMERA_TUNING_BOUNDS.zoomSensitivity.min,
    inertia: DEFAULT_GAME_PREFERENCES.camera.inertia,
  });
  expect(parsed.controls.invertWheelZoom).toBe(true);
  expect(parsed.interface.showFps).toBe(false);
  expect(parsed.accessibility.reducedMotion).toBe("system");
});

it("migrates older version 2 settings without an FPS field in place", () => {
  const legacy = {
    version: 2,
    buildPalette: {
      promoteLastUsed: false,
      lastUsedByGroup: { thermal: "furnace" },
    },
    camera: { smooth: false, panSpeed: 1.7, zoomSensitivity: 0.8, inertia: 0.2 },
    controls: { invertWheelZoom: true },
    accessibility: { reducedMotion: "on" },
  };
  const next = normalizeGamePreferences(legacy);
  expect(next.version).toBe(2);
  expect(next.buildPalette).toEqual(legacy.buildPalette);
  expect(next.camera).toEqual(legacy.camera);
  expect(next.controls).toEqual(legacy.controls);
  expect(next.accessibility).toEqual(legacy.accessibility);
  expect(next.interface.showFps).toBe(false);
});

it("recovers from malformed, unsupported and incomplete preference records", () => {
  for (const raw of [
    "{broken",
    JSON.stringify({
      version: 0,
      buildPalette: {
        promoteLastUsed: false,
        lastUsedByGroup: {},
      },
    }),
    JSON.stringify({
      version: CURRENT_GAME_PREFERENCES_VERSION,
      buildPalette: { promoteLastUsed: "yes", lastUsedByGroup: {} },
    }),
    JSON.stringify({
      version: CURRENT_GAME_PREFERENCES_VERSION,
      buildPalette: { promoteLastUsed: false },
    }),
    JSON.stringify({
      version: 1,
      buildPalette: { promoteLastUsed: false },
    }),
  ]) {
    expect(loadGamePreferences({ getItem: () => raw })).toEqual(
      DEFAULT_GAME_PREFERENCES,
    );
  }
});

it("recovers from blocked storage without affecting the game", () => {
  expect(
    loadGamePreferences({
      getItem() {
        throw new Error("blocked");
      },
    }),
  ).toEqual(DEFAULT_GAME_PREFERENCES);

  expect(
    saveGamePreferences(
      {
        setItem() {
          throw new Error("quota");
        },
      },
      DEFAULT_GAME_PREFERENCES,
    ),
  ).toBe(false);
});

it("preserves old v2 sound preference defaults and persists explicit mute", () => {
  const legacy = {
    ...DEFAULT_GAME_PREFERENCES,
    interface: { showFps: true },
  };
  expect(normalizeGamePreferences(legacy).interface).toEqual({
    showFps: true,
    soundEffects: true,
  });
  const muted = normalizeGamePreferences({
    ...legacy,
    interface: { showFps: true, soundEffects: false },
  });
  expect(muted.interface.soundEffects).toBe(false);
  const records = new Map<string, string>();
  expect(saveGamePreferences({
    setItem: (key, value) => { records.set(key, value); },
  }, muted)).toBe(true);
  expect(loadGamePreferences({
    getItem: (key) => records.get(key) ?? null,
  }).interface.soundEffects).toBe(false);
});
