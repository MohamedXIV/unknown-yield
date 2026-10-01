import {
  contains,
  key,
  socket,
  vectors,
  type PlayerSnapshot,
} from "@site/sim-core";

export type BeltPresentation = {
  inlets: number[];
  outlets: { direction: number; active: boolean; connected: boolean }[];
};

/** Read-only topology projection; cargo and routing stay in sim-core. */
export function beltPresentations(
  snapshot: PlayerSnapshot,
): Map<string, BeltPresentation> {
  const belts = new Map(snapshot.belts.map((b) => [key(b), b]));
  const sources = new Map<string, Set<number>>();
  const destinations = new Map<string, Set<number>>();
  const add = (
    map: Map<string, Set<number>>,
    position: string,
    direction: number,
  ) => {
    const arms = map.get(position) ?? new Set<number>();
    arms.add(direction);
    map.set(position, arms);
  };
  const definitions = new Map(snapshot.definitions.map((d) => [d.id, d]));
  const storageDefinitions = new Map(
    snapshot.storageDefinitions.map((d) => [d.id, d]),
  );
  for (const machine of snapshot.machines) {
    const definition = definitions.get(machine.definitionId);
    if (!definition) continue;
    add(
      sources,
      key(socket(machine, definition, true)),
      (machine.direction + 2) % 4,
    );
    if (machine.role === "processor")
      add(
        destinations,
        key(socket(machine, definition, false)),
        machine.direction,
      );
  }
  for (const storage of snapshot.storages) {
    const definition = storageDefinitions.get(storage.definitionId);
    if (!definition) continue;
    add(
      sources,
      key(socket(storage, definition, true)),
      (storage.direction + 2) % 4,
    );
    add(
      destinations,
      key(socket(storage, definition, false)),
      storage.direction,
    );
  }
  const result = new Map<string, BeltPresentation>();
  for (const belt of snapshot.belts) {
    const inlets = new Set(sources.get(key(belt)));
    for (let side = 0; side < 4; side++) {
      const v = vectors[side];
      const neighbor = belts.get(key({ x: belt.x + v.x, y: belt.y + v.y }));
      if (!neighbor) continue;
      const exit =
        neighbor.alternate !== null && neighbor.switched
          ? neighbor.alternate
          : neighbor.direction;
      if (exit === (side + 2) % 4) inlets.add(side);
    }
    const active =
      belt.alternate !== null && belt.switched
        ? belt.alternate
        : belt.direction;
    const exits =
      belt.alternate === null
        ? [belt.direction]
        : [belt.direction, belt.alternate];
    result.set(belt.id, {
      inlets: [...inlets].sort((a, b) => a - b),
      outlets: exits.map((direction) => {
        const v = vectors[direction],
          target = { x: belt.x + v.x, y: belt.y + v.y };
        return {
          direction,
          active: direction === active,
          connected:
            belts.has(key(target)) ||
            destinations.get(key(belt))?.has(direction) === true ||
            contains(snapshot.map.terminal, target),
        };
      }),
    });
  }
  return result;
}
