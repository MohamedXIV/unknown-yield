import { enCatalog, lintVoice } from "@site/content";
import { describe, expect, it } from "vitest";

describe("main menu voice", () => {
  it("has no voice-lint notes", () => {
    expect(
      lintVoice(enCatalog).filter((note) => note.key.startsWith("ui.menu.")),
    ).toEqual([]);
  });

  it("speaks as the Directorate of Outer Works about Site 41", () => {
    expect(enCatalog["ui.menu.brand.authority"]).toBe("DIRECTORATE OF OUTER WORKS");
    for (const key of [
      "ui.menu.scene.eyebrow",
      "ui.menu.scene.slogan",
      "ui.menu.home.notice-eyebrow",
      "ui.menu.home.notice-body",
      "ui.menu.new.dispatch",
    ])
      expect(enCatalog[key], key).toMatch(/Site 41|Territory Nine/i);
  });

  it("keeps the action labels that players and the browser acceptance test rely on", () => {
    expect(enCatalog["ui.menu.home.resume"]).toBe("Resume Duty");
    expect(enCatalog["ui.menu.home.begin"]).toBe("Begin Assignment");
    expect(enCatalog["ui.menu.home.archives"]).toBe("Personnel Archives");
    expect(enCatalog["ui.menu.home.settings"]).toBe("Operational Regulations");
    expect(enCatalog["ui.menu.new.create"]).toBe("Create Expedition");
  });
});
