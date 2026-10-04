import type { Content } from "@site/content";
import { contains, footprint, inside, overlaps, wall } from "./geometry";
import type { Factory, Save } from "./types";

export type FactoryBlueprintPort = {
  x: number;
  y: number;
  direction: number;
};

export type FactoryBlueprintMachine = {
  definitionId: string;
  x: number;
  y: number;
  direction: number;
  operation: string | null;
};

export type FactoryBlueprintBelt = {
  x: number;
  y: number;
  direction: number;
  alternate: number | null;
  switched: boolean;
  junction?: { definitionId: string; branch: 1 | -1 } | null;
};

export type FactoryBlueprint = {
  schemaVersion: 1 | 2 | 3 | 4 | 5;
  pressureLines?: { x: number; y: number; inlet: number; outlet: number }[];
  pressureVessels?: { x: number; y: number; direction: number }[];
  compressors?: { x: number; y: number; direction: number; enabled: boolean }[];

  pipes?: {
    containmentProfileId?: string;
    x: number;
    y: number;
    inlet: number;
    outlet: number;
  }[];
  tanks?: {
    containmentProfileId?: string;
    x: number;
    y: number;
    direction: number;
  }[];
  pumps?: {
    containmentProfileId?: string;
    x: number;
    y: number;
    direction: number;
    enabled: boolean;
  }[];
  width: number;
  height: number;
  ports: FactoryBlueprintPort[];
  machines: FactoryBlueprintMachine[];
  belts: FactoryBlueprintBelt[];
};

type RecordValue = Record<string, unknown>;

const exactKeys = (value: RecordValue, keys: string[], label: string) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    throw new Error(label + " has unknown or missing fields");
};

const record = (value: unknown, label: string): RecordValue => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(label + " must be an object");
  return value as RecordValue;
};

const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(label + " must be an array");
  return value;
};

const integer = (
  value: unknown,
  label: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
) => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  )
    throw new Error(label + " must be an integer in range");
  return value;
};

const direction = (value: unknown, label: string) =>
  integer(value, label, 0, 3);

const boolean = (value: unknown, label: string) => {
  if (typeof value !== "boolean") throw new Error(label + " must be boolean");
  return value;
};

const string = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.length)
    throw new Error(label + " must be a non-empty string");
  return value;
};

const pointOrder = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.y - b.y || a.x - b.x;

const portOrder = (a: FactoryBlueprintPort, b: FactoryBlueprintPort) =>
  pointOrder(a, b) || a.direction - b.direction;

const machineOrder = (a: FactoryBlueprintMachine, b: FactoryBlueprintMachine) =>
  pointOrder(a, b) ||
  a.definitionId.localeCompare(b.definitionId) ||
  a.direction - b.direction ||
  (a.operation ?? "").localeCompare(b.operation ?? "");

const beltOrder = (a: FactoryBlueprintBelt, b: FactoryBlueprintBelt) =>
  pointOrder(a, b) ||
  a.direction - b.direction ||
  (a.alternate ?? -1) - (b.alternate ?? -1) ||
  Number(a.switched) - Number(b.switched);

const canonical = (blueprint: FactoryBlueprint): FactoryBlueprint => ({
  schemaVersion: blueprint.schemaVersion,
  width: blueprint.width,
  height: blueprint.height,
  ports: [...blueprint.ports].sort(portOrder),
  machines: [...blueprint.machines].sort(machineOrder),
  belts: [...blueprint.belts].sort(beltOrder),
  ...(blueprint.schemaVersion >= 3
    ? {
        pipes: [...blueprint.pipes!].sort(pointOrder),
        tanks: [...blueprint.tanks!].sort(pointOrder),
        pumps: [...blueprint.pumps!].sort(pointOrder),
      }
    : {}),
  ...(blueprint.schemaVersion >= 4
    ? {
        pressureLines: [...blueprint.pressureLines!].sort(pointOrder),
        pressureVessels: [...blueprint.pressureVessels!].sort(pointOrder),
        compressors: [...blueprint.compressors!].sort(pointOrder),
      }
    : {}),
});

const relativeFactory = (
  width: number,
  height: number,
  ports: FactoryBlueprintPort[],
): Factory => ({
  id: "blueprint",
  x: 0,
  y: 0,
  width,
  height,
  ports: ports.map((port, index) => ({
    id: "port-" + index,
    ...port,
  })),
});

export function validateFactoryBlueprint(
  content: Content,
  input: unknown,
): FactoryBlueprint {
  const root = record(input, "Factory blueprint");
  exactKeys(
    root,
    [
      "schemaVersion",
      "width",
      "height",
      "ports",
      "machines",
      "belts",
      ...(root.schemaVersion === 4 || root.schemaVersion === 5
        ? [
            "pipes",
            "tanks",
            "pumps",
            "pressureLines",
            "pressureVessels",
            "compressors",
          ]
        : root.schemaVersion === 3
          ? ["pipes", "tanks", "pumps"]
          : []),
    ],
    "Factory blueprint",
  );
  if (
    root.schemaVersion !== 1 &&
    root.schemaVersion !== 2 &&
    root.schemaVersion !== 3 &&
    root.schemaVersion !== 4 &&
    root.schemaVersion !== 5
  )
    throw new Error("Unsupported factory blueprint schema");

  const width = integer(
      root.width,
      "Factory blueprint width",
      content.site.factoryMin,
      content.site.factoryMax,
    ),
    height = integer(
      root.height,
      "Factory blueprint height",
      content.site.factoryMin,
      content.site.factoryMax,
    );

  const ports: FactoryBlueprintPort[] = array(
    root.ports,
    "Blueprint ports",
  ).map((value, index) => {
    const row = record(value, "Blueprint port " + index);
    exactKeys(row, ["x", "y", "direction"], "Blueprint port " + index);
    return {
      x: integer(row.x, "Blueprint port x", 0, width - 1),
      y: integer(row.y, "Blueprint port y", 0, height - 1),
      direction: direction(row.direction, "Blueprint port direction"),
    };
  });

  const factory = relativeFactory(width, height, []);
  const portCells = new Set<string>();
  for (const port of ports) {
    if (!wall(factory, port))
      throw new Error("Blueprint port must be on a wall");
    const vertical = port.x === 0 || port.x === width - 1,
      horizontal = port.y === 0 || port.y === height - 1;
    if (vertical && horizontal)
      throw new Error("Blueprint ports cannot occupy corners");
    if (
      (vertical && port.direction % 2 !== 0) ||
      (horizontal && port.direction % 2 !== 1)
    )
      throw new Error("Blueprint port direction must cross its wall");
    const cell = port.x + "," + port.y;
    if (portCells.has(cell)) throw new Error("Duplicate blueprint port");
    portCells.add(cell);
  }

  const machineDefinitions = new Map(
    content.machines.map((definition) => [definition.id, definition]),
  );
  const operationIds = new Set(
    content.operations.map((operation) => operation.id),
  );
  const machines: FactoryBlueprintMachine[] = array(
    root.machines,
    "Blueprint machines",
  ).map((value, index) => {
    const row = record(value, "Blueprint machine " + index);
    exactKeys(
      row,
      ["definitionId", "x", "y", "direction", "operation"],
      "Blueprint machine " + index,
    );
    const definitionId = string(
        row.definitionId,
        "Blueprint machine definitionId",
      ),
      definition = machineDefinitions.get(definitionId);
    if (!definition) throw new Error("Unknown blueprint machine definition");
    if (definition.role !== "processor")
      throw new Error("Factory blueprint machines must be processors");

    let operation: string | null = null;
    if (row.operation !== null) {
      operation = string(row.operation, "Blueprint machine operation");
      if (
        !operationIds.has(operation) ||
        !definition.operations.includes(operation)
      )
        throw new Error("Unknown or unsupported blueprint machine operation");
    }

    const machine = {
      definitionId,
      x: integer(row.x, "Blueprint machine x", 0, width - 1),
      y: integer(row.y, "Blueprint machine y", 0, height - 1),
      direction: direction(row.direction, "Blueprint machine direction"),
      operation,
    };
    if (!inside(factory, footprint(machine, definition)))
      throw new Error("Blueprint machine must fit inside factory walls");
    return machine;
  });

  const machineRects = machines.map((machine) =>
    footprint(machine, machineDefinitions.get(machine.definitionId)!),
  );
  for (let a = 0; a < machineRects.length; a++)
    for (let b = a + 1; b < machineRects.length; b++)
      if (overlaps(machineRects[a], machineRects[b]))
        throw new Error("Blueprint machines overlap");

  const beltCells = new Set<string>();
  const belts: FactoryBlueprintBelt[] = array(
    root.belts,
    "Blueprint belts",
  ).map((value, index) => {
    const row = record(value, "Blueprint belt " + index);
    exactKeys(
      row,
      [
        "x",
        "y",
        "direction",
        "alternate",
        "switched",
        ...(root.schemaVersion !== 1 ? ["junction"] : []),
      ],
      "Blueprint belt " + index,
    );
    const belt: FactoryBlueprintBelt = {
      x: integer(row.x, "Blueprint belt x", 0, width - 1),
      y: integer(row.y, "Blueprint belt y", 0, height - 1),
      direction: direction(row.direction, "Blueprint belt direction"),
      alternate:
        row.alternate === null
          ? null
          : direction(row.alternate, "Blueprint belt alternate"),
      switched: boolean(row.switched, "Blueprint belt switched"),
    };
    if (root.schemaVersion !== 1) {
      belt.junction = null;
      if (row.junction !== null) {
        const junction = record(row.junction, "Blueprint junction");
        exactKeys(junction, ["definitionId", "branch"], "Blueprint junction");
        const definitionId = string(
          junction.definitionId,
          "Blueprint junction definition",
        );
        if (!content.junctions.some((d) => d.id === definitionId))
          throw new Error("Unknown blueprint junction definition");
        if (junction.branch !== 1 && junction.branch !== -1)
          throw new Error("Invalid blueprint junction branch");
        if (belt.alternate !== null || belt.switched || wall(factory, belt))
          throw new Error("Invalid blueprint junction topology");
        belt.junction = { definitionId, branch: junction.branch };
      }
    }
    if (belt.alternate === belt.direction)
      throw new Error("Blueprint belt alternate must differ from primary");
    if (belt.switched && belt.alternate === null)
      throw new Error("Blueprint belt cannot switch without an alternate");
    const cell = belt.x + "," + belt.y;
    if (beltCells.has(cell)) throw new Error("Duplicate blueprint belt");
    beltCells.add(cell);
    if (machineRects.some((machine) => contains(machine, belt)))
      throw new Error("Blueprint belt overlaps a machine");
    if (wall(factory, belt)) {
      if (belt.alternate !== null)
        throw new Error("Blueprint wall belts cannot be diverters");
      if (
        !ports.some(
          (port) =>
            port.x === belt.x &&
            port.y === belt.y &&
            port.direction === belt.direction,
        )
      )
        throw new Error("Blueprint wall belt requires a matching port");
    }
    return belt;
  });

  const liquid =
    root.schemaVersion === 3 ||
    root.schemaVersion === 4 ||
    root.schemaVersion === 5;
  const profileFields = (r: RecordValue) => {
    if (root.schemaVersion !== 5) return {};
    const id = string(r.containmentProfileId, "Containment profile");
    if (!content.liquidLogistics?.containmentProfiles.some((p) => p.id === id))
      throw Error("Unknown containment profile");
    return { containmentProfileId: id };
  };
  const profileKeys = root.schemaVersion === 5 ? ["containmentProfileId"] : [];
  const pipes = liquid
    ? array(root.pipes, "Blueprint pipes").map((value) => {
        const r = record(value, "Blueprint pipe");
        exactKeys(
          r,
          ["x", "y", "inlet", "outlet", ...profileKeys],
          "Blueprint pipe",
        );
        const p = {
          ...profileFields(r),
          x: integer(r.x, "Pipe x", 0, width - 1),
          y: integer(r.y, "Pipe y", 0, height - 1),
          inlet: direction(r.inlet, "Pipe inlet"),
          outlet: direction(r.outlet, "Pipe outlet"),
        };
        if (p.inlet === p.outlet)
          throw new Error("Pipe inlet and outlet coincide");
        return p;
      })
    : [];
  const tanks = liquid
    ? array(root.tanks, "Blueprint tanks").map((value) => {
        const r = record(value, "Blueprint tank");
        exactKeys(r, ["x", "y", "direction", ...profileKeys], "Blueprint tank");
        return {
          ...profileFields(r),
          x: integer(r.x, "Tank x", 0, width - 1),
          y: integer(r.y, "Tank y", 0, height - 1),
          direction: direction(r.direction, "Tank direction"),
        };
      })
    : [];
  const pumps = liquid
    ? array(root.pumps, "Blueprint pumps").map((value) => {
        const r = record(value, "Blueprint pump");
        exactKeys(
          r,
          ["x", "y", "direction", "enabled", ...profileKeys],
          "Blueprint pump",
        );
        return {
          ...profileFields(r),
          x: integer(r.x, "Pump x", 0, width - 1),
          y: integer(r.y, "Pump y", 0, height - 1),
          direction: direction(r.direction, "Pump direction"),
          enabled: boolean(r.enabled, "Pump enabled"),
        };
      })
    : [];
  if (liquid && !content.liquidLogistics)
    throw new Error("Liquid infrastructure is not authored");
  const occupied = [
    ...machineRects,
    ...belts.map((b) => ({ ...b, width: 1, height: 1 })),
  ];
  for (const [kind, rows] of [
    ["tank", tanks],
    ["pipe", pipes],
    ["pump", pumps],
  ] as const)
    for (const p of rows) {
      const r =
        kind === "tank"
          ? footprint(
              p as { x: number; y: number; direction: number },
              content.liquidLogistics!.tank,
            )
          : { ...p, width: 1, height: 1 };
      if (kind === "tank" && !inside(factory, r))
        throw new Error("Blueprint tank must fit inside walls");
      if (occupied.some((o) => overlaps(o, r)))
        throw new Error("Blueprint liquid infrastructure overlaps");
      if (wall(factory, p)) {
        const d = "outlet" in p ? p.outlet : p.direction;
        if (
          !ports.some(
            (port) => port.x === p.x && port.y === p.y && port.direction === d,
          ) ||
          ("inlet" in p && p.inlet !== (d + 2) % 4)
        )
          throw new Error(
            "Blueprint liquid wall requires a matching straight port",
          );
      }
      occupied.push(r);
    }

  const gas = root.schemaVersion === 4 || root.schemaVersion === 5;
  const pressureLines = gas
    ? array(root.pressureLines, "Blueprint pressureLines").map((value) => {
        const r = record(value, "Blueprint pipe");
        exactKeys(r, ["x", "y", "inlet", "outlet"], "Blueprint pipe");
        const p = {
          x: integer(r.x, "Pipe x", 0, width - 1),
          y: integer(r.y, "Pipe y", 0, height - 1),
          inlet: direction(r.inlet, "Pipe inlet"),
          outlet: direction(r.outlet, "Pipe outlet"),
        };
        if (p.inlet === p.outlet)
          throw new Error("Pipe inlet and outlet coincide");
        return p;
      })
    : [];
  const pressureVessels = gas
    ? array(root.pressureVessels, "Blueprint pressureVessels").map((value) => {
        const r = record(value, "Blueprint tank");
        exactKeys(r, ["x", "y", "direction"], "Blueprint tank");
        return {
          x: integer(r.x, "Tank x", 0, width - 1),
          y: integer(r.y, "Tank y", 0, height - 1),
          direction: direction(r.direction, "Tank direction"),
        };
      })
    : [];
  const compressors = gas
    ? array(root.compressors, "Blueprint compressors").map((value) => {
        const r = record(value, "Blueprint pump");
        exactKeys(r, ["x", "y", "direction", "enabled"], "Blueprint pump");
        return {
          x: integer(r.x, "Pump x", 0, width - 1),
          y: integer(r.y, "Pump y", 0, height - 1),
          direction: direction(r.direction, "Pump direction"),
          enabled: boolean(r.enabled, "Pump enabled"),
        };
      })
    : [];
  if (
    gas &&
    !content.gasLogistics &&
    (pressureLines.length || pressureVessels.length || compressors.length)
  )
    throw new Error("Gas infrastructure is not authored");
  for (const [kind, rows] of [
    ["vessel", pressureVessels],
    ["line", pressureLines],
    ["compressor", compressors],
  ] as const)
    for (const p of rows) {
      const r =
        kind === "vessel"
          ? footprint(
              p as { x: number; y: number; direction: number },
              content.gasLogistics!.vessel,
            )
          : { ...p, width: 1, height: 1 };
      if (kind === "vessel" && !inside(factory, r))
        throw new Error("Blueprint tank must fit inside walls");
      if (occupied.some((o) => overlaps(o, r)))
        throw new Error("Blueprint gas infrastructure overlaps");
      if (wall(factory, p)) {
        const d = "outlet" in p ? p.outlet : p.direction;
        if (
          !ports.some(
            (port) => port.x === p.x && port.y === p.y && port.direction === d,
          ) ||
          ("inlet" in p && p.inlet !== (d + 2) % 4)
        )
          throw new Error(
            "Blueprint gas wall requires a matching straight port",
          );
      }
      occupied.push(r);
    }

  return canonical({
    schemaVersion: root.schemaVersion,
    ...(gas ? { pressureLines, pressureVessels, compressors } : {}),
    ...(liquid ? { pipes, tanks, pumps } : {}),
    width,
    height,
    ports,
    machines,
    belts,
  });
}

export function factoryBlueprint(
  content: Content,
  state: Save,
  factoryId: string,
): FactoryBlueprint {
  const factory = state.factories[factoryId];
  if (!factory) throw new Error("Unknown factory");

  const gasRows = {
    pressureLines: Object.values(state.pressureLines)
      .filter((p) => contains(factory, p))
      .map((p) => ({
        x: p.x - factory.x,
        y: p.y - factory.y,
        inlet: p.inlet,
        outlet: p.outlet,
      })),
    pressureVessels: Object.values(state.pressureVessels)
      .filter((p) => contains(factory, p))
      .map((p) => ({
        x: p.x - factory.x,
        y: p.y - factory.y,
        direction: p.direction,
      })),
    compressors: Object.values(state.compressors)
      .filter((p) => contains(factory, p))
      .map((p) => ({
        x: p.x - factory.x,
        y: p.y - factory.y,
        direction: p.direction,
        enabled: p.enabled,
      })),
  };
  const hasGas = Object.values(gasRows).some((rows) => rows.length);
  const liquidRows = {
    pipes: Object.values(state.pipes)
      .filter((p) => contains(factory, p))
      .map((p) => ({
        containmentProfileId: p.containmentProfileId,
        x: p.x - factory.x,
        y: p.y - factory.y,
        inlet: p.inlet,
        outlet: p.outlet,
      })),
    tanks: Object.values(state.tanks)
      .filter((p) => contains(factory, p))
      .map((p) => ({
        containmentProfileId: p.containmentProfileId,
        x: p.x - factory.x,
        y: p.y - factory.y,
        direction: p.direction,
      })),
    pumps: Object.values(state.pumps)
      .filter((p) => contains(factory, p))
      .map((p) => ({
        containmentProfileId: p.containmentProfileId,
        x: p.x - factory.x,
        y: p.y - factory.y,
        direction: p.direction,
        enabled: p.enabled,
      })),
  };
  const hasLiquid = Object.values(liquidRows).some((rows) => rows.length);
  const hasJunction = Object.values(state.belts).some(
    (b) => contains(factory, b) && b.junction,
  );
  return validateFactoryBlueprint(content, {
    schemaVersion: hasLiquid ? 5 : hasGas ? 4 : hasJunction ? 2 : 1,
    ...(hasGas || hasLiquid ? liquidRows : {}),
    ...(hasGas || hasLiquid ? gasRows : {}),
    width: factory.width,
    height: factory.height,
    ports: factory.ports.map((port) => ({
      x: port.x - factory.x,
      y: port.y - factory.y,
      direction: port.direction,
    })),
    machines: Object.values(state.machines)
      .filter((machine) => machine.factoryId === factory.id)
      .map((machine) => ({
        definitionId: machine.definitionId,
        x: machine.x - factory.x,
        y: machine.y - factory.y,
        direction: machine.direction,
        operation: machine.operation,
      })),
    belts: Object.values(state.belts)
      .filter((belt) => contains(factory, belt))
      .map((belt) => ({
        x: belt.x - factory.x,
        y: belt.y - factory.y,
        direction: belt.direction,
        alternate: belt.alternate,
        switched: belt.switched,
        ...(hasJunction || hasLiquid || hasGas
          ? {
              junction: belt.junction
                ? {
                    definitionId: belt.junction.definitionId,
                    branch: belt.junction.branch,
                  }
                : null,
            }
          : {}),
      })),
  });
}

export function serializeFactoryBlueprint(
  content: Content,
  state: Save,
  factoryId: string,
): string {
  return JSON.stringify(factoryBlueprint(content, state, factoryId));
}

export function parseFactoryBlueprint(
  content: Content,
  input: unknown,
): FactoryBlueprint {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new Error("Factory blueprint is not valid JSON");
    }
  }
  return validateFactoryBlueprint(content, value);
}
