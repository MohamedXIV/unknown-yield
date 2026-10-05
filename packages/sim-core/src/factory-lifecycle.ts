import type { Content } from "@site/content";
import { beltArms } from "./junctions";
import { contains, key, next } from "./geometry";
import type {
  Factory,
  FactoryConnectionKind,
  Save,
} from "./types";

function portOutside(factory: Factory, port: Factory["ports"][number]) {
  const forward = next(port, port.direction),
    outward = contains(factory, forward)
      ? (port.direction + 2) % 4
      : port.direction,
    point = next(port, outward);
  return { point, towardPort: (outward + 2) % 4 };
}

function connectionKindsAtPort(
  content: Content,
  state: Save,
  factory: Factory,
  port: Factory["ports"][number],
): FactoryConnectionKind[] {
  const { point, towardPort } = portOutside(factory, port),
    result: FactoryConnectionKind[] = [],
    belt = state.belts[key(point)];
  if (belt) {
    const arms = beltArms(content, belt);
    if (
      arms.inlets.includes(towardPort) ||
      arms.outlets.includes(towardPort)
    )
      result.push("solid");
  }
  const pipe = state.pipes[key(point)];
  if (pipe && (pipe.inlet === towardPort || pipe.outlet === towardPort))
    result.push("liquid");
  const line = state.pressureLines[key(point)];
  if (line && (line.inlet === towardPort || line.outlet === towardPort))
    result.push("gas");
  return result;
}

export function factoryConnectionRequirements(
  content: Content,
  state: Save,
  factory: Factory,
): NonNullable<Factory["relocation"]>["requirements"] {
  return factory.ports
    .flatMap((port) =>
      connectionKindsAtPort(content, state, factory, port).map((kind) => ({
        portId: port.id,
        kind,
      })),
    )
    .sort(
      (a, b) =>
        a.portId.localeCompare(b.portId) || a.kind.localeCompare(b.kind),
    );
}

export function factoryConnectionsRestored(
  content: Content,
  state: Save,
  factory: Factory,
): boolean {
  const relocation = factory.relocation;
  if (!relocation) return true;
  return relocation.requirements.every((requirement) => {
    const port = factory.ports.find(
      (candidate) => candidate.id === requirement.portId,
    );
    return (
      !!port &&
      connectionKindsAtPort(content, state, factory, port).includes(
        requirement.kind,
      )
    );
  });
}

export function factoryRelocationResumeError(
  content: Content,
  state: Save,
  factory: Factory,
): string | null {
  const relocation = factory.relocation;
  if (!relocation) return null;
  if (state.tick < relocation.readyAt)
    return "Factory relocation downtime is still active";
  if (!factoryConnectionsRestored(content, state, factory))
    return "Reconnect external logistics before restarting factory";
  return null;
}
