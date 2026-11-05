import { describe, expect, it } from "vitest";
import { COLD_TWILIGHT_SITE, type EnvironmentProfile } from "../game/environment-profile";

const relativeLuminance = (color: number) => {
  const channels = [16, 8, 0].map((shift) => (color >> shift) & 0xff);
  const [r, g, b] = channels.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: number, b: number) => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
};

describe("authored planetary presentation (#348)", () => {
  it("uses a single bounded twilight environment without adding simulation truth", () => {
    const profile: EnvironmentProfile = COLD_TWILIGHT_SITE;
    expect(profile.id).toBe("cold-twilight-site-01");
    expect(profile.terrain.background).toMatch(/^#[0-9a-f]{6}$/);
    expect(profile.terrain.rockScatter).toEqual(
      expect.objectContaining({ seed: 131, count: 1700 }),
    );
    expect(profile).not.toHaveProperty("timeOfDay");
    expect(profile).not.toHaveProperty("generationSeed");
    expect(profile).not.toHaveProperty("resourceMultiplier");
    expect(profile).not.toHaveProperty("unlock");
  });

  it("keeps excavation, labels, grid and functional overlays discernible", () => {
    const { terrain, guides } = COLD_TWILIGHT_SITE;
    const text = parseInt(terrain.depositLabel.slice(1), 16);
    expect(contrastRatio(text, terrain.surface)).toBeGreaterThan(4.5);
    expect(contrastRatio(guides.grid, terrain.surface)).toBeGreaterThan(4.5);
    expect(terrain.rockScatter.shadow).not.toBe(terrain.rockScatter.oxidized);
    expect(terrain.depositShadow).not.toBe(terrain.surface);
    for (const opacity of [
      terrain.textureOpacity, terrain.depositHaloOpacity,
      terrain.depositEdgeOpacity, terrain.terminalHaloOpacity,
      terrain.rockScatter.opacity, guides.gridOpacity,
    ]) {
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThan(1);
    }
  });

  it("provides a muted ambient direction and distinct warm industrial fixtures", () => {
    const { lightDirection } = COLD_TWILIGHT_SITE;
    expect(lightDirection.ambientIntensity).toBeGreaterThan(0);
    expect(lightDirection.ambientIntensity).toBeLessThan(1);
    expect(lightDirection.practicalWarm).not.toBe(lightDirection.warningWarm);
    expect(lightDirection.ambientColor).not.toBe(lightDirection.practicalWarm);
  });
});
