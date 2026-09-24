import { it, expect, afterEach } from "vitest";
import { Simulation } from "@site/sim-core";
import { fixture } from "@site/content";
import { i18n, t } from "../game/i18n";

afterEach(() => void i18n.changeLanguage("en"));

it("resolves catalog entries to readable English", () => {
  expect(t("material.raw.name")).toBe("Veined ore");
  expect(t("reaction.crush-raw.observation")).toContain("conductive grains");
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
