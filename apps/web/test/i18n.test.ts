import { it, expect, afterEach } from "vitest";
import { Simulation } from "@site/sim-core";
import { fixture } from "@site/content";
import { i18n, t } from "../game/i18n";

afterEach(() => void i18n.changeLanguage("en"));

it("resolves catalog entries to readable English", () => {
  expect(t("material.raw.name")).toBe("Veined ore");
  expect(t("reaction.crush-raw.observation")).toContain("conductive grains");
});

it("resolves assistance package and command feedback keys", () => {
  expect(t("assistance.emergency-fuel.name")).toBe("Emergency fuel allocation");
  expect(t("ui.terminal.assistance.result.approved")).toContain(
    "Assistance approved",
  );
  expect(t("assistance.legacy-emergency.name")).toBe(
    "Emergency fuel allocation",
  );
});

it("falls back without ever rendering a raw key", () => {
  expect(
    t("material.nope.name", { defaultValue: "Unidentified material" }),
  ).toBe("Unidentified material");
});

it("swaps presentation without changing simulation state", async () => {
  const s = new Simulation(fixture);
  const before = JSON.stringify(s.serialize());
  i18n.addResourceBundle(
    "pseudo",
    "translation",
    { "material.raw.name": "Ore (pseudo)" },
    true,
    true,
  );
  await i18n.changeLanguage("pseudo");
  expect(t("material.raw.name")).toBe("Ore (pseudo)");
  expect(JSON.stringify(s.serialize())).toBe(before);
});

it("resolves authored containment profiles, requirements, reasons and feedback", () => {
  for (const key of [
    "containment.profile.lined.name",
    "containment.corrosion-resistant.name",
    "ui.containment.requires",
    "ui.containment.reason.missing-containment",
    "ui.containment.command.updated",
  ])
    expect(t(key)).not.toBe(key);
  expect(t("ui.containment.cost", { count: 34 })).toBe("34 structural plates");
});

it("resolves terminal module controls and admission feedback", () => {
  for (const key of [
    "ui.terminal.module.heading",
    "ui.terminal.module.inlet",
    "ui.terminal.module.install",
    "ui.terminal.module.remove",
    "ui.terminal.module.result.loaded",
    "ui.containment.reason.terminal-module-missing",
    "ui.containment.reason.terminal-module-locked",
  ])
    expect(t(key)).not.toBe(key);
});
