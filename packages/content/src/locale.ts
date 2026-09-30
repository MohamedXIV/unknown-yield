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
export const localeKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
export const localeCatalogSchema = z.record(
  localeKeySchema,
  z.string().min(1),
);
export type LocaleCatalog = z.infer<typeof localeCatalogSchema>;

export function contentKeys(c: Content): string[] {
  return [
    ...c.materials.map((m) => m.nameKey),
    ...c.operations.map((o) => o.nameKey),
    ...c.machines.map((m) => m.nameKey),
    ...c.machines.flatMap((m) => (m.unlock ? [m.unlock.hintKey] : [])),
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
  "ui.terminal.opportunity.order-meta":
    "CORPORATE ORDER · +{{reward}} fuel",
  "ui.terminal.opportunity.directive-meta":
    "SPECIAL DIRECTIVE · +{{reward}} fuel",
  "ui.terminal.opportunity.order-progress":
    "{{material}} · {{progress}}/{{quantity}} shipped",
  "ui.terminal.opportunity.directive-progress":
    "{{material}} → {{operation}}",
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
    "Repay the current obligation through exports before requesting more assistance.",
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
