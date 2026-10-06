import type { Content } from "@site/content";
import type { Save, SensingObservation } from "./types";

type SensingCapability = Content["site"]["sensingCapabilities"][number];

export function sensingObservationKey(
  capabilityId: string,
  x: number,
  y: number,
) {
  return capabilityId + ":" + x + "," + y;
}

export function sensingCapabilityUnlocked(
  state: Save,
  capability: SensingCapability,
) {
  return (
    !capability.requiredMilestoneId ||
    Object.hasOwn(state.milestones, capability.requiredMilestoneId)
  );
}

export function sensingCapabilityVisible(
  state: Save,
  capability: SensingCapability,
) {
  return !capability.hiddenUntilUnlocked || sensingCapabilityUnlocked(state, capability);
}

export function createSensingObservation(
  content: Content,
  capability: SensingCapability,
  x: number,
  y: number,
  observedAtTick: number,
): SensingObservation {
  const ranked = content.site.surveySignals
    .map((signal) => ({
      signal,
      distance: Math.abs(signal.x - x) + Math.abs(signal.y - y),
    }))
    .filter(({ distance }) => distance <= capability.range)
    .map(({ signal, distance }) => ({
      signal,
      score: signal.strength - distance,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) => b.score - a.score || a.signal.id.localeCompare(b.signal.id),
    );

  const best = ranked[0];
  const signalBand =
    !best
      ? "none"
      : best.score <= 3
        ? "weak"
        : best.score <= 6
          ? "moderate"
          : "strong";
  const depthBand =
    capability.mode !== "probe" || !best
      ? "unknown"
      : best.signal.depth <= 4
        ? "shallow"
        : best.signal.depth <= 12
          ? "intermediate"
          : "deep";

  return {
    capabilityId: capability.id,
    mode: capability.mode,
    x,
    y,
    observedAtTick,
    signalBand,
    depthBand,
  };
}

export function applySensingObservation(
  content: Content,
  state: Save,
  capabilityId: string,
  x: number,
  y: number,
  apply: boolean,
) {
  const capability = content.site.sensingCapabilities.find(
    (entry) => entry.id === capabilityId,
  );
  if (!capability || !sensingCapabilityVisible(state, capability))
    return { ok: false as const, message: "Unknown sensing capability" };
  if (!sensingCapabilityUnlocked(state, capability))
    return { ok: false as const, message: "Sensing capability is locked" };
  if (
    x < 0 ||
    y < 0 ||
    x >= content.site.width ||
    y >= content.site.height
  )
    return { ok: false as const, message: "Sensing target outside site" };

  const observation = createSensingObservation(
    content,
    capability,
    x,
    y,
    state.tick,
  );
  if (apply) {
    state.sensingObservations[
      sensingObservationKey(capability.id, x, y)
    ] = observation;
    if (capability.mode === "probe" && observation.signalBand !== "none") {
      for (const deposit of content.site.hiddenDeposits) {
        if (deposit.requiredSensingCapabilityId !== capability.id) continue;
        const signal = content.site.surveySignals.find(
          (entry) => entry.id === deposit.surveySignalId,
        );
        if (!signal || signal.x !== x || signal.y !== y) continue;
        if (!state.discoveredDeposits.includes(deposit.id)) {
          state.discoveredDeposits.push(deposit.id);
          state.discoveredDeposits.sort();
        }
        state.deposits[deposit.id] ??= deposit.units;
      }
      for (const source of content.site.atmosphericSources) {
        if (source.requiredSensingCapabilityId !== capability.id) continue;
        const signal = content.site.surveySignals.find(
          (entry) => entry.id === source.surveySignalId,
        );
        if (!signal || signal.x !== x || signal.y !== y) continue;
        state.atmosphericSources[source.id] ??= source.units;
      }
    }
  }
  return {
    ok: true as const,
    message: "Sensing observation recorded",
  };
}
