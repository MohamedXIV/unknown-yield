import type {
  Content,
  MachineDefinition,
  StorageDefinition,
} from "@site/content";
export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Inventory = Record<string, number>;
export type FlowTotals = {
  consumed: Inventory;
  produced: Inventory;
  exported: Inventory;
  discarded: Inventory;
};
export type ExperimentEvidence = {
  operationId: string;
  inputId: string;
  processConditionId: string | null;
  state: "hinted" | "confirmed";
};
export function experimentEvidenceKey(
  operationId: string,
  inputId: string,
  processConditionId: string | null,
) {
  return [operationId, inputId, processConditionId ?? "default"].join("/");
}
export type Port = Point & { id: string; direction: number };
export type Factory = Rect & { id: string; ports: Port[] };
export type FactoryPortView = Port & { role: "input" | "output" };
export type FactoryThroughputRate = {
  materialId: string;
  units: number;
  cycleTicks: number;
  unitsPerMinute: number;
};
export type FactoryThroughputView = {
  state: "measuring" | "stable";
  cycleTicks: number | null;
  inputs: FactoryThroughputRate[];
  outputs: FactoryThroughputRate[];
};
export type FactoryContractView = {
  machineCount: number;
  statusCounts: Record<MachineStatus, number>;
  throughput: FactoryThroughputView;
};
export type FactoryView = Omit<Factory, "ports"> & {
  ports: FactoryPortView[];
  contract: FactoryContractView;
};
export type Job = { remaining: number; reaction: string | null };
/**
 * Semantic machine status codes (Issue #14).
 *
 * Gameplay branches on these codes; presentation maps them to text.
 * They must stay kebab-case tokens — never English display prose.
 */
export const MACHINE_STATUSES = [
  "processing",
  "incident",
  "disabled",
  "deposit-exhausted",
  "needs-compatible-input",
  "needs-input",
  "output-full",
  "needs-fuel",
  "ready",
] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];
export type Machine = Point & {
  id: string;
  definitionId: string;
  direction: number;
  factoryId: string | null;
  depositId: string | null;
  operation: string | null;
  enabled: boolean;
  incident: string | null;
  input: Inventory;
  output: Inventory;
  job: Job | null;
};
export type Belt = Point & {
  id: string;
  direction: number;
  cargo: string | null;
  alternate: number | null;
  switched: boolean;
};
export type Storage = Point & {
  id: string;
  definitionId: string;
  direction: number;
  inventory: Inventory;
};
export type MarketState = {
  demandBps: number;
  saturationBps: number;
};
export type MarketListingView = MarketState & {
  materialId: string;
  compensationPerUnit: number;
  handling: {
    nameKey: string;
    unlocked: boolean;
  } | null;
};
export type MilestoneState = {
  completedAt: number;
};
export type MilestoneView = {
  id: string;
  nameKey: string;
  hintKey: string;
  completed: boolean;
  completedAt: number | null;
  unlockedTerminalCapabilities: {
    id: string;
    nameKey: string;
    unlocked: boolean;
  }[];
};
export type OpportunityStatus = "offered" | "completed" | "expired";
export type OpportunityState = {
  status: OpportunityStatus;
  offeredAt: number;
  expiresAt: number;
  progress: number;
  completedAt: number | null;
};
export type OpportunityView =
  | {
      id: string;
      kind: "order";
      nameKey: string;
      briefKey: string;
      rewardFuel: number;
      expiresAt: number;
      materialId: string;
      quantity: number;
      progress: number;
    }
  | {
      id: string;
      kind: "directive";
      nameKey: string;
      briefKey: string;
      rewardFuel: number;
      expiresAt: number;
      operationId: string;
      inputMaterialId: string;
      setupNameKey?: string;
    };
export type Save = {
  schemaVersion: number;
  contentVersion: string;
  tick: number;
  remainder: number;
  nextId: number;
  fuel: number;
  debt: number;
  exported: number;
  flows: FlowTotals;
  stock: Inventory;
  knowledge: string[];
  evidence: Record<string, ExperimentEvidence>;
  deposits: Inventory;
  machines: Record<string, Machine>;
  factories: Record<string, Factory>;
  belts: Record<string, Belt>;
  storages: Record<string, Storage>;
  staging: Inventory;
  policies: Record<string, "keep" | "export">;
  market: Record<string, MarketState>;
  opportunities: Record<string, OpportunityState>;
  milestones: Record<string, MilestoneState>;
};
export type CommandResult = {
  ok: boolean;
  message: string;
  id?: string;
  cost?: number;
};
export type GameCommand =
  | ({ type: "placeMachine"; definitionId: string; direction: number } & Point)
  | ({ type: "placeStorage"; definitionId: string; direction: number } & Point)
  | ({ type: "placeFactory" } & Rect)
  | ({ type: "placePort"; factoryId: string; direction: number } & Point)
  | { type: "placeBelts"; points: Point[]; direction: number }
  | { type: "rotateDivert"; beltId: string }
  | { type: "switchDivert"; beltId: string }
  | { type: "dismantle"; id: string }
  | { type: "setEnabled"; machineId: string; enabled: boolean }
  | { type: "setOperation"; machineId: string; operation: string }
  | { type: "setPolicy"; materialId: string; policy: "keep" | "export" }
  | { type: "assistance" };
export type MachineView = Omit<Machine, "job" | "incident"> & {
  job: { remaining: number } | null;
  incident: { nameKey: string; textKey: string } | null;
  nameKey: string;
  role: "extractor" | "processor";
  width: number;
  height: number;
  capacity: number;
  durationTicks: number;
  durationMs: number;
  fuelCost: number;
  status: MachineStatus;
  progress: number;
};
export type MachineDefinitionView = Omit<MachineDefinition, "unlock"> & {
  unlock: { unlocked: boolean; hintKey: string } | null;
};
export type StorageView = Storage & {
  nameKey: string;
  width: number;
  height: number;
  capacity: number;
};
export type Observation = {
  operationId: string;
  inputId: string;
  outputId: string;
  textKey: string;
  initial: boolean;
  observedAt?: Point;
};
export type KnowledgeEntry = {
  id: string;
  state: "hinted" | "confirmed";
  operationId: string;
  inputId: string;
  setupNameKey?: string;
  outputId?: string;
  textKey?: string;
  initial: boolean;
  observedAt?: Point;
};
export type PlayerSnapshot = {
  tick: number;
  fuel: number;
  debt: number;
  stock: Inventory;
  exported: number;
  milestone: boolean;
  map: Content["site"];
  deposits: (Content["site"]["deposits"][number] & { remaining: number })[];
  definitions: MachineDefinitionView[];
  storageDefinitions: StorageDefinition[];
  operations: Content["operations"];
  materials: Content["materials"];
  machines: MachineView[];
  factories: FactoryView[];
  belts: Belt[];
  storages: StorageView[];
  staging: Inventory;
  policies: Record<string, "keep" | "export">;
  exchange: MarketListingView[];
  opportunities: OpportunityView[];
  milestones: MilestoneView[];
  knowledgeEntries: KnowledgeEntry[];
  observations: Observation[];
};
export const total = (inv: Inventory) =>
  Object.values(inv).reduce((a, b) => a + b, 0);
export const amount = (inv: Inventory, id: string) =>
  Object.hasOwn(inv, id) ? inv[id] : 0;
export function change(inv: Inventory, id: string, delta: number) {
  const n = amount(inv, id) + delta;
  if (n === 0) delete inv[id];
  else inv[id] = n;
}
export function emptyFlows(): FlowTotals {
  return { consumed: {}, produced: {}, exported: {}, discarded: {} };
}
