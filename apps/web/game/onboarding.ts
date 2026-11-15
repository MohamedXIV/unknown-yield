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
 * `ui.onboarding.<copy>.{title,body,hint}`. This module only decides which
 * beat applies; it never embeds display strings.
 */
function copy(
  key: string,
): Pick<OnboardingBeat, "title" | "body" | "hint"> {
  return {
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
      eyebrow: t("ui.onboarding.recovery.eyebrow"),
      ...copy("recovery"),
      step: null,
      total: TOTAL,
    };

  if (!snapshot.machines.some((machine) => machine.role === "extractor"))
    return {
      id: "camera-build",
      eyebrow: t("ui.onboarding.eyebrow"),
      ...copy("camera-build"),
      step: 1,
      total: TOTAL,
    };

  if (!snapshot.factories.length)
    return {
      id: "physical-inventory",
      eyebrow: t("ui.onboarding.eyebrow"),
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
      eyebrow: t("ui.onboarding.eyebrow"),
      ...copy("experiment"),
      step: 3,
      total: TOTAL,
    };

  if (!signals.knowledgeOpened)
    return {
      id: "evidence",
      eyebrow: t("ui.onboarding.eyebrow"),
      ...copy("evidence"),
      step: 4,
      total: TOTAL,
    };

  if (signals.factoryToggleCount < 2)
    return {
      id: "factory-cycle",
      eyebrow: t("ui.onboarding.eyebrow"),
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
      eyebrow: t("ui.onboarding.eyebrow"),
      ...copy(
        signals.terminalOpened ? "terminal-export-open" : "terminal-export",
      ),
      step: 6,
      total: TOTAL,
    };

  return {
    id: "complete",
    eyebrow: t("ui.onboarding.eyebrow-complete"),
    ...copy("complete"),
    step: null,
    total: TOTAL,
  };
}
