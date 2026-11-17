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
  /** Tool ids this beat asks the player to use. Must all be authorized when the beat is active. */
  tools: string[];
};

/** Instruments each beat's guidance depends on (an authorization tool id list). */
const BEAT_TOOLS: Record<OnboardingBeatId, string[]> = {
  "camera-build": ["extractor"],
  "physical-inventory": ["factory", "port", "belt"],
  experiment: ["crusher", "furnace"],
  evidence: [],
  "factory-cycle": [],
  "terminal-export": [],
  recovery: [],
  complete: [],
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
      tools: BEAT_TOOLS["recovery"],
      ...copy("recovery"),
      step: null,
      total: TOTAL,
    };

  if (!snapshot.machines.some((machine) => machine.role === "extractor"))
    return {
      id: "camera-build",
      tools: BEAT_TOOLS["camera-build"],
      ...copy("camera-build"),
      step: 1,
      total: TOTAL,
    };

  if (!snapshot.factories.length)
    return {
      id: "physical-inventory",
      tools: BEAT_TOOLS["physical-inventory"],
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
      tools: BEAT_TOOLS["experiment"],
      ...copy("experiment"),
      step: 3,
      total: TOTAL,
    };

  if (!signals.knowledgeOpened)
    return {
      id: "evidence",
      tools: BEAT_TOOLS["evidence"],
      ...copy("evidence"),
      step: 4,
      total: TOTAL,
    };

  if (signals.factoryToggleCount < 2)
    return {
      id: "factory-cycle",
      tools: BEAT_TOOLS["factory-cycle"],
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
      tools: BEAT_TOOLS["terminal-export"],
      ...copy(
        signals.terminalOpened ? "terminal-export-open" : "terminal-export",
      ),
      step: 6,
      total: TOTAL,
    };

  return {
    id: "complete",
      tools: BEAT_TOOLS["complete"],
    ...copy("complete"),
    step: null,
    total: TOTAL,
  };
}
