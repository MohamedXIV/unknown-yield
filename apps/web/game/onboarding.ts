import type { PlayerSnapshot } from "@site/sim-core";

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
      eyebrow: "RECOVERY",
      title: "Stop, inspect, recover.",
      body:
        "An industrial incident is physical state, not a popup penalty. Inspect the affected equipment before changing the line.",
      hint:
        "Use the available drain, reclaim, repair or safer-setup action. The Field Notebook keeps the evidence the failure taught you.",
      step: null,
      total: TOTAL,
    };

  if (!snapshot.machines.some((machine) => machine.role === "extractor"))
    return {
      id: "camera-build",
      eyebrow: "FIELD BRIEF",
      title: "Read the site before you automate it.",
      body:
        "Right-drag to pan, scroll to zoom, and Home recenters the site. Start with an Extractor on a visible surface deposit.",
      hint:
        "Build tools preview placement before committing it. Arrows are physical input/output direction, not decoration.",
      step: 1,
      total: TOTAL,
    };

  if (!snapshot.factories.length)
    return {
      id: "physical-inventory",
      eyebrow: "FIELD BRIEF",
      title: "Nothing you move is global.",
      body:
        "Extracted material remains in a machine, belt, storage, factory buffer or terminal staging until something physically moves or transforms it.",
      hint:
        "Draw a factory next. Belts and wall ports connect its internal machines to the outside world; storage is geography, not a magic inventory.",
      step: 2,
      total: TOTAL,
    };

  const learned =
    snapshot.knowledgeEntries.some((entry) => !entry.initial) ||
    snapshot.observations.some((entry) => !entry.initial);
  if (!learned)
    return {
      id: "experiment",
      eyebrow: "FIELD BRIEF",
      title: "Operate first. Learn from the result.",
      body:
        "The company does not know every recipe. Route material through a plausible process and let the equipment produce evidence.",
      hint:
        "A setup, input and condition can be meaningful even when the output is unknown. The game will not reveal the authored answer in advance.",
      step: 3,
      total: TOTAL,
    };

  if (!signals.knowledgeOpened)
    return {
      id: "evidence",
      eyebrow: "FIELD BRIEF",
      title: "Evidence is more useful than a recipe list.",
      body:
        "You have learned something new. Open the Field Notebook to separate confirmed observations, unresolved branches and hazard evidence.",
      hint:
        "Notebook entries describe what the expedition has actually observed. Hidden alternatives stay hidden until evidence supports them.",
      step: 4,
      total: TOTAL,
    };

  if (signals.factoryToggleCount < 2)
    return {
      id: "factory-cycle",
      eyebrow: "FIELD BRIEF",
      title:
        signals.factoryToggleCount === 0
          ? "A solved factory is persistent capital."
          : "Reopen it without rebuilding it.",
      body:
        signals.factoryToggleCount === 0
          ? "Select a factory and close its roof with F or the factory control. Its internal topology and buffers remain real while the exterior becomes compact."
          : "Open the same factory again. The internal machines, buffers and connections should still be there for diagnosis or reconfiguration.",
      hint:
        signals.factoryToggleCount === 0
          ? "Closing is presentation and operating context—not deletion."
          : "Persistent factories are meant to be adapted, not rebuilt from scratch.",
      step: 5,
      total: TOTAL,
    };

  if (snapshot.exported <= 0)
    return {
      id: "terminal-export",
      eyebrow: "FIELD BRIEF",
      title: "The terminal turns industry into company value.",
      body: signals.terminalOpened
        ? "Use physical terminal staging and the shipment manifest to dispatch something the site has actually produced."
        : "Open the Company Terminal. Exports leave the map only through physical terminal staging and an explicit shipment manifest.",
      hint:
        "Market value can change; material truth does not. Exported units disappear only when the terminal dispatches them.",
      step: 6,
      total: TOTAL,
    };

  return {
    id: "complete",
    eyebrow: "FIELD BRIEF COMPLETE",
    title: "Discover → Experiment → Industrialize → Export.",
    body:
      "You now have the core operating language. New systems deepen the same loop rather than replacing it with a hidden checklist.",
    hint:
      "When something blocks or fails, inspect the world state first. The Notebook and terminal explain evidence and company context without revealing unknown recipes.",
    step: null,
    total: TOTAL,
  };
}
