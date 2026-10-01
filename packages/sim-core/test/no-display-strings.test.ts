import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { fixture, enCatalog } from "@site/content";
import {
  Simulation,
  MACHINE_STATUSES,
  type GameCommand,
} from "../src/index";
import { status } from "../src/production";

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
    // Match string values, not substrings inside stable IDs such as east-veins.
    // A leaked translated direction ("east") must still fail this boundary.
    const strings = (value: unknown): string[] => {
      if (typeof value === "string") return [value];
      if (value && typeof value === "object") return Object.values(value).flatMap(strings);
      return [];
    };
    const values = strings(snapshot);
    for (const value of Object.values(enCatalog)) expect(values).not.toContain(value);
    expect(values).toContain("east-veins");
    expect(values).not.toContain("east");
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

describe("semantic machine status", () => {
  it("reports kebab-case codes that gameplay branches on, never prose", () => {
    for (const code of MACHINE_STATUSES)
      expect(code).toMatch(/^[a-z]+(-[a-z]+)*$/);
    const s = new Simulation(fixture);
    const extractor = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    const save = s.serialize();
    expect(status(fixture, save, save.machines[extractor])).toBe("ready");
    s.command({ type: "setEnabled", machineId: extractor, enabled: false });
    expect(
      status(fixture, s.serialize(), s.serialize().machines[extractor]),
    ).toBe("disabled");
    s.command({ type: "setEnabled", machineId: extractor, enabled: true });
    s.step(500);
    expect(
      status(fixture, s.serialize(), s.serialize().machines[extractor]),
    ).toBe("processing");
    const fresh = new Simulation(fixture);
    const other = build(fresh, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    const empty = fresh.serialize();
    empty.deposits["ferrite-field"] = 0;
    expect(status(fixture, empty, empty.machines[other])).toBe(
      "deposit-exhausted",
    );
  });

  it("distinguishes input states without display text", () => {
    const s = new Simulation(fixture);
    const factory = build(s, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    expect(factory).toBeTruthy();
    const crusher = build(s, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 27,
      y: 26,
      direction: 0,
    });
    const save = s.serialize();
    expect(status(fixture, save, save.machines[crusher])).toBe("needs-input");
    const partial = s.serialize();
    partial.machines[crusher].input = { ferrite: 1 };
    expect(status(fixture, partial, partial.machines[crusher])).toBe(
      "needs-compatible-input",
    );
  });

  it("reports fuel shortage as a code", () => {
    const c = structuredClone(fixture);
    c.economy.startFuel = 0;
    const s = new Simulation(c);
    const id = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    const save = s.serialize();
    expect(status(c, save, save.machines[id])).toBe("needs-fuel");
  });
});
