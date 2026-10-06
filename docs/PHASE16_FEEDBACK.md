# Phase 16 — Production audio and industrial feedback (#154)

Issue #154 adds a representative feedback language for authoritative state changes. It does not add gameplay state, timing or hidden simulation knowledge.

## One semantic event stream

All production feedback starts from a diff between two public `PlayerSnapshot` values.

`deriveFeedbackEvents(previous, next)` emits only five cue classes:

- **machine-start** — a visible machine enters `processing`;
- **logistics-flow** — a previously idle physical network begins carrying material;
- **discovery** — a new observation has a real `observedAt` world event;
- **warning** — a machine newly enters a player-actionable blocked/fuel warning;
- **hazard** — a machine or pump newly enters an incident.

Audio and world FX consume the same event objects. There is no separate cosmetic state machine that can contradict sim-core.

## Restore / spoiler rules

Restoring a save must not pretend that old knowledge just happened.

Therefore:

- an observation without `observedAt` produces no discovery cue;
- newly present hazard evidence alone produces no hazard cue;
- hazard sound/FX requires an actual public incident transition;
- cue derivation never reads authored reactions, hidden deposits or hidden recipe definitions.

The feedback layer sees only already-public snapshot truth.

## Audio direction

The current representative pass uses a small deterministic Web Audio palette rather than committed sampled audio:

- machine start — low mechanical thunk;
- logistics flow — short paired transport ticks;
- discovery — rising two-note confirmation;
- warning — amber two-pulse alarm;
- hazard — bounded noise burst plus low alarm tone.

AudioContext is created/resumed only from an actual pointer or keyboard gesture so browser autoplay rules are respected. If Web Audio is unavailable or still suspended, gameplay continues silently.

The semantic cue IDs are intentionally independent from the sound implementation. Later production samples can replace synthesis without changing gameplay or event derivation.

## Visual FX

The Phaser world renders a transient pulse at the authoritative event location using the same cue:

- machine/logistics: restrained pale/green rings;
- discovery: larger bright expansion;
- warning: amber double ring;
- hazard: larger red/orange double ring.

These effects are presentation-only and never affect selection, hitboxes, simulation timing or material state.

## Activity boundaries

The logistics cue is deliberately coarse: it fires only when the public physical network changes from no carried material to some carried material. It is not a per-item sound generator, avoiding audio spam in saturated factories.

Machine-start and warning cues are edge-triggered status transitions, not continuous loops.

## Acceptance

The merge gate requires:

- deterministic focused tests for all five semantic cue classes;
- unchanged snapshots produce no events;
- restored observations without physical event locations remain silent;
- world integration derives feedback before replacing the previous snapshot;
- user gesture enables Web Audio;
- existing browser gameplay acceptance still passes;
- full repository tests, typecheck, lint and production build on the exact PR head.

No sim/save/content schema change is part of #154.
