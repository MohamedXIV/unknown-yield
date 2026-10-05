import type {
  Content,
  MachineDefinition,
  StorageDefinition,
} from "@site/content";
import type { TransportDiagnostic } from "./containment";
export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Inventory = Record<string, number>;
export const SENSING_SIGNAL_BANDS = [
  "none",
  "weak",
  "moderate",
  "strong",
] as const;
export const SENSING_DEPTH_BANDS = [
  "unknown",
  "shallow",
  "intermediate",
  "deep",
] as const;
export type SensingSignalBand = (typeof SENSING_SIGNAL_BANDS)[number];
export type SensingDepthBand = (typeof SENSING_DEPTH_BANDS)[number];
export type SensingObservation = Point & {
  capabilityId: string;
  mode: "scan" | "probe";
  observedAtTick: number;
  signalBand: SensingSignalBand;
  depthBand: SensingDepthBand;
};
export type SensingCapabilityView = {
  id: string;
  nameKey: string;
  mode: "scan" | "probe";
  range: number;
  unlocked: boolean;
};
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
export type FactoryConnectionKind = "solid" | "liquid" | "gas";
export type FactoryRelocationState = {
  startedAt: number;
  readyAt: number;
  requirements: {
    portId: string;
    kind: FactoryConnectionKind;
  }[];
};
export type Factory = Rect & {
  id: string;
  ports: Port[];
  relocation?: FactoryRelocationState;
};
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
  liquidInventory?: Inventory;
  gasInventory?: Inventory;
  machineCount: number;
  statusCounts: Record<MachineStatus, number>;
  throughput: FactoryThroughputView;
};
export type FactoryView = Omit<Factory, "ports" | "relocation"> & {
  ports: FactoryPortView[];
  relocation: {
    remainingTicks: number;
    connectionsRestored: boolean;
    requiredConnections: number;
  } | null;
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
  "source-exhausted",
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
  incidentInventory: Inventory;
  input: Inventory;
  output: Inventory;
  job: Job | null;
};
export type CrossingState = {
  axis: 0 | 1;
  remaining: number;
  pending: 0 | 1 | null;
  held: 0 | 1 | null;
};
export type Junction = {
  definitionId: string;
  branch: 1 | -1;
  cursor: 0 | 1;
  crossing?: CrossingState;
};
export type Belt = Point & {
  junction?: Junction | null;
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
export type LiquidContents = {
  materialId: string | null;
  quantity: number;
  containmentProfileId: string;
};
export type Pipe = Point &
  LiquidContents & { id: string; inlet: number; outlet: number };
export type Tank = Point & LiquidContents & { id: string; direction: number };
export type PumpIncident = {
  definitionId: string;
  materialId: string;
  quantity: number;
  startedAt: number;
  drainEnabled: boolean;
};
export type Pump = Point & {
  id: string;
  direction: number;
  enabled: boolean;
  containmentProfileId: string;
  incident: PumpIncident | null;
};
export type GasContents = { materialId: string | null; quantity: number };
export type PressureLine = Point &
  GasContents & { id: string; inlet: number; outlet: number };
export type PressureVessel = Point &
  GasContents & { id: string; direction: number };
export type Compressor = Point & {
  id: string;
  direction: number;
  enabled: boolean;
};
export type MarketState = {
  demandBps: number;
  saturationBps: number;
};
export type MarketSignalState = {
  triggeredAt: number;
};
export type MarketBulletinView = {
  id: string;
  nameKey: string;
  briefKey: string;
  materialId: string;
  demandDeltaBps: number;
  triggeredAt: number;
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
export type CompanyStanding = "clear" | "recovery";
export type CompanyState = {
  standing: CompanyStanding;
  interventionStreak: number;
  recoveryNetFuel: number;
  recoveryPackageId: string | null;
  repaidSinceAssistanceFuel: number;
};
export type AssistanceReason = "fuel-not-depleted" | "obligation-open" | null;
export type AssistanceView = {
  id: string;
  nameKey: string;
  briefKey: string;
  grantFuel: number;
  nextObligationFuel: number;
  eligible: boolean;
  reason: AssistanceReason;
};
export type CompanyView = {
  standing: CompanyStanding;
  interventionStreak: number;
  recoveryNetFuel: number;
  recoveryPackageId: string | null;
  recoveryTargetNetFuel: number;
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
export type TerminalModuleContents = {
  materialId: string | null;
  quantity: number;
};
export type TerminalImportState = {
  staging: Inventory;
  received: Inventory;
};
export type ImportSupplyView = Content["economy"]["imports"][number] & {
  eligible: boolean;
  held: number;
  reason:
    | "fuel"
    | "capacity"
    | "locked"
    | "module-missing"
    | "incompatible"
    | null;
};
export type TerminalModuleView = Content["site"]["terminalModules"][number] & {
  installed: boolean;
  unlocked: boolean;
  contents: TerminalModuleContents;
  canInstall: boolean;
  canRemove: boolean;
  blockedReason:
    "locked" | "installed" | "needs-stock" | "not-installed" | "loaded" | null;
};
export type Save = {
  terminalModules: Record<string, TerminalModuleContents>;
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
  hazardEvidence: string[];
  sensingObservations: Record<string, SensingObservation>;
  discoveredDeposits: string[];
  deposits: Inventory;
  atmosphericSources: Inventory;
  machines: Record<string, Machine>;
  factories: Record<string, Factory>;
  belts: Record<string, Belt>;
  pressureLines: Record<string, PressureLine>;
  pressureVessels: Record<string, PressureVessel>;
  compressors: Record<string, Compressor>;
  pipes: Record<string, Pipe>;
  tanks: Record<string, Tank>;
  pumps: Record<string, Pump>;
  storages: Record<string, Storage>;
  staging: Inventory;
  shipmentManifest: Inventory;
  terminalImports: TerminalImportState;
  policies: Record<string, "keep" | "export">;
  market: Record<string, MarketState>;
  marketSignals: Record<string, MarketSignalState>;
  opportunities: Record<string, OpportunityState>;
  milestones: Record<string, MilestoneState>;
  company: CompanyState;
};
export type CommandResult = {
  ok: boolean;
  message: string;
  messageKey?: string;
  id?: string;
  cost?: number;
};
export type GameCommand =
  | { type: "repairPump"; id: string }
  | { type: "setPumpRecoveryDrain"; id: string; enabled: boolean }
  | {
      type: "installTerminalModule" | "removeTerminalModule";
      definitionId: string;
    }
  | {
      type: "placePressureLines";
      points: (Point & { inlet: number; outlet: number })[];
    }
  | ({ type: "placePressureVessel"; direction: number } & Point)
  | ({ type: "placeCompressor"; direction: number } & Point)
  | { type: "setCompressorEnabled"; id: string; enabled: boolean }
  | { type: "configurePressureLine"; id: string; inlet: number; outlet: number }
  | {
      type: "placePipes";
      containmentProfileId?: string;
      points: (Point & { inlet: number; outlet: number })[];
    }
  | ({
      type: "placeTank";
      containmentProfileId?: string;
      direction: number;
    } & Point)
  | ({
      type: "placePump";
      containmentProfileId?: string;
      direction: number;
    } & Point)
  | {
      type: "setLiquidContainmentProfile";
      id: string;
      containmentProfileId: string;
    }
  | { type: "setPumpEnabled"; id: string; enabled: boolean }
  | { type: "configurePipe"; id: string; inlet: number; outlet: number }
  | ({ type: "placeMachine"; definitionId: string; direction: number } & Point)
  | ({ type: "placeStorage"; definitionId: string; direction: number } & Point)
  | ({ type: "placeFactory" } & Rect)
  | ({ type: "reshapeFactory"; factoryId: string } & Rect)
  | ({ type: "relocateFactory"; factoryId: string } & Point)
  | ({ type: "placePort"; factoryId: string; direction: number } & Point)
  | { type: "placeBelts"; points: Point[]; direction: number }
  | {
      type: "configureJunction";
      beltId: string;
      definitionId: string | null;
      direction: number;
      branch: 1 | -1;
    }
  | { type: "rotateDivert"; beltId: string }
  | { type: "switchDivert"; beltId: string }
  | {
      type: "setDivertRoute";
      beltId: string;
      route: "primary" | "alternate";
    }
  | { type: "dismantle"; id: string }
  | { type: "recoverMachineIncident"; machineId: string }
  | { type: "setEnabled"; machineId: string; enabled: boolean }
  | { type: "setOperation"; machineId: string; operation: string }
  | { type: "setPolicy"; materialId: string; policy: "keep" | "export" }
  | { type: "setShipmentQuantity"; materialId: string; quantity: number }
  | { type: "dispatchShipment" }
  | { type: "requestImport"; supplyId: string }
  | { type: "sense"; capabilityId: string; x: number; y: number }
  | { type: "assistance"; packageId?: string };
export type MachineHazardView = {
  classId: string;
  classNameKey: string;
  nameKey: string;
  textKey: string;
  evidenceKey: string;
  saferHintKey: string;
};
export type HazardEvidenceView = MachineHazardView & {
  id: string;
  operationId: string;
  inputId: string;
  setupNameKey?: string;
};
export type MachineView = Omit<Machine, "job" | "incident"> & {
  job: { remaining: number } | null;
  incident: MachineHazardView | null;
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
export type AtmosphericSourceView = Omit<
  Content["site"]["atmosphericSources"][number],
  "material" | "surveySignalId" | "requiredSensingCapabilityId"
> & {
  material: string | null;
  remaining: number;
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
  terminalModules: TerminalModuleView[];
  containmentCapabilities: Content["containmentCapabilities"];
  transportDiagnostics: Record<
    string,
    import("./containment").TransportDiagnostic
  >;
  tick: number;
  fuel: number;
  debt: number;
  stock: Inventory;
  exported: number;
  milestone: boolean;
  map: Omit<
    Content["site"],
    | "sensingCapabilities"
    | "surveySignals"
    | "hiddenDeposits"
    | "atmosphericSources"
  >;
  sensingCapabilities: SensingCapabilityView[];
  sensingObservations: SensingObservation[];
  deposits: (Content["site"]["deposits"][number] & { remaining: number })[];
  atmosphericSources: AtmosphericSourceView[];
  definitions: MachineDefinitionView[];
  storageDefinitions: StorageDefinition[];
  junctionDefinitions: Content["junctions"];
  operations: Content["operations"];
  materials: Content["materials"];
  machines: MachineView[];
  factories: FactoryView[];
  belts: Belt[];
  pressureLines: PressureLine[];
  pressureVessels: (PressureVessel & {
    width: number;
    height: number;
    capacity: number;
  })[];
  compressors: (Compressor & {
    status:
      | "disabled"
      | "needs-fuel"
      | "needs-input"
      | "incompatible"
      | "output-full"
      | "ready";
  })[];
  gasLogistics: Content["gasLogistics"];
  pipes: Pipe[];
  tanks: (Tank & { width: number; height: number; capacity: number })[];
  pumps: (Omit<Pump, "incident"> & {
    incident:
      (Omit<PumpIncident, "materialId"> & { materialId: string | null }) | null;
    canRepair: boolean;
    recoveryDiagnostic: TransportDiagnostic | null;
    status:
      | "incident"
      | "disabled"
      | "needs-fuel"
      | "needs-input"
      | "incompatible"
      | "output-full"
      | "ready";
  })[];
  liquidLogistics: Content["liquidLogistics"];
  storages: StorageView[];
  staging: Inventory;
  shipmentManifest: Inventory;
  importStaging: Inventory;
  importSupplies: ImportSupplyView[];
  importOutlet: Point & { direction: number };
  policies: Record<string, "keep" | "export">;
  exchange: MarketListingView[];
  marketBulletins: MarketBulletinView[];
  opportunities: OpportunityView[];
  milestones: MilestoneView[];
  company: CompanyView;
  assistance: AssistanceView[];
  knowledgeEntries: KnowledgeEntry[];
  hazardEvidence: HazardEvidenceView[];
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
