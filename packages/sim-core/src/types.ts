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
export type Port = Point & { id: string; direction: number };
export type Factory = Rect & { id: string; ports: Port[] };
export type Job = { remaining: number; reaction: string | null };
/**
 * Semantic machine status codes (Issue #14).
 *
 * Gameplay branches on these codes; presentation maps them to text.
 * They must stay kebab-case tokens — never English display prose.
 */
export const MACHINE_STATUSES = [
  "processing",
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
  input: Inventory;
  output: Inventory;
  job: Job | null;
};
export type Belt = Point & {
  id: string;
  direction: number;
  cargo: string | null;
};
export type Storage = Point & {
  id: string;
  definitionId: string;
  direction: number;
  inventory: Inventory;
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
  deposits: Inventory;
  machines: Record<string, Machine>;
  factories: Record<string, Factory>;
  belts: Record<string, Belt>;
  storages: Record<string, Storage>;
  staging: Inventory;
  policies: Record<string, "keep" | "export">;
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
  | { type: "dismantle"; id: string }
  | { type: "setEnabled"; machineId: string; enabled: boolean }
  | { type: "setOperation"; machineId: string; operation: string }
  | { type: "setPolicy"; materialId: string; policy: "keep" | "export" }
  | { type: "assistance" };
export type MachineView = Omit<Machine, "job"> & {
  job: { remaining: number } | null;
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
export type PlayerSnapshot = {
  tick: number;
  fuel: number;
  debt: number;
  stock: Inventory;
  exported: number;
  milestone: boolean;
  map: Content["site"];
  deposits: (Content["site"]["deposits"][number] & { remaining: number })[];
  definitions: MachineDefinition[];
  storageDefinitions: StorageDefinition[];
  operations: Content["operations"];
  materials: Content["materials"];
  machines: MachineView[];
  factories: Factory[];
  belts: Belt[];
  storages: StorageView[];
  staging: Inventory;
  policies: Record<string, "keep" | "export">;
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
