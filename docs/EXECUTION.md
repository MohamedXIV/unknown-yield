# Execution Guide

This document is intentionally procedural. Game/design truth lives in the domain docs; GitHub Issue #2 is the live execution index.

## Current state

- First playable: accepted and merged.
- Completed phase: **Phase 1.5 — physical inventory and flexible routing** (closed by #8 / PR #29).
- Completed phase: **Phase 2 — experimentation and discovery depth** (closed by #34 / PR #44).
- Completed phase: **Phase 3 — factory as function** (closed by #50).
- Completed foundation: **#3 — material ledger and conservation invariants** (merged via PR #17).
- Completed foundation: **#14 — stable content IDs and localization-ready presentation** (merged via PR #19).
- Completed Phase 1.5 child: **#4 — physical storage and terminal staging** (merged via PR #21).
- Completed Phase 1.5 child: **#5 — remove generic discard and define material handling/reclaim rules** (merged via PR #23).
- Completed Phase 1.5 child: **#6 — flexible belt routing for persistent production lines** (merged via PR #25).
- Completed Phase 1.5 child: **#7 — preserve factory state across suspend, reroute and resume** (merged via PR #27).
- Completed Phase 1.5 gate: **#8 — end-to-end physical inventory and rerouting exit review** (merged via PR #29).
- Completed Phase 2 child: **#30 — minimal condition-aware reaction matching** (merged via PR #36).
- Completed Phase 2 child: **#31 — experiment observations and knowledge states** (merged via PR #38).
- Completed Phase 2 child: **#32 — one explainable condition-driven hazardous failure** (merged via PR #40).
- Completed Phase 2 child: **#33 — gate one capability from demonstrated knowledge** (merged via PR #42).
- Completed Phase 2 gate: **#34 — end-to-end experimentation and discovery exit review** (merged via PR #44).
- Completed Phase 3 child: **#45 — derive one read-only factory external contract** (merged via PR #52).
- Completed Phase 3 child: **#46 — detect one stable factory state and throughput contract** (merged via PR #54; backlog-stability regression fixed via PR #57).
- Completed Phase 3 child: **#47 — serialize one factory blueprint from detailed topology** (merged via PR #55).
- Completed Phase 3 child: **#48 — present a closed factory as a readable contract and reopen it for diagnosis** (merged via PR #56).
- Completed Phase 3 child: **#49 — evaluate aggregate execution with equivalence/performance evidence** (NO-GO; merged via PR #58).
- Completed Phase 3 gate: **#50 — end-to-end factory-as-function exit review**.
- Completed phase: **Phase 4 — Content Studio v1** (closed by #63 / PR #67).
- Completed Phase 4 child: **#60 — versioned Content Studio authoring core** (merged via PR #64).
- Completed Phase 4 child: **#61 — workbench + reference browser** (merged via PR #65).
- Completed Phase 4 child: **#62 — selected-content simulation preview** (merged via PR #66).
- Completed Phase 4 gate: **#63 — end-to-end Content Studio v1 exit review** (merged via PR #67).
- Completed phase: **Phase 5 — Materials Exchange and corporate progression** (closed by #73 / PR #79, squash merge `dcbe1a567cc26ab150f13e159d35bf50030ee570`).
- Completed Phase 5 child: **#69 — authoritative Materials Exchange baseline** (merged via PR #74).
- Completed Phase 5 child: **#70 — Corporate Orders and Special Directives** (merged via PR #76).
- Completed Phase 5 child: **#71 — evidence-driven milestones, terminal handling, and fuel classes** (merged via PR #77).
- Completed Phase 5 child: **#72 — corporate assistance, obligations, and recovery standing** (merged via PR #78).
- Completed Phase 5 gate: **#73 — end-to-end company progression exit review** (merged via PR #79 / `dcbe1a567cc26ab150f13e159d35bf50030ee570`).
  - Accepted evidence: `packages/sim-core/test/phase5-exit.test.ts` + `docs/PHASE5_EXIT_REVIEW.md`.
  - No Phase 6 implementation was started during the Phase 5 closeout.
- Completed phase: **Phase 6 — readable belts and controlled ground junctions (#80)**, accepted through #84 / PR #89. Evidence: [PHASE6_EXIT_REVIEW.md](PHASE6_EXIT_REVIEW.md).
- Completed Phase 6 child: **#81 — truthful L turns and manual diverter paths**, through PR #86; evidence in `PHASE6_BELT_ACCEPTANCE.md`.
- Completed Phase 6 child: **#82 — directed T splitters and fair mergers**, through PR #87; evidence in `PHASE6_T_ACCEPTANCE.md`.
- Completed Phase 6 child: **#83 — controlled ground crossing**, through PR #88; evidence in `PHASE6_CROSSING_ACCEPTANCE.md`.
- Phase 6 integrated gate accepted through #84 / PR #89.
- Completed Phase 6 gate: **#84 — end-to-end junction exit review**, through PR #89; evidence in `PHASE6_EXIT_REVIEW.md`.
  - Design contract: `docs/PHASE6_JUNCTIONS.md` + D-033. Partial implementation does not redefine intent.

## Phase 1.5 dependency graph

```text
#3 conservation ledger ✓
        │
        v
#14 stable IDs + localization-ready presentation ✓
 ├─> #4 physical storage + terminal staging ✓ ─> #5 remove generic discard ✓
 ├─> #6 flexible belt routing ✓ ────────────┐
 └──────────────────────────────────────────> #7 persistent factory state ✓
                                              │
#3 + #14 + #4 + #5 + #6 + #7 ─────────────> #8 exit review ✓
```

Phase 1.5 is complete.

## Phase 2 dependency graph

```text
#30 condition-aware reaction matching ✓
  │
  v
#31 experiment observations + knowledge states ✓
  │
  v
#32 explainable condition-driven hazard ✓
  │
  v
#33 demonstrated-knowledge capability gate ✓
  │
  v
#34 Phase 2 exit review ✓
```

Phase 2 is complete.

## Phase 3 dependency graph

```text
#45 read-only external factory contract ✓
  │
  v
#46 stable-state + throughput certification ✓ ─┐
  │                                             │
  ├──────────────> #48 closed-factory UI ✓     │
  │                                             │
#47 blueprint serialization ✓ ─────────────────┤
  │                                             v
  └────────────────────────────────────────> #49 aggregate execution evidence decision ✓
                                                │
                                                v
                                           #50 Phase 3 exit review ✓
```

#10 is complete. Detailed simulation remains authoritative, roof/open state is presentation-only, and #49 recorded a measured NO-GO for aggregate execution at the current scale.

## Phase 4 dependency graph

```text
#60 versioned multi-table authoring core + locale bundle ✓
  │
  v
#61 Content Studio workbench + reverse references ✓
  │
  v
#62 selected-content isolated simulation preview ✓
  │
  v
#63 Phase 4 exit review ✓
```

#11 is complete. TinyBase owns authoring drafts only; valid bundles cross a deterministic content+locale boundary; sim-core validates gameplay semantics independently from locale-resource availability. The generated Studio route remains absent from the player production export.

## Phase 5 dependency graph

```text
#69 Materials Exchange baseline ✓
  │
  v
#70 Corporate Orders + Special Directives ✓
  │
  v
#71 milestones + terminal handling + fuel classes ✓
  │
  v
#72 assistance + obligations + recovery standing ✓
  │
  v
#73 Phase 5 exit review ✓
```

#12 is complete. #69–#73 are complete; the integrated exit gate merged via PR #79 as `dcbe1a567cc26ab150f13e159d35bf50030ee570`.

## Phase 6 dependency graph

```text
#81 readable L turns + manual diverters ✓
  │
  v
#82 directed T splitters + fair mergers ✓
  │
  v
#83 controlled + crossing ✓
  │
  v
#84 integrated junction exit review
```

#80 is complete through #84 / PR #89. #81–#83 were accepted through PR #86–#88. Continue any canonical open PR before creating another. Each feature milestone includes playable interaction, relevant focused checks and browser acceptance. The final gate proves the continuous world and full baseline. Underground transport remains deferred.

Read `PHASE6_JUNCTIONS.md` before changing routing, visuals or persistence. Missing fairness, phase clearance, ledger accounting or migration is an implementation gap, not permission to invent replacement semantics. Record conflicts and amend D-033 explicitly when evidence changes the decision.

## Agent loop

1. Read Issue #2 and identify the first unblocked incomplete issue.
2. If that issue already has an open PR, continue/review it; do not create a competing implementation.
3. Read the issue, `AGENTS.md`, and only the directly relevant design/architecture docs.
4. Create/use a focused branch named for the issue, e.g. `feat/3-material-ledger`.
5. Implement the smallest complete change that satisfies the issue's acceptance criteria.
6. Run focused tests first. Then run the broader checks required by the touched scope.
7. Open one focused PR referencing the issue. Record exact commands/results and intentional save/content compatibility changes.
8. Resolve review findings, re-check the exact PR head, then squash merge when the acceptance gate is satisfied.
9. Confirm the issue closes or close it with evidence, update Issue #2 if needed, then select the next unblocked issue.

## Verification baseline

For normal simulation/gameplay changes, expect:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Run focused package/tests before the full baseline. Browser acceptance is required when world interaction, Phaser presentation/input, React gameplay UI, save/load UX, or an issue's explicit gate needs it.

There is currently no remote CI workflow. Do not represent absent checks as green CI; record local/domain/browser evidence precisely.

## Scope rules

- `sim-core` owns gameplay truth.
- No generic discard or silent material loss.
- Storage is physical geography, not a global inventory abstraction.
- Preserve hidden authored truth vs player knowledge.
- Stable content IDs are simulation/save identity; localized/player-facing wording is presentation data.
- React stays out of per-frame world transforms.
- Do not add Rust/WASM without benchmark/profiler evidence.
- Do not expand Content Studio, advanced logistics, market depth, or broad content volume as a prerequisite to Phase 2.
- Phase 2 experimentation must preserve hidden authored truth vs player knowledge and remain deterministic from authoritative simulation conditions.
- Phase 6 is limited to #80 / #81–#84. Do not create speculative issue trees for its deferred technologies or Phases 7–8.

## Active/later phase epics

- #9 — experimentation and discovery depth — COMPLETE via children #30–#34
- #10 — factory-as-function contracts and abstraction proof — COMPLETE via children #45–#50
- #11 — Content Studio v1 — COMPLETE via children #60–#63
- #12 — Materials Exchange and corporate progression — COMPLETE via #69–#73; exit gate #73 merged through PR #79 / `dcbe1a567cc26ab150f13e159d35bf50030ee570`
- #80 — readable belts and controlled ground junctions — COMPLETE through #84 / PR #89.
- Completed Phase 7 baseline: **#90 — single-world simulation/snapshot baseline**, through PR #91. Evidence: PHASE7_BASELINE.md. Phase 7 remains open; #92 profiling completed through PR #93; 32-factory / 10ms joint-p95 budget FAILS. Evidence: PHASE7_PROFILING.md. Optimization #94 is complete through PR #95: shared connected topology indexing within each throughput observation; all dynamic recurrence checks retained. Browser costs remain a separate gate.

Follow the live dependency order in Issue #2. Deferred roadmap possibilities are not permission to work around the active gate.

Completed optimization: #94 through PR #95, shared per-observation topology indexing. See [measurement and verification](PHASE7_TOPOLOGY_OPTIMIZATION.md). 32-factory joint p95: 31.0466ms flowing / 24.4467ms backpressured, both above the fixed 10ms budget. Phase 7 remains open; assess a separately scoped next candidate from the remaining topologySignature/snapshot costs.

Active approved optimization: #96, fresh local membership reused within observation; see PHASE7_MEMBERSHIP_OPTIMIZATION.md. Phase 7 remains open.
