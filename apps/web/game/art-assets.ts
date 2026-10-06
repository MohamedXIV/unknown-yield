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

export type RuntimeArtAsset = {
  id: ArtAssetId;
  textureKey: string;
  src: string;
  sourceSize: { width: number; height: number };
  anchor: { x: number; y: number };
  footprint: { width: number; height: number };
  layer: ArtLayer;
  tags: readonly string[];
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
    src: "/art/phase16/machine-crusher.svg",
    sourceSize: { width: 96, height: 80 },
    anchor: { x: 0.5, y: 0.75 },
    footprint: { width: 2, height: 2 },
    layer: "machine",
    tags: ["machine", "crusher", "interior"],
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

export type SvgLoader = {
  svg(key: string, url: string): unknown;
};

export function preloadRepresentativeArt(loader: SvgLoader): void {
  for (const asset of ART_ASSETS) loader.svg(asset.textureKey, asset.src);
}

export function representativeMachineAsset(
  definitionId: string,
): ArtAssetId | null {
  if (definitionId === "extractor" || definitionId === "deep-extractor")
    return "machine-extractor";
  if (definitionId === "crusher") return "machine-crusher";
  return null;
}
