import type { Content } from "@site/content";
import { beltArms } from "./junctions";
import { contains, key, next } from "./geometry";
import type {
  Factory,
  FactoryConnectionKind,
  FactoryRelocationRequirement,
  Point,
  Save,
} from "./types";

function outwardDirection(factory: Factory, port: Point & { direction: number }) {
  return contains(factory, next(port, port.direction))
    ? (port.direction + 2) % 4
    : port.direction;
}

function wallInterfaceExists(
  state: Save,
  factory: Factory,
  portId: string,
  kind: FactoryConnectionKind,
): boolean {
  const port = factory.ports.find((entry) => entry.id === portId);
  if (!port) return false;
  if (kind === "solid") return !!state.belts[key(port)];
  if (kind === "liquid") return !!state.pipes[key(port)];
  return !!state.pressureLines[key(port)];
}

function externalConnected(
  content: Content,
  state: Save,
  factory: Factory,
  portId: string,
  kind: FactoryConnectionKind,
): boolean {
  const port = factory.ports.find((entry) => entry.id === portId);
  if (!port || !wallInterfaceExists(state, factory, portId, kind)) return false;
  const inward = contains(factory, next(port, port.direction)),
    outside = next(port, outwardDirection(factory, port));

  if (kind === "solid") {
    const external = state.belts[key(outside)];
    if (!external) return false;
    const arms = beltArms(content, external);
    return inward
      ? arms.outlets.includes(port.direction)
      : arms.inlets.includes((port.direction + 2) % 4);
  }

  if (kind === "liquid") {
    const external = state.pipes[key(outside)];
    if (!external) return false;
    return inward
      ? external.outlet === port.direction
      : external.inlet === (port.direction + 2) % 4;
  }

  const external = state.pressureLines[key(outside)];
  if (!external) return false;
  return inward
    ? external.outlet === port.direction
    : external.inlet === (port.direction + 2) % 4;
}

export function connectedFactoryInterfaces(
  content: Content,
  state: Save,
  factory: Factory,
): FactoryRelocationRequirement[] {
  const requirements: FactoryRelocationRequirement[] = [];
  for (const port of factory.ports)
    for (const kind of ["solid", "liquid", "gas"] as const)
      if (
        wallInterfaceExists(state, factory, port.id, kind) &&
        externalConnected(content, state, factory, port.id, kind)
      )
        requirements.push({ portId: port.id, kind });
  return requirements.sort(
    (a, b) =>
      a.portId.localeCompare(b.portId) || a.kind.localeCompare(b.kind),
  );
}

export function missingFactoryRelocationConnections(
  content: Content,
  state: Save,
  factory: Factory,
): FactoryRelocationRequirement[] {
  return (factory.relocation?.requirements ?? []).filter(
    (requirement) =>
      !externalConnected(
        content,
        state,
        factory,
        requirement.portId,
        requirement.kind,
      ),
  );
}

export function validateFactoryRelocationState(
  content: Content,
  state: Save,
  factory: Factory,
): void {
  const relocation = factory.relocation;
  if (!relocation) return;
  if (relocation.remainingTicks > content.site.factoryRelocationDowntimeTicks)
    throw new Error("Invalid factory relocation downtime");
  const seen = new Set<string>();
  for (const requirement of relocation.requirements) {
    const token = requirement.portId + "/" + requirement.kind;
    if (
      seen.has(token) ||
      !factory.ports.some((port) => port.id === requirement.portId) ||
      !wallInterfaceExists(
        state,
        factory,
        requirement.portId,
        requirement.kind,
      )
    )
      throw new Error("Invalid factory relocation requirement");
    seen.add(token);
  }
}

export function advanceFactoryRelocations(state: Save): void {
  for (const factory of Object.values(state.factories))
    if (factory.relocation && factory.relocation.remainingTicks > 0)
      factory.relocation.remainingTicks--;
}

export function factoryRelocationProtectsEntity(
  state: Save,
  entityId: string,
): boolean {
  for (const factory of Object.values(state.factories)) {
    if (!factory.relocation) continue;
    for (const requirement of factory.relocation.requirements) {
      const port = factory.ports.find(
        (entry) => entry.id === requirement.portId,
      )!;
      if (port.id === entityId) return true;
      if (
        requirement.kind === "solid" &&
        state.belts[key(port)]?.id === entityId
      )
        return true;
      if (
        requirement.kind === "liquid" &&
        state.pipes[key(port)]?.id === entityId
      )
        return true;
      if (
        requirement.kind === "gas" &&
        state.pressureLines[key(port)]?.id === entityId
      )
        return true;
    }
  }
  return false;
}
