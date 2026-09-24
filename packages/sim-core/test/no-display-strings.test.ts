import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { fixture, enCatalog } from "@site/content";
import { Simulation, type GameCommand } from "../src/index";

/**
 * Issue #14 boundary guards (decision D-022).
 *
 * Player-facing wording must never be simulation identity: snapshots carry
 * stable IDs and localization keys only, and sim-core source must not depend
 * on localization, UI or content-authoring libraries at runtime.
 * (Test-only imports of the catalog are allowed; src imports are not.)
 */
function build(s: Simulation, c: GameCommand) {
  const r = s.command(c);
  expect(r.ok, r.message).toBe(true);
  return r.id!;
}

describe("localization boundary", () => {
  it("exposes stable IDs and keys instead of display strings", () => {
    const s = new Simulation(fixture);
    const factory = build(s, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 26,
      direction: 0,
    });
    build(s, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 27,
      y: 26,
      direction: 0,
    });
    expect(factory).toBeTruthy();
    s.step(60000);
    const snapshot = s.snapshot();
    const machine = snapshot.machines.find(
      (m) => m.definitionId === "crusher",
    )!;
    expect(machine.nameKey).toBe("machine.crusher.name");
    expect("name" in machine).toBe(false);
    const known = snapshot.observations.find((o) => o.initial)!;
    expect(known).toMatchObject({
      operationId: "crush",
      inputId: "ferrite",
      outputId: "plates",
      textKey: "reaction.press-ferrite.observation",
    });
    expect("text" in known).toBe(false);
    const dumped = JSON.stringify(snapshot);
    for (const value of Object.values(enCatalog))
      expect(dumped).not.toContain(value);
  });

  it("keeps sim-core source free of localization/UI/authoring imports", async () => {
    const dir = new URL("../src/", import.meta.url);
    const banned =
      /from\s+["'](i18next|react-i18next|tinybase|react|next\/|phaser)["']|require\(\s*["'](i18next|react-i18next|tinybase|react|phaser)["']\)/;
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".ts")) continue;
      const source = await readFile(new URL(file, dir), "utf8");
      expect(source, file).not.toMatch(banned);
    }
  });
});
