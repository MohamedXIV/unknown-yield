import type { MachineStatus, PlayerSnapshot } from "@site/sim-core";

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
  disabled: {
    tone: "calm",
    title: "Machine disabled",
    detail: "Its buffers remain physical. Re-enable it when this line should resume.",
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
    const copy = statusCopy[machine.status];
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

  const diagnostic = snapshot.transportDiagnostics[selectedId];
  if (diagnostic && diagnostic.reason !== "ok")
    return {
      tone: "warn",
      eyebrow: "ROUTE DIAGNOSTIC",
      title: diagnostic.reason.replaceAll("-", " "),
      detail: diagnostic.missingContainment?.length
        ? "This route is missing required containment. The detailed requirement is shown below."
        : "The simulation has an explicit reason for this blockage. Inspect the route details below.",
    };

  const pump = snapshot.pumps.find((entry) => entry.id === selectedId);
  if (pump?.incident)
    return {
      tone: "bad",
      eyebrow: "CONTAINED FAILURE",
      title: "Pump recovery required",
      detail: "Drain or reclaim the trapped material, then repair the equipment before restarting it.",
    };

  return {
    tone: "calm",
    eyebrow: "WORLD INSPECTOR",
    title: "Authoritative world state",
    detail: "Details below come from the simulation. Reconfigure the selected object instead of relying on hidden recipe truth.",
  };
}
