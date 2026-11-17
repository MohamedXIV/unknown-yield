import type { PlayerSnapshot } from "@site/sim-core";
import { t } from "./i18n";

export type OnboardingBeatId =
  | "camera-build"
  | "physical-inventory"
  | "experiment"
  | "evidence"
  | "factory-cycle"
  | "terminal-export"
  | "recovery"
  | "complete";

export type OnboardingSignals = {
  knowledgeOpened: boolean;
  terminalOpened: boolean;
  factoryToggleCount: number;
};

export type OnboardingBeat = {
  id: OnboardingBeatId;
  eyebrow: string;
  title: string;
  body: string;
  hint: string;
  step: number | null;
  total: number;
};

const TOTAL = 6;

/**
 * Player-facing wording lives in the locale catalog under
 * `ui.onboarding.<copy>.{eyebrow,title,body,hint}`. This module only decides which
 * beat applies; it never embeds display strings.
 */
function copy(
  key: string,
): Pick<OnboardingBeat, "eyebrow" | "title" | "body" | "hint"> {
  return {
    eyebrow: t("ui.onboarding." + key + ".eyebrow"),
    title: t("ui.onboarding." + key + ".title"),
    body: t("ui.onboarding." + key + ".body"),
    hint: t("ui.onboarding." + key + ".hint"),
  };
}

export function onboardingBeat(
  snapshot: PlayerSnapshot,
  signals: OnboardingSignals,
): OnboardingBeat {
  const incident =
    snapshot.machines.some((machine) => machine.incident) ||
    snapshot.pumps.some((pump) => pump.incident);

  if (incident)
    return {
      id: "recovery",
      ...copy("recovery"),
      step: null,
      total: TOTAL,
    };

  if (!snapshot.machines.some((machine) => machine.role === "extractor"))
    return {
      id: "camera-build",
      ...copy("camera-build"),
      step: 1,
      total: TOTAL,
    };

  if (!snapshot.factories.length)
    return {
      id: "physical-inventory",
      ...copy("physical-inventory"),
      step: 2,
      total: TOTAL,
    };

  const learned =
    snapshot.knowledgeEntries.some((entry) => !entry.initial) ||
    snapshot.observations.some((entry) => !entry.initial);
  if (!learned)
    return {
      id: "experiment",
      ...copy("experiment"),
      step: 3,
      total: TOTAL,
    };

  if (!signals.knowledgeOpened)
    return {
      id: "evidence",
      ...copy("evidence"),
      step: 4,
      total: TOTAL,
    };

  if (signals.factoryToggleCount < 2)
    return {
      id: "factory-cycle",
      ...copy(
        signals.factoryToggleCount === 0
          ? "factory-cycle-close"
          : "factory-cycle-reopen",
      ),
      step: 5,
      total: TOTAL,
    };

  if (snapshot.exported <= 0)
    return {
      id: "terminal-export",
      ...copy(
        signals.terminalOpened ? "terminal-export-open" : "terminal-export",
      ),
      step: 6,
      total: TOTAL,
    };

  return {
    id: "complete",
    ...copy("complete"),
    step: null,
    total: TOTAL,
  };
}
