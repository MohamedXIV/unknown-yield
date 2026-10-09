import { z } from "zod";
import type { Content } from "./schema";

/**
 * Localization resources (Issue #14, decision D-022).
 *
 * Content identity is always a stable machine-readable ID. Player-facing
 * wording lives in locale catalogs keyed by namespaced dotted keys:
 * `material.<id>.name`, `operation.<id>.name`, `machine.<id>.name`,
 * `storage.<id>.name`, `reaction.<id>.observation`, `knowledge.insight.<id>.text`, `machine.<id>.unlock-hint`, and `hazard.<id>.*`. Renaming an English value never changes an ID
 * and never requires a save migration. This package validates catalog shape
 * and key coverage; resolution (i18next) lives outside `sim-core`.
 */
export const localeKeySchema = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
export const localeCatalogSchema = z.record(localeKeySchema, z.string().min(1));
export type LocaleCatalog = z.infer<typeof localeCatalogSchema>;

export function contentKeys(c: Content): string[] {
  return [
    ...(c.liquidLogistics?.pump.containmentFailure
      ? [
          c.liquidLogistics.pump.containmentFailure.nameKey,
          c.liquidLogistics.pump.containmentFailure.descriptionKey,
        ]
      : []),
    ...c.site.terminalModules.map((d) => d.nameKey),
    ...c.site.atmosphericSources.map((d) => d.nameKey),
    ...c.containmentCapabilities.map((d) => d.nameKey),
    ...c.hazardClasses.flatMap((d) => [d.nameKey, d.evidenceKey]),
    ...(c.liquidLogistics?.containmentProfiles.map((p) => p.nameKey) ?? []),
    ...c.materials.map((m) => m.nameKey),
    ...c.fuelClasses.map((fuelClass) => fuelClass.nameKey),
    ...c.operations.map((o) => o.nameKey),
    ...c.machines.map((m) => m.nameKey),
    ...c.machines.flatMap((m) => (m.unlock ? [m.unlock.hintKey] : [])),
    ...c.junctions.map((j) => j.nameKey),
    ...c.storages.map((s) => s.nameKey),
    ...c.reactions.map((r) => r.observationKey),
    ...c.knowledgeInsights.map((insight) => insight.textKey),
    ...c.reactions.flatMap((r) =>
      r.hazard
        ? [r.hazard.nameKey, r.hazard.observationKey, r.hazard.saferHintKey]
        : [],
    ),
    ...c.economy.imports.flatMap((supply) => [supply.nameKey, supply.briefKey]),
    ...c.economy.demandShocks.flatMap((shock) => [shock.nameKey, shock.briefKey]),
    ...c.economy.orders.flatMap((order) => [order.nameKey, order.briefKey]),
    ...c.economy.directives.flatMap((directive) => [
      directive.nameKey,
      directive.briefKey,
    ]),
    ...c.economy.propertyDirectives.flatMap((directive) => [
      directive.nameKey,
      directive.briefKey,
      directive.propertyKey,
    ]),
    ...c.economy.assistancePackages.flatMap((assistance) => [
      assistance.nameKey,
      assistance.briefKey,
    ]),
    ...c.economy.terminalCapabilities.map((capability) => capability.nameKey),
    ...c.economy.milestones.flatMap((milestone) => [
      milestone.nameKey,
      milestone.hintKey,
    ]),
  ];
}

export function validateLocaleCoverage(
  c: Content,
  catalog: Record<string, string>,
): void {
  const parsed = localeCatalogSchema.parse(catalog);
  for (const key of contentKeys(c)) {
    if (!Object.hasOwn(parsed, key))
      throw new Error("Missing localization key: " + key);
  }
}

export const enCatalog: LocaleCatalog = {
  "ui.knowledge.insights.heading": "Material findings",
  "ui.knowledge.insight.property": "Observed property",
  "ui.knowledge.insight.branch": "Open branch",
  "ui.knowledge.insight.opportunity": "Company opportunity",
  "ui.machine.fuel.company": "Company fuel",
  "ui.machine.fuel.terminal-held": "{{count}} units held at {{module}}",
  "ui.machine.fuel.locked": "Fuel class not yet certified",
  "fuel.class.advanced-propellant.name": "Advanced propellant",
  "fuel.class.research-coolant.name": "Research-grade coolant",
  "ui.diverter.heading": "District feed diverter",
  "ui.diverter.none": "No alternate exit is configured.",
  "ui.diverter.status":
    "Alternate exit: {{direction}} · selected route: {{route}}.",
  "ui.diverter.route-name.primary": "primary",
  "ui.diverter.route-name.alternate": "alternate",
  "ui.diverter.cycle": "Cycle alternate exit",
  "ui.diverter.select-primary": "Select primary feed",
  "ui.diverter.select-alternate": "Select alternate feed",
  "ui.diverter.route-primary": "Primary feed selected",
  "ui.diverter.route-alternate": "Alternate feed selected",
  "ui.diverter.no-alternate": "Configure an alternate exit first",
  "ui.factory.relocation.hold": "Relocation hold",
  "ui.factory.relocation.downtime": "{{ticks}} ticks of downtime remaining",
  "ui.factory.relocation.restored": "External requirements restored",
  "ui.factory.relocation.reconnect": "Reconnect external logistics",
  "ui.factory.relocation.requirements":
    "Required prior external connections: {{count}}. Restore every required route before restarting internal equipment.",
  "ui.factory.relocation.move-hint":
    "Move the suspended shell and its internal equipment together by one cell. Each step costs {{fuel}} fuel and starts {{ticks}} ticks of downtime. External logistics stay at the source and previously connected media must be rebuilt before resume.",
  "ui.terminal.module.heading": "Physical handling docks",
  "ui.terminal.module.inlet": "Inlet ({{x}}, {{y}}), approach from {{side}}",
  "ui.terminal.module.meta":
    "{{quantity}} / {{capacity}} units · {{cost}} construction plates",
  "ui.terminal.module.empty": "Empty",
  "ui.terminal.module.install": "Install {{module}}",
  "ui.terminal.module.remove": "Remove {{module}}",
  "ui.terminal.module.result.unknown": "Unknown terminal module",
  "ui.terminal.module.result.locked":
    "Confirm the handling trial before installation",
  "ui.terminal.module.result.installed": "Module installed",
  "ui.terminal.module.result.success": "Terminal module installed",
  "ui.terminal.module.result.needs-stock": "More construction plates required",
  "ui.terminal.module.result.not-installed": "Module not installed",
  "ui.terminal.module.result.loaded": "Export the dock cargo before removal",
  "ui.terminal.module.result.removed": "Empty terminal module reclaimed",
  "ui.containment.reason.terminal-module-missing":
    "Install the compatible terminal dock",
  "ui.containment.reason.terminal-module-locked":
    "Terminal handling trial not yet confirmed",
  "ui.terminal.module.staged": "held at dock",
  "ui.terminal.shipment.heading": "Cargo manifest",
  "ui.terminal.shipment.hint":
    "Choose exact quantities from cargo already staged at the terminal. A manifest is intent only: the material stays in its physical staging or dock until dispatch.",
  "ui.terminal.shipment.capacity": "{{selected}} / {{capacity}} cargo selected",
  "ui.terminal.shipment.quantity": "{{material}} shipment quantity",
  "ui.terminal.shipment.dispatch": "Dispatch selected cargo",
  "ui.terminal.shipment.result.unknown": "Unknown material",
  "ui.terminal.shipment.result.unaccepted":
    "The company does not accept this material",
  "ui.terminal.shipment.result.locked":
    "Terminal handling is not certified for this cargo",
  "ui.terminal.shipment.result.unavailable":
    "Selected cargo is not physically available at the terminal",
  "ui.terminal.shipment.result.capacity":
    "The manifest exceeds terminal cargo capacity",
  "ui.terminal.shipment.result.invalid": "Invalid shipment manifest",
  "ui.terminal.shipment.result.empty": "Select cargo before dispatch",
  "ui.terminal.shipment.result.selected": "Shipment manifest updated",
  "ui.terminal.shipment.result.dispatched": "Shipment dispatched",
  "ui.terminal.import.heading": "Off-world supplies",
  "ui.terminal.import.hint":
    "Imports arrive into a bounded terminal holding area. Route them out through the dry import outlet; they never enter global stock.",
  "ui.terminal.import.capacity": "{{used}} / {{capacity}} import cargo held",
  "ui.terminal.import.meta": "{{quantity}} units · {{cost}} fuel",
  "ui.terminal.import.held": "{{material}}: {{quantity}} held",
  "ui.terminal.import.allocation":
    "{{count}} company allocation available",
  "ui.terminal.import.request": "Request {{supply}}",
  "ui.terminal.opportunity.research-meta":
    "COMPANY R&D · new off-world capability",
  "ui.terminal.import.outlet": "Dry import outlet: ({{x}}, {{y}}) toward {{side}}",
  "ui.terminal.import.result.unknown": "That import supply is unavailable",
  "ui.terminal.import.result.fuel": "Not enough company fuel for this import",
  "ui.terminal.import.result.capacity": "Clear terminal import cargo first",
  "ui.terminal.import.result.locked": "Required terminal handling is not yet certified",
  "ui.terminal.import.result.module-missing": "Install the required terminal handling module",
  "ui.terminal.import.result.incompatible": "The terminal module is occupied by incompatible cargo",
  "ui.terminal.import.result.received": "Off-world cargo received at the terminal",
  "import.orbital-binder-crate.name": "Orbital binder crate",
  "import.orbital-binder-crate.brief":
    "A specialized off-world sintering feedstock unavailable from local extraction. It must leave the terminal through ordinary dry logistics.",
  "import.orbital-resonance-seed-crate.name": "Resonance seed crate",
  "import.orbital-resonance-seed-crate.brief":
    "A company-engineered resonance seed derived from expedition matrix data. It becomes available only after the orbital application study is completed and enters the site through ordinary dry import logistics.",
  "import.orbital-propellant-cylinder.name": "Orbital propellant cylinder",
  "import.orbital-propellant-cylinder.brief":
    "A sealed gas supply delivered through an authorized gas dock. Retain it at the dock to operate advanced equipment, or release it into ordinary pressure logistics.",
  "import.orbital-coolant-canister.name": "Secure cryogenic coolant",
  "import.orbital-coolant-canister.brief":
    "A cryogenic, hazardous and secure-chain liquid delivered through protected terminal handling. Research equipment consumes it directly from the secured dock reserve.",
  "ui.direction.0": "east",
  "ui.direction.1": "south",
  "ui.direction.2": "west",
  "ui.direction.3": "north",
  "sensing.capability.survey-scanner.name": "Survey scanner",
  "sensing.capability.core-probe.name": "Core probe",
  "sensing.capability.resonance-probe.name": "Resonance probe",
  "sensing.capability.phase-probe.name": "Phase probe",
  "terminal.module.liquid-dock.name": "Lined liquid dock",
  "terminal.module.gas-dock.name": "Sealed gas dock",
  "terminal.module.cryo-dock.name": "Secure cryogenic dock",
  "terminal.capability.liquid-outbound.name": "Liquid outbound handling",
  "terminal.capability.gas-outbound.name": "Gas outbound handling",
  "terminal.capability.specialized-inbound.name": "Specialized inbound handling",
  "milestone.liquid-study-certified.name": "Liquid handling authorization",
  "milestone.liquid-study-certified.hint":
    "Confirm a liquid-processing trial to authorize liquid handling.",
  "milestone.gas-study-certified.name": "Gas handling authorization",
  "milestone.gas-study-certified.hint":
    "Confirm a gas-producing trial to authorize sealed gas handling.",
  "milestone.specialized-handling-certified.name": "Specialized terminal authorization",
  "milestone.specialized-handling-certified.hint":
    "Complete the sealed-process handling proof to authorize protected inbound cargo.",
  "milestone.resonance-survey-certified.name": "Resonance survey capability",
  "milestone.resonance-survey-certified.hint":
    "Manufacture conductive granules through sealed gas collection to calibrate the resonance probe.",
  "milestone.phase-lattice-certified.name": "Phase-lattice field calibration",
  "milestone.phase-lattice-certified.hint":
    "Confirm the company resonance seed under local sintering to calibrate a deeper phase probe.",
  "containment.corrosion-resistant.name": "Corrosion-resistant containment",
  "containment.cryogenic-rated.name": "Cryogenic-rated containment",
  "containment.hazard-isolated.name": "Hazard-isolated containment",
  "containment.secure-chain.name": "Secure-chain custody",
  "containment.profile.standard.name": "Standard",
  "containment.profile.lined.name": "Lined",
  "containment.profile.sealed-cold.name": "Sealed cold-chain",
  "ui.gas.command.unavailable": "Gas infrastructure is not authored",
  "ui.gas.command.invalid-path": "Invalid directed pressure line path",
  "ui.gas.command.disconnected": "Pressure line endpoints must connect",
  "ui.gas.command.place-pipes": "Place pressure lines",
  "ui.gas.command.lines-placed": "Pressure lines placed",
  "ui.gas.command.place-structure": "Place gas structure",
  "ui.gas.command.placed": "Gas structure placed",
  "ui.gas.command.unknown-pump": "Unknown compressor",
  "ui.gas.command.compressor-updated": "Compressor updated",
  "ui.gas.command.unknown-pipe": "Unknown pressure line",
  "ui.gas.command.drain-pipe": "Drain the pressure line before rerouting",
  "ui.gas.command.different-ends": "Pressure line inlet and outlet must differ",
  "ui.gas.command.line-updated": "Pressure line updated",
  "ui.gas.command.drain-first": "Drain gas contents before dismantling",
  "ui.gas.command.reclaimed": "Gas structure reclaimed",
  "ui.gas.command.remove-port": "Remove gas infrastructure on this port first",
  "ui.gas.short.disabled": "Feed off",
  "ui.gas.short.needs-fuel": "No fuel",
  "ui.gas.short.needs-input": "No gas",
  "ui.gas.short.incompatible": "Mismatch",
  "ui.gas.short.output-full": "Blocked",
  "ui.gas.short.ready": "Ready",
  "ui.gas.empty": "Empty",
  "ui.gas.enable": "Enable source feed",
  "ui.gas.disable": "Stop source feed",
  "ui.gas.inlet": "Inlet",
  "ui.gas.outlet": "Outlet",
  "ui.gas.rotate": "Rotate empty pressure line",
  "ui.gas.drain-first":
    "Drain gas through a compatible route before editing or reclaiming.",
  "ui.gas.reclaim": "Reclaim empty structure",
  "ui.gas.status.disabled":
    "Source feed disabled; admitted gas can still drain.",
  "ui.gas.status.needs-fuel": "Needs fuel",
  "ui.gas.status.needs-input": "Needs a compatible gas source",
  "ui.gas.status.incompatible":
    "Source or outlet is incompatible with this gas route",
  "ui.gas.status.output-full": "Outlet missing, reversed or full",
  "ui.gas.status.ready": "Ready",

  "ui.gas.pressure-line.name": "Pressure line",
  "ui.gas.pressure-vessel.name": "Pressure vessel",
  "ui.gas.compressor.name": "Compressor",
  "ui.gas.pressure-line.description":
    "Drag a sealed directed gas route. Ordinary pipes cannot carry gas. R rotates a single cell.",
  "ui.gas.pressure-vessel.description":
    "Physical sealed gas storage. One material at a time; a compressor withdraws through its output socket.",
  "ui.gas.compressor.description":
    "Admits gas from a compatible machine or vessel into a pressure line. Fuel is charged only on successful admission.",
  "ui.gas.vaporizer.description":
    "Liquid input and sealed output. Outcomes require observation.",
  "ui.gas.gas-collector.description":
    "Sealed input and solid output. Outcomes require observation.",
  "ui.gas.processor-input-help":
    "Feed the input socket with a matching pressure line. Ordinary belts and liquid pipes cannot feed gas.",
  "ui.gas.processor-output-help":
    "Liquid pipes feed this input. Place a compressor on its sealed output and a pressure line after it.",
  "ui.gas.factory-buffer": "Gas in physical pressure infrastructure",

  "material.gas-0.name": "Process vapor",
  "operation.vaporize.name": "Vaporize",
  "operation.collect-gas.name": "Collect",
  "machine.vaporizer.name": "Vaporizer",
  "machine.gas-collector.name": "Gas collector",
  "reaction.vaporize-liquid-0.observation":
    "The liquid yielded a vapor that requires sealed pressure transport.",
  "reaction.collect-gas-0.observation":
    "The contained vapor yielded conductive granules.",

  "ui.liquid.processor-input-help":
    "Cyan is the liquid pipe input socket; gold is the solid output belt socket. Observe outputs to discover them. Drain buffers through compatible routes before dismantling.",
  "ui.liquid.processor-output-help":
    "Cyan is the solid input belt socket; gold is the liquid output socket. Place a source pump there, followed by directed pipe. Observe outputs to discover them. Drain buffers through compatible routes before dismantling.",

  "ui.liquid.short.disabled": "Feed off",
  "ui.liquid.short.needs-fuel": "No fuel",
  "ui.liquid.short.needs-input": "No liquid",
  "ui.liquid.short.incompatible": "Mismatch",
  "ui.liquid.short.output-full": "Blocked",
  "ui.liquid.short.ready": "Ready",

  "ui.liquid.command.unavailable": "Liquid infrastructure is not authored",
  "ui.liquid.command.invalid-path": "Invalid directed pipe path",
  "ui.liquid.command.disconnected": "Pipe endpoints must connect",
  "ui.liquid.command.place-pipes": "Place pipes",
  "ui.liquid.command.pipes-placed": "Pipes placed",
  "ui.liquid.command.place-structure": "Place liquid structure",
  "ui.liquid.command.placed": "Liquid structure placed",
  "ui.liquid.command.unknown-pump": "Unknown pump",
  "ui.liquid.command.pump-updated": "Pump updated",
  "ui.liquid.command.unknown-pipe": "Unknown pipe",
  "ui.liquid.command.drain-pipe": "Drain the pipe before rerouting",
  "ui.liquid.command.different-ends": "Pipe inlet and outlet must differ",
  "ui.liquid.command.pipe-updated": "Pipe updated",
  "ui.liquid.command.drain-first": "Drain liquid contents before dismantling",
  "ui.liquid.command.reclaimed": "Liquid structure reclaimed",
  "ui.liquid.command.remove-port":
    "Remove liquid infrastructure on this port first",
  "ui.liquid.factory-buffer": "Physical liquid buffers",
  "ui.liquid.pipe.name": "Directed pipe",
  "ui.liquid.tank.name": "Liquid tank",
  "ui.liquid.pump.name": "Source pump",
  "ui.liquid.pipe.description":
    "Drag a directed path. R rotates a single pipe. Loaded pipes must drain before rerouting.",
  "ui.liquid.tank.description":
    "Stores one liquid. Cyan is input; gold is output. Connect a pump to its output socket.",
  "ui.liquid.pump.description":
    "Place at a tank or liquid machine output socket, facing the next pipe. Fuel is spent only on successful admission.",
  "ui.liquid.liquefier.description":
    "Place inside a factory. Feed solids by belt; observe the result. A source pump feeds liquid output into pipes.",
  "ui.liquid.precipitator.description":
    "Place inside a factory. Feed liquid into the cyan socket by directed pipe; solids leave by belt.",
  "ui.liquid.empty": "Empty",
  "ui.liquid.enable": "Enable source feed",
  "ui.liquid.disable": "Stop source feed",
  "ui.liquid.inlet": "Inlet",
  "ui.liquid.outlet": "Outlet",
  "ui.liquid.rotate": "Rotate empty pipe",
  "ui.liquid.drain-first":
    "Drain the liquid through the route before editing or reclaiming.",
  "ui.liquid.reclaim": "Reclaim empty structure",
  "ui.liquid.status.disabled":
    "Source feed disabled; admitted liquid can drain",
  "ui.liquid.status.needs-fuel": "Needs fuel",
  "ui.liquid.status.needs-input": "Needs a compatible liquid source",
  "ui.liquid.status.incompatible":
    "Source or destination containment is incompatible",
  "ui.liquid.status.output-full": "Outlet missing, reversed or full",
  "ui.liquid.status.ready": "Ready",
  "ui.liquid.status.incident": "Contained pump failure — feed stopped",
  "ui.liquid.short.incident": "FAILED",
  "ui.containment.reason.incident": "Contained pump failure",
  "ui.recovery.unidentified": "Unidentified trapped material",
  "ui.recovery.start-drain": "Start recovery drain",
  "ui.recovery.stop-drain": "Stop recovery drain",
  "ui.recovery.repair": "Repair empty protected pump",
  "ui.recovery.repair-first": "Repair the pump before restarting",
  "ui.recovery.no-incident": "No stopped pump incident",
  "ui.recovery.drain-updated": "Recovery drain updated",
  "ui.recovery.not-repairable":
    "Drain the charge and protect the stopped pump before repair",
  "ui.recovery.repaired": "Pump repaired — feed remains stopped",

  "handling.failure.pump-corrosion.name": "Contained pump failure",
  "handling.failure.pump-corrosion.description":
    "An unprotected feed attempt trapped a charge and stopped the pump. Drain through a protected route, upgrade the empty pump, then repair and restart.",
  "material.liquid-0.name": "Vein liquor",
  "operation.liquefy.name": "Liquefy",
  "operation.precipitate.name": "Precipitate",
  "machine.liquefier.name": "Liquefier",
  "machine.precipitator.name": "Precipitator",
  "reaction.liquefy-raw.observation":
    "The veined stone leaves a flowing liquid.",
  "reaction.precipitate-liquid-0.observation":
    "The liquid leaves solid granules.",
  "junction.splitter.name": "T splitter",
  "junction.merger.name": "T merger",
  "junction.crossing.name": "Controlled crossing",
  "ui.crossing.rule":
    "One shared slot. Each stream keeps its opposite outlet; a pending signal waits for clearance.",
  "ui.crossing.horizontal": "Horizontal",
  "ui.crossing.vertical": "Vertical",
  "ui.crossing.signal": "Admission: {{axis}} · {{steps}} transport steps left",
  "ui.crossing.pending": "Waiting to open {{axis}} after the center clears",
  "ui.crossing.held": "Held route: {{axis}} → {{direction}}",
  "ui.crossing.rotate": "Rotate crossing",
  "ui.crossing.remove": "Remove crossing upgrade",
  "ui.belt.preview.counts": "{{newCount}} new · {{reusedCount}} reused",
  "ui.belt.preview.shortfall": "Short by {{count}} plates",
  "ui.belt.preview.crossing-wait":
    "Crossing admission is temporarily closed",
  "ui.belt.preview.splitter-choice":
    "Splitter may send cargo through its other outlet",
  "ui.junction.loaded": "Empty the junction through belts first",
  "ui.junction.unknown": "Unknown junction definition",
  "ui.junction.wall": "Junctions cannot occupy factory walls or ports",
  "ui.junction.cost": "Not enough structural plates",
  "ui.junction.manual": "Use the T configuration controls",
  "ui.junction.updated": "Junction configuration updated",
  "ui.junction.rotate": "Rotate T",
  "ui.junction.mirror": "Mirror side arm",
  "ui.junction.remove": "Remove T upgrade",
  "ui.junction.upgrade": "Upgrade empty belt",
  "ui.junction.preferred": "Next preferred arm",
  "ui.junction.rule":
    "One physical slot; turns advance after successful transfers. A blocked arm is skipped when the other is open.",
  "ui.junction.buffer": "Central buffer",
  "ui.junction.cost-label": "Upgrade: {{cost}} plates",
  "ui.junction.reclaim": "Reclaim empty junction",
  "ui.direction.east": "east",
  "ui.direction.south": "south",
  "ui.direction.west": "west",
  "ui.direction.north": "north",
  "material.ferrite.name": "Ferrite rubble",
  "material.plates.name": "Structural plates",
  "material.ferrite-ceramic.name": "Magnetic ceramic",
  "material.raw.name": "Veined ore",
  "material.granules.name": "Conductive granules",
  "material.residue.name": "Vitrified residue",
  "material.catalyst.name": "Catalytic stone",
  "material.catalyst-powder.name": "Catalyst powder",
  "material.orbital-binder.name": "Orbital binder",
  "material.orbital-resonance-seed.name": "Orbital resonance seed",
  "material.phase-lattice.name": "Phase lattice",
  "material.phase-suspension.name": "Phase suspension",
  "material.phase-ceramic.name": "Stabilized phase ceramic",
  "material.orbital-propellant.name": "Orbital propellant",
  "material.orbital-coolant.name": "Orbital coolant",
  "material.matrix.name": "Resonant matrix",
  "knowledge.insight.ferrite-capital.text":
    "Ferrite already anchors site construction through structural plate production. Diverting the same feedstock into other applications competes directly with physical expansion.",
  "knowledge.insight.ferrite-thermal-branch.text":
    "Ferrite still has unresolved thermal behavior. Treat heating trials as a separate branch rather than assuming the construction route is its only useful application.",
  "knowledge.insight.ferrite-ceramic-market.text":
    "Magnetic ceramic carries strong small-batch company value, but demand saturates quickly. It is an opportunistic export, not a stable backbone.",
  "knowledge.insight.veined-multi-state.text":
    "Veined ore supports more than one process path. Some transformations may leave ordinary dry handling and require different logistics.",
  "knowledge.insight.corrosive-liquid.text":
    "The observed liquid phase attacks standard wetted surfaces. Corrosion-resistant containment is required anywhere this material is moved or stored.",
  "knowledge.insight.catalyst-choice.text":
    "Catalytic stone has competing industrial uses. A commodity branch may provide steady value, while preserving feedstock leaves room for higher-grade resonance work.",
  "knowledge.insight.catalyst-powder-market.text":
    "Catalyst powder has broad, slow-saturating demand. Its unit value is modest, but it is a steadier outlet than short-lived specialty markets.",
  "knowledge.insight.matrix-local-value.text":
    "A local resonant-matrix route is now confirmed. Matrix supports higher-value company demand and should be weighed against consuming scarce catalytic stone elsewhere.",
  "operation.crush.name": "Crush",
  "operation.heat.name": "Heat",
  "operation.sinter.name": "Sinter",
  "operation.phase-quench.name": "Phase quench",
  "operation.phase-stabilize.name": "Phase stabilize",
  "machine.extractor.name": "Extractor",
  "machine.deep-extractor.name": "Deep extractor",
  "machine.deep-extractor.unlock-hint":
    "a confirmed Heat result from a Sealed furnace",
  "machine.atmospheric-intake.name": "Atmospheric intake",
  "machine.atmospheric-intake.unlock-hint":
    "a confirmed gas-producing Vaporize result",
  "source.atmospheric-plume-a.name": "Atmospheric trace plume",
  "ui.gas.atmospheric-intake.description":
    "Place inside a discovered atmospheric plume. Captured gas leaves through the sealed output and requires a compressor and pressure line.",
  "machine.sinterer.name": "Sinterer",
  "ui.machine.sinterer.description":
    "Place inside a factory. Feed discovered solid inputs by belt; output leaves by belt.",
  "machine.phase-quencher.name": "Phase quencher",
  "machine.phase-quencher.unlock-hint":
    "a confirmed local Phase lattice result",
  "machine.phase-stabilizer.name": "Phase stabilizer",
  "machine.phase-stabilizer.unlock-hint":
    "a confirmed Phase quench result",
  "machine.crusher.name": "Crusher",
  "machine.furnace.name": "Furnace",
  "machine.sealed-furnace.name": "Sealed furnace",
  "machine.oversealed-furnace.name": "Oversealed furnace",
  "machine.oversealed-furnace.unlock-hint":
    "a confirmed Heat result from a Sealed furnace",
  "machine.relief-furnace.name": "Relief furnace",
  "machine.relief-furnace.unlock-hint":
    "observed Vitrified slag jam evidence from excessive confinement",
  "storage.depot.name": "Depot",
  "reaction.press-ferrite.observation":
    "Ferrite compacts into structural plates for local construction.",
  "reaction.heat-ferrite.observation":
    "Ambient heating vitrifies ferrite into a magnetic ceramic. The company values small batches, but demand saturates quickly.",
  "reaction.crush-raw.observation":
    "Fracturing the ore releases conductive grains. The company accepts this material for fuel.",
  "reaction.heat-raw.observation":
    "The sample vitrifies under heat. It has no export value; mechanical processing remains worth investigating.",
  "reaction.heat-raw-sealed.observation":
    "Heating the ore in a sealed furnace releases conductive grains.",
  "reaction.sinter-orbital-binder.observation":
    "The off-world binder sinters into a resonant matrix. The feedstock is consumed physically and must be resupplied through the terminal.",
  "reaction.sinter-catalyst.observation":
    "The catalytic stone binds into a resonant matrix with a stable export signature.",
  "reaction.sinter-resonance-seed.observation":
    "The company resonance seed reorganizes under local sintering into a stable phase lattice.",
  "reaction.phase-quench-lattice.observation":
    "Controlled cryogenic quenching opens the lattice into a mobile phase suspension. The suspension remains stable only inside sealed cold-chain containment.",
  "reaction.phase-stabilize-suspension.observation":
    "Protected stabilization collapses the suspension into a durable phase ceramic suitable for off-world qualification.",
  "reaction.crush-catalyst.observation":
    "Mechanical milling yields a stable catalyst powder. It is less valuable than resonant matrix, but company demand is broad and slow to saturate.",
  "reaction.heat-raw-oversealed.observation":
    "The oversealed chamber vitrifies the sample and trips a violent pressure release. The setup itself caused the failure.",
  "hazard.class.thermal-runaway.name": "Thermal runaway",
  "hazard.class.thermal-runaway.evidence":
    "Temperature rose faster than the process could shed heat, so the reaction accelerated itself.",
  "hazard.class.pressure-expansion.name": "Pressure expansion",
  "hazard.class.pressure-expansion.evidence":
    "Rapid expansion met excessive confinement; pressure had no safe path to dissipate.",
  "hazard.class.corrosion.name": "Corrosion",
  "hazard.class.corrosion.evidence":
    "Material attack concentrated at containment contact points rather than in the bulk process.",
  "hazard.class.instability.name": "Instability",
  "hazard.class.instability.evidence":
    "The charge changed phase unevenly under excessive confinement and solidified across the chamber path.",
  "hazard.class.contamination.name": "Contamination",
  "hazard.class.contamination.evidence":
    "Unwanted material crossed a process boundary and remained physically mixed with the affected line.",
  "hazard.chamber-blowout.name": "Chamber blowout",
  "hazard.chamber-blowout.observation":
    "The oversealed chamber vented violently and forced an automatic lockout. Processed material remains physically accounted for in the line; acknowledge the incident before restarting.",
  "hazard.chamber-blowout.safer-hint":
    "Reduce confinement. Use the Sealed furnace as the comparison setup before attempting the Oversealed furnace again.",
  "reaction.heat-ferrite-sealed.observation":
    "Ferrite heated under ordinary sealed confinement vitrifies without jamming the chamber.",
  "reaction.heat-ferrite-relieved.observation":
    "Controlled pressure relief lets the ferrite vitrify while keeping the chamber path open.",
  "reaction.heat-ferrite-oversealed.observation":
    "Oversealed heating destabilized the ferrite charge into vitrified residue and jammed the chamber.",
  "reaction.heat-phase-lattice-oversealed.observation":
    "Oversealed heating sheared the Phase lattice into trapped residue and locked the chamber.",
  "hazard.phase-shear-lock.name": "Phase shear lock",
  "hazard.phase-shear-lock.observation":
    "The confined lattice collapsed unevenly and vitrified across the chamber path. The trapped residue remains inside the stopped machine until recovery.",
  "hazard.phase-shear-lock.safer-hint":
    "Do not force Phase lattice through an oversealed thermal route. Use controlled cryogenic quenching and protected liquid handling instead.",
  "hazard.slag-jam.name": "Vitrified slag jam",
  "hazard.slag-jam.observation":
    "The unstable ferrite batch vitrified inside the chamber. The residue remains physically trapped in the stopped machine until a later recovery operation clears it.",
  "hazard.slag-jam.safer-hint":
    "Compare the same ferrite under the Sealed furnace. If that trial stays stable, the extra confinement caused the jam.",
  "order.granules-procurement.name": "Orbital conductor allocation",
  "order.granules-procurement.brief":
    "Supply a bounded batch of the newly characterized conductor while the orbital allocation window is open.",
  "order.matrix-procurement.name": "Resonant matrix qualification batch",
  "order.matrix-procurement.brief":
    "Supply a small matrix batch while orbital systems engineering evaluates the newly characterized resonant application.",
  "order.phase-ceramic-demonstration.name":
    "Stabilized phase material demonstration",
  "order.phase-ceramic-demonstration.brief":
    "Deliver one bounded lot of stabilized Phase ceramic to prove the expedition can turn company-learned Phase technology into controlled, exportable industry.",
  "market.shock.resonance-orbital-application.name":
    "Orbital resonance application identified",
  "market.shock.resonance-orbital-application.brief":
    "Company engineering linked the characterized matrix to an orbital resonance-control application. Demand increased, but the program is expected to normalize gradually.",
  "directive.sealed-thermal-study.name": "Sealed thermal study",
  "directive.sealed-thermal-study.brief":
    "Run a sealed Heat trial on Veined ore and report the observed result. The company does not predict the output.",
  "directive.matrix-local-route.name": "Local matrix qualification",
  "directive.matrix-local-route.brief":
    "Demonstrate an alternate locally supplied process that produces the characterized resonant matrix. The company specifies the property target, not the recipe.",
  "property.matrix-local-route.name":
    "Stable resonant matrix from a locally sourced feed",
  "directive.matrix-orbital-application.name":
    "Orbital matrix application study",
  "directive.matrix-orbital-application.brief":
    "Now that the expedition has characterized a resonant matrix, company R&D wants one controlled binder-assisted reproduction to derive a new off-world capability.",
  "property.matrix-orbital-application.name":
    "Demonstrate the matrix in the company orbital-binder process",
  "ui.terminal.market-bulletins.heading": "Company market bulletins",
  "ui.terminal.market-bulletins.hint":
    "Demand changes only from company-known applications and recovers on the slow market cadence. Bulletins are persistent history, not random price events.",
  "ui.terminal.market-bulletins.empty": "No market bulletin has been issued.",
  "ui.terminal.market-bulletin.meta":
    "{{material}} · demand {{direction}}{{delta}}%",
  "ui.terminal.opportunities.heading": "Corporate opportunities",
  "ui.terminal.opportunities.hint":
    "Ship requested materials to fulfill orders. Directives can request an experiment or a property target without revealing the solution. Rewards may be fuel or a physical import allocation.",
  "ui.terminal.opportunity.order-meta": "CORPORATE ORDER · +{{reward}} fuel",
  "ui.terminal.opportunity.directive-meta":
    "SPECIAL DIRECTIVE · +{{reward}} fuel",
  "ui.terminal.opportunity.property-meta":
    "SPECIAL DIRECTIVE · import allocation: {{supply}}",
  "ui.terminal.opportunity.order-progress":
    "{{material}} · {{progress}}/{{quantity}} shipped",
  "ui.terminal.opportunity.directive-progress": "{{material}} → {{operation}}",
  "ui.terminal.opportunity.directive-progress-setup":
    "{{material}} → {{operation}} · {{setup}}",
  "ui.terminal.opportunity.property-progress":
    "{{material}} · target: {{property}}",
  "ui.terminal.opportunity.experiment-fallback": "Experiment",
  "ui.terminal.opportunities.empty": "No active corporate opportunity.",
  "assistance.legacy-emergency.name": "Emergency fuel allocation",
  "assistance.legacy-emergency.brief":
    "A compatibility emergency fuel allocation. Future export compensation repays the obligation first.",
  "assistance.emergency-fuel.name": "Emergency fuel allocation",
  "assistance.emergency-fuel.brief":
    "A bounded company fuel allocation for a depleted but recoverable operation. Future export compensation repays the obligation first.",
  "ui.terminal.assistance.heading": "Corporate assistance",
  "ui.terminal.assistance.clear": "Standing clear",
  "ui.terminal.assistance.recovery": "Recovery standing",
  "ui.terminal.assistance.progress":
    "{{progress}}/{{target}} net export fuel recovered",
  "ui.terminal.assistance.package-meta":
    "+{{grant}} fuel · {{obligation}} obligation",
  "ui.terminal.assistance.request": "Request assistance",
  "ui.terminal.assistance.unavailable-fuel":
    "Available only when operating fuel is depleted.",
  "ui.terminal.assistance.unavailable-obligation":
    "Make export repayment progress before requesting another recovery allocation.",
  "ui.terminal.assistance.result.approved":
    "Assistance approved. Future export compensation repays the obligation first.",
  "ui.terminal.assistance.result.obligation-open":
    "Make export repayment progress before requesting another recovery allocation.",
  "ui.terminal.assistance.result.fuel-not-depleted":
    "Assistance is available only when operating fuel is depleted.",
  "ui.terminal.assistance.result.unknown":
    "That assistance package is unavailable.",
  "terminal.capability.sealed-sample-outbound.name": "Sealed sample handling",
  "milestone.sealed-study-certified.name": "Outbound handling certified",
  "milestone.sealed-study-certified.hint":
    "Confirm the sealed Heat trial to certify expanded terminal handling.",
  "ui.terminal.milestones.heading": "Company milestones",
  "ui.terminal.milestone.completed": "COMPLETED",
  "ui.terminal.milestone.pending": "PENDING",
  "ui.terminal.handling.ready": "{{capability}} ready",
  "ui.containment.requires": "Requires",
  "ui.containment.cost": "{{count}} structural plates",
  "ui.containment.command.unknown-profile":
    "Unknown liquid containment profile",
  "ui.containment.command.unknown-structure": "Unknown liquid structure",
  "ui.containment.command.drain-first":
    "Drain liquid contents before changing containment",
  "ui.containment.command.disable-first":
    "Disable the pump before changing containment",
  "ui.containment.command.updated": "Liquid containment updated",
  "ui.containment.input": "Input containment",
  "ui.containment.output": "Output containment",
  "ui.containment.profile": "Containment profile",
  "ui.containment.build-profile": "Build containment profile",
  "ui.containment.capabilities": "Capabilities",
  "ui.containment.none": "No added protection",
  "ui.containment.reason.ready": "Route ready",
  "ui.containment.reason.disabled": "Feed disabled",
  "ui.containment.reason.needs-fuel": "Needs fuel",
  "ui.containment.reason.needs-input": "Needs input",
  "ui.containment.reason.handling-state": "Wrong handling state",
  "ui.containment.reason.missing-containment": "Missing containment: ",
  "ui.containment.reason.identity-mismatch": "Different material already held",
  "ui.containment.reason.capacity": "Destination full",
  "ui.containment.reason.route": "No connected destination",
  "ui.containment.reason.incompatible": "Incompatible containment",
  "ui.terminal.handling.locked": "Waiting for {{capability}}",
};
