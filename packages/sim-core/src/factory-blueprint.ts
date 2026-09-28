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
};

export type FactoryBlueprint = {
  schemaVersion: 1;
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

const machineOrder = (
  a: FactoryBlueprintMachine,
  b: FactoryBlueprintMachine,
) =>
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
  schemaVersion: 1,
  width: blueprint.width,
  height: blueprint.height,
  ports: [...blueprint.ports].sort(portOrder),
  machines: [...blueprint.machines].sort(machineOrder),
  belts: [...blueprint.belts].sort(beltOrder),
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
    ["schemaVersion", "width", "height", "ports", "machines", "belts"],
    "Factory blueprint",
  );
  if (root.schemaVersion !== 1)
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

  const ports: FactoryBlueprintPort[] = array(root.ports, "Blueprint ports").map(
    (value, index) => {
      const row = record(value, "Blueprint port " + index);
      exactKeys(row, ["x", "y", "direction"], "Blueprint port " + index);
      return {
        x: integer(row.x, "Blueprint port x", 0, width - 1),
        y: integer(row.y, "Blueprint port y", 0, height - 1),
        direction: direction(row.direction, "Blueprint port direction"),
      };
    },
  );

  const factory = relativeFactory(width, height, []);
  const portCells = new Set<string>();
  for (const port of ports) {
    if (!wall(factory, port)) throw new Error("Blueprint port must be on a wall");
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
  const operationIds = new Set(content.operations.map((operation) => operation.id));
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
  const belts: FactoryBlueprintBelt[] = array(root.belts, "Blueprint belts").map(
    (value, index) => {
      const row = record(value, "Blueprint belt " + index);
      exactKeys(
        row,
        ["x", "y", "direction", "alternate", "switched"],
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
    },
  );

  return canonical({
    schemaVersion: 1,
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

  return validateFactoryBlueprint(content, {
    schemaVersion: 1,
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
