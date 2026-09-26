import { z } from "zod";
import type { Content } from "./schema";

/**
 * Localization resources (Issue #14, decision D-022).
 *
 * Content identity is always a stable machine-readable ID. Player-facing
 * wording lives in locale catalogs keyed by namespaced dotted keys:
 * `material.<id>.name`, `operation.<id>.name`, `machine.<id>.name`,
 * `storage.<id>.name`, `reaction.<id>.observation`, and `hazard.<id>.*`. Renaming an English value never changes an ID
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
    ...c.storages.map((s) => s.nameKey),
    ...c.reactions.map((r) => r.observationKey),
    ...c.reactions.flatMap((r) =>
      r.hazard ? [r.hazard.nameKey, r.hazard.observationKey] : [],
    ),
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
};
