import type { MachineStatus, MachineView, PlayerSnapshot } from "@site/sim-core";

export type KnowledgeFilter = "all" | "open" | "hazards" | "confirmed";

export type ContextOverview = {
  tone: "calm" | "good" | "warn" | "bad";
  eyebrow: string;
  title: string;
  detail: string;
};

const statusCopy: Record<
  MachineStatus,
  { tone: ContextOverview["tone"]; title: string; detail: string }
> = {
  processing: {
    tone: "good",
    title: "Processing normally",
    detail: "This machine is active. Watch its buffers and downstream route for backpressure.",
  },
  incident: {
    tone: "bad",
    title: "Physical incident",
    detail: "Inspect the incident evidence and recover the trapped material before restarting.",
  },
  "mechanical-failure": {
    tone: "bad",
    title: "Mechanical lockout",
    detail: "The failed tool needs actual replacement parts from nearby storage before it can restart. Finished output is retained.",
  },
  wrecked: {
    tone: "bad",
    title: "Machine wrecked",
    detail: "Irreparable structural damage. Save the real cargo and construction material through nearby-storage salvage; do not try restarting.",
  },
  disabled: {
    tone: "calm",
    title: "Machine disabled",
    detail: "Its buffers remain physical. Re-enable it when this line should resume.",
  },
  "material-too-hard": {
    tone: "warn",
    title: "Machine cannot penetrate this deposit",
    detail: "The mineral exceeds the current tool capability. Try a stronger extractor; no material has been removed.",
  },
  "deposit-exhausted": {
    tone: "warn",
    title: "Deposit exhausted",
    detail: "The source is depleted. Reconfigure or relocate extraction rather than rebuilding blindly.",
  },
  "source-exhausted": {
    tone: "warn",
    title: "Source exhausted",
    detail: "The authored source is depleted. Redirect this line to another physical source.",
  },
  "needs-compatible-input": {
    tone: "warn",
    title: "Input is incompatible",
    detail: "The material or containment at this inlet cannot be accepted by the current setup.",
  },
  "needs-input": {
    tone: "warn",
    title: "Waiting for input",
    detail: "Trace the upstream belt, pipe, pressure route or factory port to find the missing feed.",
  },
  "output-full": {
    tone: "warn",
    title: "Output blocked",
    detail: "Downstream capacity is full or disconnected. Clear or reroute the physical output.",
  },
  "fuel-class-locked": {
    tone: "warn",
    title: "Operating fuel not certified",
    detail: "The required company fuel class has not been unlocked by expedition evidence yet.",
  },
  "needs-special-fuel": {
    tone: "warn",
    title: "Special fuel unavailable",
    detail: "The required physical operating fuel is not held at its terminal module.",
  },
  "needs-fuel": {
    tone: "warn",
    title: "Company fuel depleted",
    detail: "Restore fuel through exports or eligible assistance before this machine can run.",
  },
  ready: {
    tone: "calm",
    title: "Ready",
    detail: "The machine is enabled and waiting for the next authoritative simulation step.",
  },
};

export function knowledgeOverview(snapshot: PlayerSnapshot) {
  const hinted = snapshot.knowledgeEntries.filter(
      (entry) => entry.state === "hinted",
    ).length,
    branches = snapshot.knowledgeInsights.filter(
      (entry) => entry.kind === "branch",
    ).length,
    confirmed = snapshot.knowledgeEntries.filter(
      (entry) => entry.state === "confirmed",
    ).length,
    hazards = snapshot.hazardEvidence.length;
  return {
    hinted,
    branches,
    open: hinted + branches,
    confirmed,
    hazards,
    findings: snapshot.knowledgeInsights.length,
  };
}

export function knowledgeVisible(
  filter: KnowledgeFilter,
  kind: "insight-branch" | "insight-other" | "hazard" | "hinted" | "confirmed",
) {
  if (filter === "all") return true;
  if (filter === "open")
    return kind === "insight-branch" || kind === "hinted";
  if (filter === "hazards") return kind === "hazard";
  return kind === "insight-other" || kind === "confirmed";
}

export function terminalOverview(snapshot: PlayerSnapshot): ContextOverview & {
  manifestSelected: number;
  exportableStaged: number;
  openOpportunities: number;
} {
  const manifestSelected = Object.values(snapshot.shipmentManifest).reduce(
      (sum, units) => sum + units,
      0,
    ),
    exchangeIds = new Set(snapshot.exchange.map((entry) => entry.materialId)),
    solidStaged = Object.entries(snapshot.staging).reduce(
      (sum, [id, units]) => sum + (exchangeIds.has(id) ? units : 0),
      0,
    ),
    dockStaged = snapshot.terminalModules.reduce(
      (sum, dock) =>
        sum +
        (dock.contents.materialId && exchangeIds.has(dock.contents.materialId)
          ? dock.contents.quantity
          : 0),
      0,
    ),
    exportableStaged = solidStaged + dockStaged,
    openOpportunities = snapshot.opportunities.length;

  if (manifestSelected > 0)
    return {
      tone: "good",
      eyebrow: "SHIPMENT READY",
      title: manifestSelected + " units selected",
      detail: "Dispatch the manifest when you are satisfied with this physical cargo selection.",
      manifestSelected,
      exportableStaged,
      openOpportunities,
    };
  if (exportableStaged > 0)
    return {
      tone: "good",
      eyebrow: "PHYSICAL CARGO",
      title: exportableStaged + " exportable units staged",
      detail: "Build a shipment manifest below or leave an explicit auto-export policy enabled.",
      manifestSelected,
      exportableStaged,
      openOpportunities,
    };
  if (snapshot.debt > 0)
    return {
      tone: "warn",
      eyebrow: "OBLIGATION OPEN",
      title: snapshot.debt + " fuel owed",
      detail: "Future export compensation repays the obligation before net fuel returns to the site.",
      manifestSelected,
      exportableStaged,
      openOpportunities,
    };
  if (openOpportunities > 0)
    return {
      tone: "calm",
      eyebrow: "COMPANY WORK",
      title: openOpportunities + " active opportunit" + (openOpportunities === 1 ? "y" : "ies"),
      detail: "These offers react to what the expedition has already demonstrated; they do not reveal hidden recipes.",
      manifestSelected,
      exportableStaged,
      openOpportunities,
    };
  return {
    tone: "calm",
    eyebrow: "TERMINAL IDLE",
    title: "No cargo staged",
    detail: "Keep industrializing locally. The terminal becomes useful when physical cargo or company work reaches it.",
    manifestSelected,
    exportableStaged,
    openOpportunities,
  };
}

/**
 * A player already has a *real* trapped incident when this advice exists.
 * Select receiver types only from public, known material containment and
 * validated storage definitions; never inspect hidden reaction recipes.
 */
export function incidentRecoveryAdvice(snapshot: PlayerSnapshot, machine: MachineView) {
  const recovery = machine.incidentRecovery;
  if (!machine.incident || !recovery || recovery.units <= 0) return null;

  const trappedId = Object.entries(machine.incidentInventory)
    .find(([, units]) => units > 0)?.[0];
  const knownMaterial = snapshot.materials.find((m) => m.id === trappedId);
  const possibleStorage = recovery.handlingState === "solid" && knownMaterial
    ? snapshot.storageDefinitions.find((definition) =>
        definition.capacity >= recovery.units &&
        knownMaterial.requiredContainment.every((capability) =>
          definition.containmentCapabilities.includes(capability)))
    : undefined;
  const storageReason = recovery.reason === "no-local-storage" ||
    recovery.reason === "missing-containment" ||
    recovery.reason === "insufficient-capacity";

  return {
    outputRecoveryAllowed: recovery.outputRecoveryAllowed,
    receiverReady: recovery.ready,
    storageDefinition: storageReason ? (possibleStorage ?? null) : null,
    messageKey: !recovery.outputRecoveryAllowed
      ? "ui.machine.incident.output-quarantined"
      : "ui.machine.incident.output-possible",
  };
}

export function selectionOverview(
  snapshot: PlayerSnapshot,
  selectedId: string | null,
): ContextOverview {
  if (!selectedId)
    return {
      tone: "calm",
      eyebrow: "WORLD INSPECTOR",
      title: "Select something in the world",
      detail: "The inspector explains authoritative state, blockage and the most useful next action.",
    };

  const machine = snapshot.machines.find((entry) => entry.id === selectedId);
  if (machine) {
    const advice = incidentRecoveryAdvice(snapshot, machine);
    if (advice && !advice.receiverReady && !advice.outputRecoveryAllowed)
      return {
        tone: "bad" as const,
        eyebrow: "CONTAINED MACHINE INCIDENT",
        title: "Isolated material awaits recovery",
        detail: advice.storageDefinition
          ? "The trapped charge cannot return to normal output. Build a compatible storage nearby, then transfer it from this machine."
          : "The charge stays physically sealed. Inspect the required receiver and containment rating below; ordinary output reclaim is blocked.",
      };
    const copy = statusCopy[machine.status];
    if (machine.extractionCompatibility === "strained" &&
        (machine.status === "processing" || machine.status === "ready")) {
      return {
        tone: "warn" as const,
        eyebrow: "MACHINE · HIGH MECHANICAL LOAD",
        title: "Extraction under strain",
        detail: "This material takes longer and consumes more operating fuel per batch. The extractor is still physically capable; no wear system is simulated yet.",
      };
    }
    return {
      ...copy,
      eyebrow: "MACHINE · " + machine.status.replaceAll("-", " ").toUpperCase(),
    };
  }

  const factory = snapshot.factories.find((entry) => entry.id === selectedId);
  if (factory) {
    const incidents = factory.contract.statusCounts.incident,
      blocked =
        factory.contract.statusCounts["output-full"] +
        factory.contract.statusCounts["needs-input"] +
        factory.contract.statusCounts["needs-compatible-input"];
    if (incidents > 0)
      return {
        tone: "bad",
        eyebrow: "FACTORY INCIDENT",
        title: incidents + " machine" + (incidents === 1 ? "" : "s") + " need recovery",
        detail: "Open the factory and inspect the affected equipment. Internal state and material remain preserved.",
      };
    if (blocked > 0)
      return {
        tone: "warn",
        eyebrow: "FACTORY BLOCKED",
        title: blocked + " machine" + (blocked === 1 ? "" : "s") + " waiting",
        detail: "Inspect the external contract and internal buffers before tearing down solved capital.",
      };
    return {
      tone: "good",
      eyebrow: "FACTORY CAPITAL",
      title: factory.contract.machineCount + " machines in persistent layout",
      detail: "Close or reopen this factory without deleting its internal machines, buffers or connections.",
    };
  }

  const pump = snapshot.pumps.find((entry) => entry.id === selectedId);
  if (pump?.incident)
    return {
      tone: "bad",
      eyebrow: "CONTAINED FAILURE",
      title: "Pump recovery required",
      detail: "Drain or reclaim the trapped material, then repair the equipment before restarting it.",
    };

  const diagnostic = snapshot.transportDiagnostics[selectedId];
  if (diagnostic && diagnostic.reason !== "ready")
    return {
      tone: "warn",
      eyebrow: "ROUTE DIAGNOSTIC",
      title: diagnostic.reason.replaceAll("-", " "),
      detail: diagnostic.missingContainment?.length
        ? "This route is missing required containment. The detailed requirement is shown below."
        : "The simulation has an explicit reason for this blockage. Inspect the route details below.",
    };

  return {
    tone: "calm",
    eyebrow: "WORLD INSPECTOR",
    title: "Authoritative world state",
    detail: "Details below come from the simulation. Reconfigure the selected object instead of relying on hidden recipe truth.",
  };
}
