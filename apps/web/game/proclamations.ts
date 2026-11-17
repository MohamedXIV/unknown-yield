import type { PlayerSnapshot } from "@site/sim-core";

/**
 * Proclamations: the state announcing something to the player.
 *
 * One small API for every announcement the fiction makes (a new authorization,
 * a discovery, a piece of equipment unlocked, a milestone, a plain bulletin).
 * Anything can `announce`, or a source can derive proclamations from two
 * snapshots (`proclamationsBetween`). Presentation lives in
 * `components/Proclamation.tsx`; wording lives in the locale under
 * `proclamation.<slug>.{kicker,title,body,slogan}` with a generic fallback per
 * kind (`proclamation.<kind>.*`).
 */
export type ProclamationKind =
  | "authorization"
  | "discovery"
  | "unlock"
  | "milestone"
  | "announcement";

/** `major` is a poster modal; `minor` is a banner so routine news never stops play. */
export type ProclamationWeight = "major" | "minor";

export type ProclamationIllustration =
  | "premises"
  | "reduction"
  | "expansion"
  | "equipment"
  | "discovery"
  | "milestone"
  | "bulletin";

export type Proclamation = {
  /** Stable identity, also the dedupe key and the voice-cue id. */
  id: string;
  kind: ProclamationKind;
  weight: ProclamationWeight;
  illustration: ProclamationIllustration;
  /** Tools (build tool ids) the announcement puts in the player's hands. */
  tools?: string[];
  /** Extra values for `{{placeholders}}` in the wording. */
  params?: Record<string, string>;
  /** Locale key of a ready-made body, used when no authored one exists. */
  bodyKey?: string;
};

export const proclamationSlug = (id: string): string => id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

type Lookup = {
  t: (key: string, params?: Record<string, string>) => string;
  exists: (key: string) => boolean;
  /** Display name of a build tool, for `{{name}}` in unlock wording. */
  toolName?: (tool: string) => string;
};

export type ProclamationText = {
  kicker: string;
  title: string;
  body: string;
  slogan: string;
};

/** Resolves wording: specific key first, then the generic one for the kind. */
export function proclamationText(p: Proclamation, lookup: Lookup): ProclamationText {
  const slug = proclamationSlug(p.id);
  const params: Record<string, string> = { ...p.params };
  if (params.nameKey && !params.name) params.name = lookup.t(params.nameKey);
  if (!params.name && p.tools?.[0] && lookup.toolName) params.name = lookup.toolName(p.tools[0]);
  const pick = (field: string): string => {
    const specific = `proclamation.${slug}.${field}`;
    const generic = `proclamation.${p.kind}.${field}`;
    const key = lookup.exists(specific) ? specific : generic;
    return lookup.exists(key) ? lookup.t(key, params) : "";
  };
  const body = pick("body") || (p.bodyKey && lookup.exists(p.bodyKey) ? lookup.t(p.bodyKey, params) : "");
  return { kicker: pick("kicker"), title: pick("title"), body, slogan: pick("slogan") };
}

const ILLUSTRATION_FOR_PERMIT: Record<string, ProclamationIllustration> = {
  premises: "premises",
  reduction: "reduction",
  expansion: "expansion",
};

/**
 * Proclamations that became true between two snapshots. Pure, so the same
 * rule runs in the game and in tests. Loading a slot must reseed `prev`.
 */
export function proclamationsBetween(prev: PlayerSnapshot, next: PlayerSnapshot): Proclamation[] {
  const out: Proclamation[] = [];

  const earnedBefore = new Set(prev.permits.filter((permit) => permit.earned).map((permit) => permit.id));
  for (const permit of next.permits)
    if (permit.earned && !earnedBefore.has(permit.id))
      out.push({
        id: `permit:${permit.id}`,
        kind: "authorization",
        weight: "major",
        illustration: ILLUSTRATION_FOR_PERMIT[permit.id] ?? "equipment",
        tools: permit.tools,
        bodyKey: permit.noticeKey,
      });

  const unlockedBefore = new Set(prev.definitions.filter((d) => d.unlock?.unlocked).map((d) => d.id));
  for (const definition of next.definitions)
    if (definition.unlock?.unlocked && !unlockedBefore.has(definition.id))
      out.push({
        id: `unlock:${definition.id}`,
        kind: "unlock",
        weight: "major",
        illustration: "equipment",
        tools: [definition.id],
      });

  const confirmedBefore = new Set(
    prev.knowledgeEntries.filter((entry) => entry.state === "confirmed").map((entry) => entry.id),
  );
  const learnedAnythingBefore = prev.knowledgeEntries.some(
    (entry) => entry.state === "confirmed" && !entry.initial,
  );
  for (const entry of next.knowledgeEntries)
    if (entry.state === "confirmed" && !entry.initial && !confirmedBefore.has(entry.id))
      out.push({
        id: `discovery:${entry.id}`,
        kind: "discovery",
        weight: learnedAnythingBefore ? "minor" : "major",
        illustration: "discovery",
        bodyKey: entry.textKey,
      });

  const doneBefore = new Set(prev.milestones.filter((m) => m.completed).map((m) => m.id));
  for (const milestone of next.milestones)
    if (milestone.completed && !doneBefore.has(milestone.id))
      out.push({
        id: `milestone:${milestone.id}`,
        kind: "milestone",
        weight: "major",
        illustration: "milestone",
        params: { nameKey: milestone.nameKey },
        bodyKey: milestone.hintKey,
      });

  return out;
}

type Listener = (p: Proclamation) => void;
const listeners = new Set<Listener>();
/** Hook for sound or analytics: called for every proclamation that reaches the player. */
export const subscribeProclamations = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const notifyProclamation = (p: Proclamation): void => {
  for (const fn of listeners) fn(p);
};

/** Queue rules: no duplicates, majors before minors, bounded length. */
export function enqueueProclamations(queue: readonly Proclamation[], add: readonly Proclamation[], limit = 8): Proclamation[] {
  const have = new Set(queue.map((p) => p.id));
  const next = [...queue, ...add.filter((p) => !have.has(p.id))];
  const majors = next.filter((p) => p.weight === "major");
  const minors = next.filter((p) => p.weight === "minor");
  return [...majors, ...minors].slice(0, limit);
}
