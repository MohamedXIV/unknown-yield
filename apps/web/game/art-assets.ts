export const ART_CAMERA = {
  projection: "fixed-three-quarter",
  cellWidth: 32,
  cellHeight: 24,
  anchorConvention: "bottom-center",
  shadowOffset: { x: 7, y: 7 },
} as const;

export type ArtLayer =
  | "terrain"
  | "deposit"
  | "ground-logistics"
  | "structure"
  | "machine"
  | "elevated-logistics"
  | "effect";

export type ArtAssetId =
  | "terrain-basalt"
  | "deposit-ferrite"
  | "machine-extractor"
  | "logistics-belt"
  | "logistics-pipe"
  | "factory-shell"
  | "machine-crusher"
  | "terminal-core"
  | "logistics-elevated"
  | "logistics-underground"
  | "effect-scorch";

/**
 * Pixel-art contract (D-056). One art pixel is 0.8 world pixels, so at the default camera
 * zoom (1.25) it is exactly one screen pixel and at the maximum zoom (2.5) exactly two.
 * One map cell is therefore 40x30 art pixels. Pixel sprites are never rotated.
 */
export const PIXEL_ART = {
  worldPerArtPixel: 0.8,
  cellArtWidth: 40,
  cellArtHeight: 30,
} as const;

export type WorkingAnimation = {
  textureKey: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
};

export type RuntimeArtAsset = {
  id: ArtAssetId;
  textureKey: string;
  src: string;
  sourceSize: { width: number; height: number };
  anchor: { x: number; y: number };
  footprint: { width: number; height: number };
  layer: ArtLayer;
  tags: readonly string[];
  /** `pixel` sprites use nearest-neighbour filtering, the pixel scale and never rotate. Default `svg`. */
  format?: "svg" | "pixel";
  /** Looping spritesheet shown while the machine is working. */
  working?: WorkingAnimation;
};

export const ART_ASSETS: readonly RuntimeArtAsset[] = [
  {
    id: "terrain-basalt",
    textureKey: "art:terrain-basalt",
    src: "/art/phase16/terrain-basalt.svg",
    sourceSize: { width: 64, height: 48 },
    anchor: { x: 0, y: 0 },
    footprint: { width: 2, height: 2 },
    layer: "terrain",
    tags: ["terrain", "tile", "regenerable"],
  },
  {
    id: "deposit-ferrite",
    textureKey: "art:deposit-ferrite",
    src: "/art/phase16/deposit-ferrite.svg",
    sourceSize: { width: 128, height: 96 },
    anchor: { x: 0.5, y: 0.72 },
    footprint: { width: 4, height: 4 },
    layer: "deposit",
    tags: ["deposit", "ferrite", "material-family"],
  },
  {
    id: "machine-extractor",
    textureKey: "art:machine-extractor",
    src: "/art/phase16/machine-extractor.svg",
    sourceSize: { width: 96, height: 88 },
    anchor: { x: 0.5, y: 0.78 },
    footprint: { width: 2, height: 2 },
    layer: "machine",
    tags: ["machine", "extractor", "moving-subpart-ready"],
  },
  {
    id: "logistics-belt",
    textureKey: "art:logistics-belt",
    src: "/art/phase16/logistics-belt.svg",
    sourceSize: { width: 32, height: 24 },
    anchor: { x: 0.5, y: 0.5 },
    footprint: { width: 1, height: 1 },
    layer: "ground-logistics",
    tags: ["belt", "logistics", "directional"],
  },
  {
    id: "logistics-pipe",
    textureKey: "art:logistics-pipe",
    src: "/art/phase16/logistics-pipe.svg",
    sourceSize: { width: 32, height: 24 },
    anchor: { x: 0.5, y: 0.5 },
    footprint: { width: 1, height: 1 },
    layer: "ground-logistics",
    tags: ["pipe", "liquid", "logistics"],
  },
  {
    id: "factory-shell",
    textureKey: "art:factory-shell",
    src: "/art/phase16/factory-shell.svg",
    sourceSize: { width: 192, height: 144 },
    anchor: { x: 0.5, y: 0.74 },
    footprint: { width: 6, height: 6 },
    layer: "structure",
    tags: ["factory", "exterior", "cutaway-ready"],
  },
  {
    id: "machine-crusher",
    textureKey: "art:machine-crusher",
    src: "/art/pixel/machine-crusher.png",
    sourceSize: { width: 112, height: 116 },
    // Opaque pixels span x 7..105 and y 4..113, so the base rests on the footprint edge.
    anchor: { x: 0.5, y: 113 / 116 },
    footprint: { width: 2, height: 2 },
    layer: "machine",
    tags: ["machine", "crusher", "interior"],
    format: "pixel",
    working: {
      textureKey: "art:machine-crusher:working",
      src: "/art/pixel/machine-crusher-working.png",
      frameWidth: 112,
      frameHeight: 116,
      frames: 8,
      fps: 8,
    },
  },
  {
    id: "terminal-core",
    textureKey: "art:terminal-core",
    src: "/art/phase16/terminal-core.svg",
    sourceSize: { width: 160, height: 132 },
    anchor: { x: 0.5, y: 0.78 },
    footprint: { width: 4, height: 4 },
    layer: "structure",
    tags: ["terminal", "company", "antenna"],
  },
  {
    id: "logistics-elevated",
    textureKey: "art:logistics-elevated",
    src: "/art/phase16/logistics-elevated.svg",
    sourceSize: { width: 96, height: 48 },
    anchor: { x: 0.5, y: 0.72 },
    footprint: { width: 3, height: 1 },
    layer: "elevated-logistics",
    tags: ["elevated", "gantry", "support"],
  },
  {
    id: "logistics-underground",
    textureKey: "art:logistics-underground",
    src: "/art/phase16/logistics-underground.svg",
    sourceSize: { width: 32, height: 28 },
    anchor: { x: 0.5, y: 0.66 },
    footprint: { width: 1, height: 1 },
    layer: "ground-logistics",
    tags: ["underground", "portal", "logistics"],
  },
  {
    id: "effect-scorch",
    textureKey: "art:effect-scorch",
    src: "/art/phase16/effect-scorch.svg",
    sourceSize: { width: 64, height: 48 },
    anchor: { x: 0.5, y: 0.5 },
    footprint: { width: 2, height: 2 },
    layer: "effect",
    tags: ["damage", "scorch", "overlay"],
  },
] as const;

const BY_ID = new Map(ART_ASSETS.map((asset) => [asset.id, asset]));

export function artAsset(id: ArtAssetId): RuntimeArtAsset {
  const asset = BY_ID.get(id);
  if (!asset) throw new Error("Unknown art asset: " + id);
  return asset;
}

export type ArtLoader = {
  svg(key: string, url: string): unknown;
  image(key: string, url: string): unknown;
  spritesheet(
    key: string,
    url: string,
    frame: { frameWidth: number; frameHeight: number },
  ): unknown;
};
/** @deprecated kept for older call sites; use ArtLoader. */
export type SvgLoader = ArtLoader;

export function preloadRepresentativeArt(loader: ArtLoader): void {
  for (const asset of ART_ASSETS) {
    if (asset.format === "pixel") loader.image(asset.textureKey, asset.src);
    else loader.svg(asset.textureKey, asset.src);
    if (asset.working)
      loader.spritesheet(asset.working.textureKey, asset.working.src, {
        frameWidth: asset.working.frameWidth,
        frameHeight: asset.working.frameHeight,
      });
  }
}

/** Pixel sprites are placed on the art-pixel grid so they never shimmer between pixels. */
export const snapToArtPixel = (value: number): number =>
  Math.round(value / PIXEL_ART.worldPerArtPixel) * PIXEL_ART.worldPerArtPixel;

export function representativeMachineAsset(
  definitionId: string,
): ArtAssetId | null {
  if (definitionId === "extractor" || definitionId === "deep-extractor")
    return "machine-extractor";
  if (definitionId === "crusher") return "machine-crusher";
  return null;
}
