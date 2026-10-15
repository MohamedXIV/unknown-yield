import type { MachineOperatingLoop } from "@site/content";
import type { PlayerSnapshot } from "@site/sim-core";
import { ART_CAMERA } from "./art-assets";

export const MAX_MACHINE_AUDIO_VOICES = 3;

/** Pixel bounds of the camera view in the fixed Phaser world. */
export type AudioViewport = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type MachineLoopTarget = {
  id: string;
  kind: MachineOperatingLoop;
  volume: number;
};

/**
 * Stateless, low-frequency audio virtualization. Only actually processing,
 * on-screen, exposed machines with an authored loop may consume a voice.
 * Stable distance/ID sorting prevents content-order audio roulette.
 *
 * This is read-only presentation planning; neither RNG nor sim state changes.
 */
export function planMachineLoops(
  snapshot: Pick<PlayerSnapshot, "machines" | "definitions">,
  viewport: AudioViewport,
  openFactories: readonly string[],
): MachineLoopTarget[] {
  const definitions = new Map(snapshot.definitions.map((entry) => [entry.id, entry]));
  const open = new Set(openFactories);
  const cx = (viewport.left + viewport.right) / 2;
  const cy = (viewport.top + viewport.bottom) / 2;
  const radius = Math.max(1, Math.hypot(viewport.right - viewport.left, viewport.bottom - viewport.top) / 2);
  const available: Array<MachineLoopTarget & { distance: number }> = [];

  for (const machine of snapshot.machines) {
    if (machine.status !== "processing" || machine.incident) continue;
    if (machine.factoryId && !open.has(machine.factoryId)) continue;
    const kind = definitions.get(machine.definitionId)?.presentation?.audio.runningLoop;
    if (!kind) continue;
    const x = (machine.x + machine.width / 2) * ART_CAMERA.cellWidth;
    const y = (machine.y + machine.height / 2) * ART_CAMERA.cellHeight;
    if (x < viewport.left || x > viewport.right || y < viewport.top || y > viewport.bottom)
      continue;
    const distance = Math.hypot(x - cx, y - cy);
    const proximity = Math.max(0, 1 - distance / radius);
    available.push({
      id: machine.id,
      kind,
      volume: 0.004 + proximity * 0.008,
      distance,
    });
  }

  return available
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, MAX_MACHINE_AUDIO_VOICES)
    .map(({ id, kind, volume }) => ({ id, kind, volume }));
}
