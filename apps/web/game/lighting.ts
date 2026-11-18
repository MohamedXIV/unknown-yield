import type { PlayerSnapshot } from "@site/sim-core";
import type { EnvironmentProfile } from "./environment-profile";

/**
 * Presentation-only light plan (D-054). Lights are derived from public snapshot
 * state and never feed back into the simulation: the terminal lamp, machines that
 * are actually processing heat, and machines in a real incident.
 */
export type LightKind = "terminal" | "furnace" | "warning";
export type LightSpec = {
  id: string;
  kind: LightKind;
  /** Centre in map cells. */
  x: number;
  y: number;
  /** Radius in map cells. */
  radius: number;
  color: `#${string}`;
  intensity: number;
};

/** Phaser's default is 10 lights; leave headroom and keep the pilot bounded. */
export const MAX_LIGHTS = 8;

const isFurnace = (definitionId: string) => /furnace|kiln|smelt|sinter/.test(definitionId);

export function lightPlan(snapshot: PlayerSnapshot, profile: EnvironmentProfile): LightSpec[] {
  const out: LightSpec[] = [];
  const t = snapshot.map.terminal;
  out.push({
    id: "terminal",
    kind: "terminal",
    x: t.x + t.width / 2,
    y: t.y + t.height / 2,
    radius: 16,
    color: profile.lightDirection.practicalWarm,
    intensity: 2.4,
  });
  for (const machine of snapshot.machines) {
    const cx = machine.x + machine.width / 2;
    const cy = machine.y + machine.height / 2;
    if (machine.incident)
      out.push({ id: "warn:" + machine.id, kind: "warning", x: cx, y: cy, radius: 6, color: profile.lightDirection.warningWarm, intensity: 1.1 });
    else if (machine.status === "processing" && isFurnace(machine.definitionId))
      out.push({ id: "heat:" + machine.id, kind: "furnace", x: cx, y: cy, radius: 5, color: profile.lightDirection.practicalWarm, intensity: 0.8 });
  }
  // Warnings first so a crowded map never drops the light that matters most.
  const rank: Record<LightKind, number> = { warning: 0, terminal: 1, furnace: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, MAX_LIGHTS);
}

export const hexToRgbInt = (hex: string): number => parseInt(hex.slice(1), 16);
