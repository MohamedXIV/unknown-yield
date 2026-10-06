import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ART_ASSETS,
  ART_CAMERA,
  artAsset,
  preloadRepresentativeArt,
  representativeMachineAsset,
} from "../game/art-assets";

describe("Phase 16 representative art contract", () => {
  it("locks the fixed runtime camera and anchor convention", () => {
    expect(ART_CAMERA).toEqual({
      projection: "fixed-three-quarter",
      cellWidth: 32,
      cellHeight: 24,
      anchorConvention: "bottom-center",
      shadowOffset: { x: 7, y: 7 },
    });
  });

  it("contains the complete Phase 8 first validation set", () => {
    expect(ART_ASSETS.map((asset) => asset.id)).toEqual([
      "terrain-basalt",
      "deposit-ferrite",
      "machine-extractor",
      "logistics-belt",
      "logistics-pipe",
      "factory-shell",
      "machine-crusher",
      "terminal-core",
      "logistics-elevated",
      "logistics-underground",
      "effect-scorch",
    ]);

    expect(new Set(ART_ASSETS.map((asset) => asset.id)).size).toBe(
      ART_ASSETS.length,
    );
    expect(new Set(ART_ASSETS.map((asset) => asset.textureKey)).size).toBe(
      ART_ASSETS.length,
    );
    expect(new Set(ART_ASSETS.map((asset) => asset.src)).size).toBe(
      ART_ASSETS.length,
    );
  });

  it("keeps every runtime source present and dimensionally aligned with metadata", () => {
    for (const asset of ART_ASSETS) {
      const diskPath = resolve(
        process.cwd(),
        "apps/web/public",
        asset.src.replace(/^\//, ""),
      );
      expect(existsSync(diskPath), diskPath).toBe(true);
      const svg = readFileSync(diskPath, "utf8");
      expect(svg).toContain("<svg");
      expect(svg).toContain(
        `viewBox="0 0 ${asset.sourceSize.width} ${asset.sourceSize.height}"`,
      );
      expect(asset.anchor.x).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.x).toBeLessThanOrEqual(1);
      expect(asset.anchor.y).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.y).toBeLessThanOrEqual(1);
      expect(asset.footprint.width).toBeGreaterThan(0);
      expect(asset.footprint.height).toBeGreaterThan(0);
    }
  });

  it("preloads every representative sprite through stable texture keys", () => {
    const calls: [string, string][] = [];
    preloadRepresentativeArt({
      svg(key, url) {
        calls.push([key, url]);
      },
    });
    expect(calls).toEqual(
      ART_ASSETS.map((asset) => [asset.textureKey, asset.src]),
    );
  });

  it("maps only representative machine definitions to art overrides", () => {
    expect(representativeMachineAsset("extractor")).toBe("machine-extractor");
    expect(representativeMachineAsset("deep-extractor")).toBe(
      "machine-extractor",
    );
    expect(representativeMachineAsset("crusher")).toBe("machine-crusher");
    expect(representativeMachineAsset("furnace")).toBeNull();
    expect(artAsset("terminal-core").layer).toBe("structure");
  });
});
