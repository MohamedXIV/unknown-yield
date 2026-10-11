import type { PlayerSnapshot } from "@site/sim-core";
import { classifyDismantleEntity } from "./dismantle-selection";
import type { Tool } from "./interaction";

export type SampledBuildTool = {
  tool: Tool;
  direction?: number;
  containmentProfileId?: string;
};

/**
 * A read-only pipette. Select a build tool from the live placed entity
 * identity, NOT from its contents, inventory, discovered reactions or label.
 * Simulation construction is still authoritative and retains all unlocks.
 */
export function sampleBuildTool(
  snapshot: PlayerSnapshot,
  id: string | null,
): SampledBuildTool | null {
  if (!id || classifyDismantleEntity(snapshot, id).kind !== "player-built")
    return null;

  const machine = snapshot.machines.find((entry) => entry.id === id);
  if (machine) {
    if (!snapshot.definitions.some((definition) => definition.id === machine.definitionId))
      return null;
    return { tool: machine.definitionId, direction: machine.direction };
  }
  const storage = snapshot.storages.find((entry) => entry.id === id);
  if (storage) {
    if (!snapshot.storageDefinitions.some((definition) => definition.id === storage.definitionId))
      return null;
    return { tool: storage.definitionId, direction: storage.direction };
  }
  const belt = snapshot.belts.find((entry) => entry.id === id);
  if (belt) return { tool: "belt", direction: belt.direction };
  const pipe = snapshot.pipes.find((entry) => entry.id === id);
  if (pipe) return {
    tool: "pipe",
    direction: pipe.outlet,
    containmentProfileId: pipe.containmentProfileId,
  };
  const line = snapshot.pressureLines.find((entry) => entry.id === id);
  if (line) return { tool: "pressure-line", direction: line.outlet };

  const tank = snapshot.tanks.find((entry) => entry.id === id);
  if (tank) return {
    tool: "tank",
    direction: tank.direction,
    containmentProfileId: tank.containmentProfileId,
  };
  const pump = snapshot.pumps.find((entry) => entry.id === id);
  if (pump) return {
    tool: "pump",
    direction: pump.direction,
    containmentProfileId: pump.containmentProfileId,
  };
  for (const [tool, entries] of [
    ["pressure-vessel", snapshot.pressureVessels],
    ["compressor", snapshot.compressors],
  ] as const) {
    const entity = entries.find((entry) => entry.id === id);
    if (entity) return { tool, direction: entity.direction };
  }
  for (const [tool, entries] of [
    ["underground-solid", snapshot.undergroundSolids],
    ["underground-liquid", snapshot.undergroundLiquids],
    ["elevated-solid", snapshot.elevatedSolids],
  ] as const)
    if (entries.some((entry) => entry.id === id)) return { tool };
  if (snapshot.factories.some((entry) => entry.id === id))
    return { tool: "factory" };
  if (snapshot.factories.some((entry) => entry.ports.some((port) => port.id === id)))
    return { tool: "port" };

  return null;
}
