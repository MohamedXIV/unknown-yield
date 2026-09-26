import type { PlayerSnapshot } from "@site/sim-core";

type Observation = PlayerSnapshot["observations"][number];

export function observationKey(observation: Observation): string {
  return observation.textKey;
}

export function unseenObservations(
  observations: Observation[],
  seenKeys: ReadonlySet<string>,
): Observation[] {
  return observations.filter(
    (observation) => !seenKeys.has(observationKey(observation)),
  );
}
