import { expect, it } from "vitest";
import {
  CURRENT_GAME_PREFERENCES_VERSION,
  DEFAULT_GAME_PREFERENCES,
  GAME_PREFERENCES_STORAGE_KEY,
  loadGamePreferences,
  saveGamePreferences,
} from "../game/preferences";

it("uses explicit Game Configuration defaults when no preference record exists", () => {
  const preferences = loadGamePreferences({ getItem: () => null });
  expect(preferences).toEqual(DEFAULT_GAME_PREFERENCES);
  expect(preferences).not.toBe(DEFAULT_GAME_PREFERENCES);
  expect(preferences.buildPalette.promoteLastUsed).toBe(true);
  expect(preferences.buildPalette.lastUsedByGroup).toEqual({});
});

it("persists and restores preferences independently from expedition saves", () => {
  const records = new Map<string, string>();
  const configured = {
    version: CURRENT_GAME_PREFERENCES_VERSION,
    buildPalette: {
      promoteLastUsed: false,
      lastUsedByGroup: {
        acquisition: "deep-extractor",
      },
    },
  };

  expect(
    saveGamePreferences(
      { setItem: (key, value) => records.set(key, value) },
      configured,
    ),
  ).toBe(true);
  expect(records.has(GAME_PREFERENCES_STORAGE_KEY)).toBe(true);
  expect([...records.keys()]).not.toContain("industrial-site-save-v15");
  expect(
    loadGamePreferences({
      getItem: (key) => records.get(key) ?? null,
    }),
  ).toEqual(configured);
});

it("recovers safely from malformed, unsupported and invalid preference records", () => {
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
      buildPalette: {
        promoteLastUsed: "yes",
        lastUsedByGroup: {},
      },
    }),
    JSON.stringify({
      version: CURRENT_GAME_PREFERENCES_VERSION,
      buildPalette: {
        promoteLastUsed: false,
      },
    }),
  ]) {
    expect(loadGamePreferences({ getItem: () => raw })).toEqual(
      DEFAULT_GAME_PREFERENCES,
    );
  }
});

it("recovers from blocked storage without affecting callers", () => {
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
