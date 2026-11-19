import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ART_ASSETS,
  ART_CAMERA,
  PIXEL_ART,
  artAsset,
  preloadRepresentativeArt,
  representativeMachineAsset,
  snapToArtPixel,
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

  const pngSize = (path: string) => {
    const bytes = readFileSync(path);
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  };
  const diskPath = (src: string) =>
    resolve(process.cwd(), "apps/web/public", src.replace(/^\//, ""));

  it("keeps every runtime source present and dimensionally aligned with metadata", () => {
    for (const asset of ART_ASSETS) {
      const path = diskPath(asset.src);
      expect(existsSync(path), path).toBe(true);
      if (asset.format === "pixel") {
        expect(pngSize(path), asset.id).toEqual(asset.sourceSize);
        if (asset.working) {
          expect(existsSync(diskPath(asset.working.src))).toBe(true);
          expect(pngSize(diskPath(asset.working.src)), asset.id + " working").toEqual({
            width: asset.working.frames * asset.working.frameWidth,
            height: asset.working.frameHeight,
          });
          expect({ w: asset.working.frameWidth, h: asset.working.frameHeight }).toEqual({
            w: asset.sourceSize.width,
            h: asset.sourceSize.height,
          });
        }
      } else {
        const svg = readFileSync(path, "utf8");
        expect(svg).toContain("<svg");
        expect(svg).toContain(
          `viewBox="0 0 ${asset.sourceSize.width} ${asset.sourceSize.height}"`,
        );
      }
      expect(asset.anchor.x).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.x).toBeLessThanOrEqual(1);
      expect(asset.anchor.y).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.y).toBeLessThanOrEqual(1);
      expect(asset.footprint.width).toBeGreaterThan(0);
      expect(asset.footprint.height).toBeGreaterThan(0);
    }
  });

  it("preloads every sprite through stable texture keys, pixel art as images and sheets", () => {
    const calls: string[][] = [];
    preloadRepresentativeArt({
      svg: (key, url) => calls.push(["svg", key, url]),
      image: (key, url) => calls.push(["image", key, url]),
      spritesheet: (key, url, frame) =>
        calls.push(["sheet", key, url, `${frame.frameWidth}x${frame.frameHeight}`]),
    });
    const expected: string[][] = [];
    for (const asset of ART_ASSETS) {
      expected.push([asset.format === "pixel" ? "image" : "svg", asset.textureKey, asset.src]);
      if (asset.working)
        expected.push([
          "sheet",
          asset.working.textureKey,
          asset.working.src,
          `${asset.working.frameWidth}x${asset.working.frameHeight}`,
        ]);
    }
    expect(calls).toEqual(expected);
  });

  it("pixel art follows the 0.8 art-pixel scale so default zoom is 1:1", () => {
    expect(PIXEL_ART.worldPerArtPixel * 1.25).toBeCloseTo(1, 10);
    expect(PIXEL_ART.worldPerArtPixel * 2.5).toBeCloseTo(2, 10);
    expect(PIXEL_ART.cellArtWidth * PIXEL_ART.worldPerArtPixel).toBe(ART_CAMERA.cellWidth);
    expect(PIXEL_ART.cellArtHeight * PIXEL_ART.worldPerArtPixel).toBe(ART_CAMERA.cellHeight);
    expect(snapToArtPixel(10.1)).toBeCloseTo(10.4, 10);
    expect(artAsset("machine-extractor").format).toBe("pixel");
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
