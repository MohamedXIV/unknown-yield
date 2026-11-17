import type { Content } from "@site/content";
import type { Save } from "./types";

/**
 * Directorate operational permits (D-050).
 *
 * A guided world (`save.permits` is an array) starts with only the tools no
 * permit names. A permit is earned from real world state and is never lost,
 * even if the machine that earned it is later dismantled. A world without the
 * field (every save before this feature, and every test world) is unguided and
 * keeps every tool, which is the exact migration.
 */
export function guided(s: Pick<Save, "permits">): boolean {
  return Array.isArray(s.permits);
}

/** The tool id a command builds with, or null for commands that build nothing gated. */
export function commandTool(cmd: unknown): string | null {
  if (typeof cmd !== "object" || cmd === null) return null;
  const c = cmd as { type?: unknown; definitionId?: unknown };
  switch (c.type) {
    case "placeMachine":
    case "placeStorage":
      return typeof c.definitionId === "string" ? c.definitionId : null;
    case "placeFactory":
      return "factory";
    case "placePort":
      return "port";
    case "placeBelts":
      return "belt";
    case "placeUndergroundSolid":
      return "underground-solid";
    case "placeElevatedSolid":
      return "elevated-solid";
    case "placeUndergroundLiquid":
      return "underground-liquid";
    case "placePipes":
      return "pipe";
    case "placeTank":
      return "tank";
    case "placePump":
      return "pump";
    case "placePressureLines":
      return "pressure-line";
    case "placePressureVessel":
      return "pressure-vessel";
    case "placeCompressor":
      return "compressor";
    default:
      return null;
  }
}

export function toolPermitted(
  c: Pick<Content, "permits">,
  s: Pick<Save, "permits">,
  tool: string,
): boolean {
  if (!guided(s)) return true;
  const gate = c.permits.find((p) => p.tools.includes(tool));
  return !gate || s.permits!.includes(gate.id);
}

/** Tools a guided world may not build with yet (empty when nothing is gated). */
export function unauthorizedTools(
  c: Pick<Content, "permits">,
  s: Pick<Save, "permits">,
): string[] {
  if (!guided(s)) return [];
  return c.permits.filter((p) => !s.permits!.includes(p.id)).flatMap((p) => p.tools);
}

/** Why a command is refused, or null when the permits allow it. */
export function permitBlock(
  c: Pick<Content, "permits">,
  s: Pick<Save, "permits">,
  cmd: unknown,
): string | null {
  const tool = commandTool(cmd);
  if (tool === null || toolPermitted(c, s, tool)) return null;
  return "Not authorized yet";
}

/** Earn every permit whose condition now holds. Returns the permits newly earned. */
export function refreshPermits(
  c: Pick<Content, "permits">,
  s: Pick<Save, "permits" | "machines" | "factories" | "exported">,
): string[] {
  if (!guided(s)) return [];
  const earned: string[] = [];
  for (const permit of c.permits) {
    if (s.permits!.includes(permit.id)) continue;
    const by = permit.earnedBy;
    const met =
      by.kind === "machine"
        ? Object.values(s.machines).some((m) => m.definitionId === by.definitionId)
        : by.kind === "factory"
          ? Object.keys(s.factories).length > 0
          : s.exported > 0;
    if (met) {
      s.permits!.push(permit.id);
      earned.push(permit.id);
    }
  }
  return earned;
}
