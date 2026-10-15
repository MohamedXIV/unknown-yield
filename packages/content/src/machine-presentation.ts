import { z } from "zod";

/**
 * v1 authoring contract for machine identity, visual state overlays and
 * transition audio. Asset IDs refer to the runtime's allowlisted art registry,
 * never arbitrary URLs or executable content. The game gracefully falls back
 * if an optional art entry is not bundled.
 *
 * Important: this schema is presentation-only, not machinery state.
 */
const assetId = z.string().regex(/^[a-z][a-z0-9-]*$/);
const tint = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** Small closed sonic vocabulary, not arbitrary URLs or per-machine audio scripts. */
export const machineOperatingLoopSchema = z.enum(["diesel-drive", "rotary-drive"]);
export const machineAudioCueSchema = z.enum([
  "machine-start",
  "machine-heavy-start",
  "warning",
  "hazard",
]);
export const machinePresentationSchema = z.object({
  version: z.literal(1),
  logoAssetId: assetId.optional(),
  assets: z.object({
    base: assetId.optional(),
    working: assetId.optional(),
    damaged: assetId.optional(),
    wrecked: assetId.optional(),
    incidentOverlay: assetId.optional(),
  }).default({}),
  indicatorColors: z.object({
    idle: tint.optional(),
    working: tint.optional(),
    blocked: tint.optional(),
    incident: tint.optional(),
    disabled: tint.optional(),
  }).default({}),
  audio: z.object({
    start: machineAudioCueSchema.optional(),
    blocked: machineAudioCueSchema.optional(),
    incident: machineAudioCueSchema.optional(),
    runningLoop: machineOperatingLoopSchema.optional(),
  }).default({}),
});

export type MachinePresentationDefinition = z.infer<typeof machinePresentationSchema>;
export type MachineAudioCue = z.infer<typeof machineAudioCueSchema>;
export type MachineOperatingLoop = z.infer<typeof machineOperatingLoopSchema>;
