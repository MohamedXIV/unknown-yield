export { Simulation } from "./simulation";
export {
  applyReactionHazard,
  hazardClassDefinition,
  hazardDefinition,
} from "./hazards";
export { collectLedger, auditLedger } from "./ledger";
export {
  allDeposits,
  depositDefinition,
  depositDepth,
  hiddenDepositDefinition,
  visibleDeposits,
} from "./deposits";
export type { LedgerRow, LedgerSnapshot, LedgerReport } from "./ledger";
export {
  socket,
  footprint,
  contains,
  wall,
  key,
  vectors,
  type FootprintDef,
} from "./geometry";
export {
  MACHINE_STATUSES,
  SENSING_DEPTH_BANDS,
  SENSING_SIGNAL_BANDS,
  experimentEvidenceKey,
} from "./types";
export {
  createSensingObservation,
  sensingCapabilityUnlocked,
  sensingObservationKey,
} from "./sensing";
export { factoryView } from "./factory-contract";
export {
  factoryBlueprint,
  serializeFactoryBlueprint,
  parseFactoryBlueprint,
  validateFactoryBlueprint,
} from "./factory-blueprint";
export type {
  FactoryBlueprint,
  FactoryBlueprintPort,
  FactoryBlueprintMachine,
  FactoryBlueprintBelt,
} from "./factory-blueprint";
export type {
  GameCommand,
  CommandResult,
  PlayerSnapshot,
  MachineView,
  MachineStatus,
  MachineDefinitionView,
  StorageView,
  Storage,
  Inventory,
  FlowTotals,
  ExperimentEvidence,
  KnowledgeEntry,
  SensingCapabilityView,
  SensingDepthBand,
  SensingObservation,
  SensingSignalBand,
  OpportunityState,
  OpportunityStatus,
  OpportunityView,
  MilestoneState,
  MilestoneView,
  CompanyStanding,
  CompanyState,
  CompanyView,
  AssistanceReason,
  AssistanceView,
  Save,
  Factory,
  FactoryView,
  FactoryPortView,
  FactoryContractView,
  FactoryThroughputView,
  FactoryThroughputRate,
  PressureLine,
  PressureVessel,
  Compressor,
  GasContents,
  Pipe,
  Tank,
  Pump,
  LiquidContents,
  Belt,
  Point,
  Rect,
} from "./types";

export {
  MARKET_BPS,
  applyExportCompensation,
  companyKnowsMaterial,
  ensureMarket,
  exchangeDefinition,
  initializeKnownMarkets,
  marketCompensation,
  marketListings,
  recordMarketExport,
  recoverMarkets,
} from "./market";

export {
  opportunityViews,
  recordDirectiveExperiment,
  recordOrderExport,
  refreshOpportunities,
} from "./opportunities";

export {
  milestoneRequirementSatisfied,
  milestoneSatisfied,
  milestoneViews,
  refreshMilestones,
  terminalCanExport,
  terminalCapabilityUnlocked,
} from "./milestones";

export {
  applyAssistance,
  assistanceDefinition,
  assistanceEligibility,
  assistanceViews,
  companyView,
  recordNetExportRecovery,
  recordObligationRepayment,
} from "./assistance";

export { beltArms } from "./junctions";
