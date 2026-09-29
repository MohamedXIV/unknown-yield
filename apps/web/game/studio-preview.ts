import type { Content } from "@site/content";
import {
  Simulation,
  socket,
  type GameCommand,
  type MachineStatus,
} from "@site/sim-core";

export type StudioReactionPreview = {
  reactionId: string;
  machineDefinitionId: string;
  operationId: string;
  processConditionId: string | null;
  inputId: string;
  outputId: string;
  ticks: number;
  outputAmount: number;
  incidentId: string | null;
  machineStatus: MachineStatus;
  fuelRemaining: number;
};

type PreviewLayout = {
  content: Content;
  factory: { x: number; y: number; width: number; height: number };
  inputPort: { x: number; y: number };
  extractor: { x: number; y: number };
  processor: { x: number; y: number };
  inputBelts: { x: number; y: number }[];
};

function command(sim: Simulation, value: GameCommand) {
  const result = sim.command(value);
  if (!result.ok) throw new Error("Studio preview setup failed: " + result.message);
  return result.id ?? null;
}

function horizontal(startX: number, endX: number, y: number) {
  const points = [];
  for (let x = startX; x <= endX; x++) points.push({ x, y });
  return points;
}

function previewLayout(
  source: Content,
  reactionId: string,
): PreviewLayout & {
  processorDefinitionId: string;
  reaction: Content["reactions"][number];
} {
  const reaction = source.reactions.find((row) => row.id === reactionId);
  if (!reaction) throw new Error("Unknown Studio preview reaction: " + reactionId);

  const extractor = source.machines.find((machine) => machine.role === "extractor");
  if (!extractor)
    throw new Error("Studio preview requires at least one extractor definition");

  const processor = source.machines.find(
    (machine) =>
      machine.role === "processor" &&
      machine.operations.includes(reaction.operation) &&
      machine.processConditionId === reaction.processConditionId,
  );
  if (!processor)
    throw new Error("No compatible processor can preview reaction " + reactionId);

  const factoryWidth = Math.max(
      source.site.factoryMin,
      8,
      processor.width + 4,
    ),
    factoryHeight = Math.max(
      source.site.factoryMin,
      8,
      processor.height + 4,
    );
  if (
    factoryWidth > source.site.factoryMax ||
    factoryHeight > source.site.factoryMax
  )
    throw new Error(
      "Compatible processor does not fit inside the authored factory size limits",
    );

  const factory = {
      x: 3 + extractor.width + 6,
      y: Math.max(10, Math.ceil(extractor.height / 2) + 4),
      width: factoryWidth,
      height: factoryHeight,
    },
    processorPoint = { x: factory.x + 2, y: factory.y + 2, direction: 0 },
    processorInput = socket(processorPoint, processor, false),
    rowY = processorInput.y,
    extractorY = rowY - Math.floor(extractor.height / 2),
    extractorPoint = { x: 3, y: extractorY, direction: 0 },
    extractorOutput = socket(extractorPoint, extractor, true),
    inputBelts = horizontal(extractorOutput.x, processorInput.x, rowY);

  if (inputBelts.length > 4800)
    throw new Error("Studio preview route exceeds the simulation belt-path limit");

  const terminal = {
      x: factory.x + factory.width + 10,
      y: 2,
      width: 4,
      height: 4,
    },
    siteWidth = terminal.x + terminal.width + 4,
    siteHeight = Math.max(
      factory.y + factory.height + 4,
      extractorY + extractor.height + 4,
      terminal.y + terminal.height + 4,
    ),
    maxFuel = Math.max(...source.machines.map((machine) => machine.fuel)),
    preview = structuredClone(source);

  preview.materials = preview.materials.map((material) =>
    material.id === reaction.input ? { ...material, known: true } : material,
  );
  preview.machines = preview.machines.map((machine) => {
    if (machine.id !== processor.id && machine.id !== extractor.id) return machine;
    const withoutUnlock = { ...machine, cost: 1 };
    delete withoutUnlock.unlock;
    return withoutUnlock;
  });
  preview.site = {
    ...preview.site,
    width: siteWidth,
    height: siteHeight,
    startStock: 1_000_000,
    factoryCellCost: 1,
    beltCost: 1,
    portCost: 1,
    terminal,
    deposits: [
      {
        id: "studio-preview-deposit",
        material: reaction.input,
        x: extractorPoint.x,
        y: extractorPoint.y,
        width: extractor.width,
        height: extractor.height,
        units: 1000,
      },
    ],
  };
  preview.economy = {
    ...preview.economy,
    startFuel: Math.min(
      1_000_000,
      Math.max(
        preview.economy.startFuel,
        (extractor.fuel + processor.fuel) * 1000 + 100,
      ),
    ),
    grant: Math.max(preview.economy.grant, maxFuel * 8),
  };

  return {
    content: preview,
    reaction,
    processorDefinitionId: processor.id,
    factory,
    inputPort: { x: factory.x, y: rowY },
    extractor: { x: extractorPoint.x, y: extractorPoint.y },
    processor: { x: processorPoint.x, y: processorPoint.y },
    inputBelts,
  };
}

export function previewStudioReaction(
  content: Content,
  reactionId: string,
): StudioReactionPreview {
  const layout = previewLayout(content, reactionId),
    sim = new Simulation(layout.content);

  const factoryId = command(sim, {
    type: "placeFactory",
    ...layout.factory,
  });
  if (!factoryId) throw new Error("Studio preview factory did not receive an ID");

  command(sim, {
    type: "placePort",
    factoryId,
    ...layout.inputPort,
    direction: 0,
  });

  command(sim, {
    type: "placeMachine",
    definitionId: layout.content.machines.find(
      (machine) => machine.role === "extractor",
    )!.id,
    ...layout.extractor,
    direction: 0,
  });

  const processorId = command(sim, {
    type: "placeMachine",
    definitionId: layout.processorDefinitionId,
    ...layout.processor,
    direction: 0,
  });
  if (!processorId)
    throw new Error("Studio preview processor did not receive an ID");

  command(sim, {
    type: "setOperation",
    machineId: processorId,
    operation: layout.reaction.operation,
  });

  command(sim, {
    type: "placeBelts",
    points: layout.inputBelts,
    direction: 0,
  });

  const maxTicks = Math.min(
    20_000,
    Math.max(
      2_000,
      layout.inputBelts.length *
        layout.content.site.transportEveryTicks *
        20 +
        layout.content.machines.find(
          (machine) => machine.id === layout.processorDefinitionId,
        )!.durationTicks *
          20,
    ),
  );

  for (let index = 0; index < maxTicks; index++) {
    sim.step(layout.content.tickMs);
    const save = sim.serialize(),
      produced = save.flows.produced[layout.reaction.output] ?? 0;
    if (produced >= layout.reaction.outputAmount) {
      const machine = sim
        .snapshot()
        .machines.find((candidate) => candidate.id === processorId)!;
      return {
        reactionId: layout.reaction.id,
        machineDefinitionId: layout.processorDefinitionId,
        operationId: layout.reaction.operation,
        processConditionId: layout.reaction.processConditionId ?? null,
        inputId: layout.reaction.input,
        outputId: layout.reaction.output,
        ticks: save.tick,
        outputAmount: produced,
        incidentId: save.machines[processorId].incident,
        machineStatus: machine.status,
        fuelRemaining: save.fuel,
      };
    }
  }

  throw new Error(
    "Studio preview did not complete reaction within " + maxTicks + " ticks",
  );
}
