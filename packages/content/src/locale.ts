import { z } from "zod";
import type { Content } from "./schema";

/**
 * Localization resources (Issue #14, decision D-022).
 *
 * Content identity is always a stable machine-readable ID. Player-facing
 * wording lives in locale catalogs keyed by namespaced dotted keys:
 * `material.<id>.name`, `operation.<id>.name`, `machine.<id>.name`,
 * `storage.<id>.name`, `reaction.<id>.observation`, `machine.<id>.unlock-hint`, and `hazard.<id>.*`. Renaming an English value never changes an ID
 * and never requires a save migration. This package validates catalog shape
 * and key coverage; resolution (i18next) lives outside `sim-core`.
 */
export const localeKeySchema = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
export const localeCatalogSchema = z.record(localeKeySchema, z.string().min(1));
export type LocaleCatalog = z.infer<typeof localeCatalogSchema>;

export function contentKeys(c: Content): string[] {
  return [
    ...c.containmentCapabilities.map((d) => d.nameKey),
    ...(c.liquidLogistics?.containmentProfiles.map((p) => p.nameKey) ?? []),
    ...c.materials.map((m) => m.nameKey),
    ...c.operations.map((o) => o.nameKey),
    ...c.machines.map((m) => m.nameKey),
    ...c.machines.flatMap((m) => (m.unlock ? [m.unlock.hintKey] : [])),
    ...c.junctions.map((j) => j.nameKey),
    ...c.storages.map((s) => s.nameKey),
    ...c.reactions.map((r) => r.observationKey),
    ...c.reactions.flatMap((r) =>
      r.hazard ? [r.hazard.nameKey, r.hazard.observationKey] : [],
    ),
    ...c.economy.orders.flatMap((order) => [order.nameKey, order.briefKey]),
    ...c.economy.directives.flatMap((directive) => [
      directive.nameKey,
      directive.briefKey,
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
  "containment.corrosion-resistant.name": "Corrosion-resistant containment",
  "containment.profile.standard.name": "Standard",
  "containment.profile.lined.name": "Lined",
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
  "ui.liquid.status.incompatible": "Outlet contains a different liquid",
  "ui.liquid.status.output-full": "Outlet missing, reversed or full",
  "ui.liquid.status.ready": "Ready",

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
  "material.raw.name": "Veined ore",
  "material.granules.name": "Conductive granules",
  "material.residue.name": "Vitrified residue",
  "operation.crush.name": "Crush",
  "operation.heat.name": "Heat",
  "machine.extractor.name": "Extractor",
  "machine.crusher.name": "Crusher",
  "machine.furnace.name": "Furnace",
  "machine.sealed-furnace.name": "Sealed furnace",
  "machine.oversealed-furnace.name": "Oversealed furnace",
  "machine.oversealed-furnace.unlock-hint":
    "a confirmed Heat result from a Sealed furnace",
  "storage.depot.name": "Depot",
  "reaction.press-ferrite.observation":
    "Ferrite compacts into structural plates for local construction.",
  "reaction.crush-raw.observation":
    "Fracturing the ore releases conductive grains. The company accepts this material for fuel.",
  "reaction.heat-raw.observation":
    "The sample vitrifies under heat. It has no export value; mechanical processing remains worth investigating.",
  "reaction.heat-raw-sealed.observation":
    "Heating the ore in a sealed furnace releases conductive grains.",
  "reaction.heat-raw-oversealed.observation":
    "The oversealed chamber vitrifies the sample and trips a violent pressure release. The setup itself caused the failure.",
  "hazard.chamber-blowout.name": "Chamber blowout",
  "hazard.chamber-blowout.observation":
    "The oversealed chamber vented violently and forced an automatic lockout. Processed material remains physically accounted for in the line; acknowledge the incident before restarting.",
  "order.granules-procurement.name": "Orbital conductor allocation",
  "order.granules-procurement.brief":
    "Supply a bounded batch of the newly characterized conductor while the orbital allocation window is open.",
  "directive.sealed-thermal-study.name": "Sealed thermal study",
  "directive.sealed-thermal-study.brief":
    "Run a sealed Heat trial on Veined ore and report the observed result. The company does not predict the output.",
  "ui.terminal.opportunities.heading": "Corporate opportunities",
  "ui.terminal.opportunities.hint":
    "Ship requested materials to fulfill orders. Complete requested experiments to fulfill directives. Successful opportunities grant bonus fuel.",
  "ui.terminal.opportunity.order-meta": "CORPORATE ORDER · +{{reward}} fuel",
  "ui.terminal.opportunity.directive-meta":
    "SPECIAL DIRECTIVE · +{{reward}} fuel",
  "ui.terminal.opportunity.order-progress":
    "{{material}} · {{progress}}/{{quantity}} shipped",
  "ui.terminal.opportunity.directive-progress": "{{material}} → {{operation}}",
  "ui.terminal.opportunity.directive-progress-setup":
    "{{material}} → {{operation}} · {{setup}}",
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
  "ui.terminal.handling.locked": "Waiting for {{capability}}",
};
