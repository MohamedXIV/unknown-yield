import type { MachineDefinitionView, MachineView } from "@site/sim-core";
import { ART_ASSETS, representativeMachineAsset, type ArtAssetId } from "./art-assets";
import type { MachineAudioCue } from "@site/content";

/** Future damage states must come from the authoritative sim, never an art RNG. */
export type MachinePhysicalCondition = "intact" | "worn" | "damaged" | "wrecked";
export type MachineOperationPresentation =
  | "working" | "idle" | "blocked" | "incident" | "disabled";

export type MachinePresentation = {
  operation: MachineOperationPresentation;
  condition: MachinePhysicalCondition;
  assetId: ArtAssetId | null;
  overlayId: ArtAssetId | null;
  logoAssetId: ArtAssetId | null;
  indicatorColor: number;
  audio: { start: MachineAudioCue; blocked: MachineAudioCue; incident: MachineAudioCue };
};

const BASE_TINTS: Record<MachineOperationPresentation, string> = {
  working: "#b2d68a",
  idle: "#c0c6a9",
  blocked: "#d6a66e",
  incident: "#e57865",
  disabled: "#727866",
};

function availableAsset(value: string | undefined, layer: "machine" | "effect"): ArtAssetId | null {
  if (!value) return null;
  const entry = ART_ASSETS.find((asset) => asset.id === value && asset.layer === layer);
  return entry?.id ?? null;
}

export function resolveMachinePresentation(
  machine: Pick<MachineView, "definitionId" | "status" | "incident">,
  definition?: Pick<MachineDefinitionView, "presentation">,
  condition: MachinePhysicalCondition = "intact",
): MachinePresentation {
  const operation: MachineOperationPresentation =
    machine.status === "incident" || machine.incident
      ? "incident"
      : machine.status === "processing"
        ? "working"
        : machine.status === "disabled"
          ? "disabled"
          : machine.status === "ready"
            ? "idle"
            : "blocked";
  const authored = definition?.presentation;
  const assets = authored?.assets;
  const base = availableAsset(assets?.base, "machine") ??
    representativeMachineAsset(machine.definitionId);
  const conditionAsset =
    condition === "wrecked"
      ? assets?.wrecked
      : condition === "damaged"
        ? assets?.damaged
        : operation === "working"
          ? assets?.working
          : undefined;
  const assetId = availableAsset(conditionAsset, "machine") ?? base;
  const overlayId = operation === "incident"
    ? availableAsset(assets?.incidentOverlay, "effect") ?? "effect-scorch"
    : null;
  const indicator = authored?.indicatorColors[operation] ?? BASE_TINTS[operation];
  return {
    operation,
    condition,
    assetId,
    overlayId,
    logoAssetId: availableAsset(authored?.logoAssetId, "machine"),
    indicatorColor: parseInt(indicator.slice(1), 16),
    audio: {
      start: authored?.audio.start ?? "machine-start",
      blocked: authored?.audio.blocked ?? "warning",
      incident: authored?.audio.incident ?? "hazard",
    },
  };
}
