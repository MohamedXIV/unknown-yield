# Execution Guide

This document is intentionally procedural. Game/design truth lives in the domain docs; GitHub Issue #2 is archived execution history; current direction is recorded below and active scope belongs to the next explicitly agreed issue.

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
- Phase 7 — scale/performance — is **DEFERRED**, not complete. The accepted 32-factory joint-p95 budget miss remains recorded; do not optimize further without renewed evidence/scope.
- Phase 8 — art production pipeline — remains a **parallel planned track** and does not block gameplay execution.
- Completed phase: **Phase 9 — material-state logistics and containment** (closed by #113 / PR #167, main `f8d3ac03aba006a0320b51c840441d2564f8a8b2`).
  - #108 liquid logistics ✓; #109 pressurized gas ✓; #110 authored containment ✓; #111 physical terminal handling ✓; #112 recoverable handling ✓; #113 integrated exit review ✓.
- Completed phase: **Phase 10 — industrial exploration and deep extraction (#101)**.
- Completed phase: **Phase 11 — hazardous science and recovery (#102)**.
- Completed phase: **Phase 12 — factory lifecycle and reconfiguration (#103)**. #126–#129 landed; #130 and #131 closed not planned under their recorded evidence/user decisions, with no false integrated-exit PASS claim for #131.
- Completed phase: **Phase 13 — terminal and off-world exchange depth (#104)** (closed after #138 / PR #192, main `a42e6e94a9f41588ddd4ecc19efea3829f8ddb42`). #132–#138 are complete; integrated evidence: [PHASE13_EXIT_REVIEW.md](PHASE13_EXIT_REVIEW.md).
- Completed phase: **Phase 14 — layered and long-distance logistics (#105)** (closed after #144 / PR #196, main `04da68325c495f811e611c05ae436c4daec79aa2`). #139 underground routes and #140 elevated gantries are accepted; #141–#143 closed NOT PLANNED after their evidence gates; integrated evidence: [PHASE14_EXIT_REVIEW.md](PHASE14_EXIT_REVIEW.md).
- Completed phase: **Phase 15 — content scale and expedition arc (#106)** (closed after #152 / PR #205, main `d8d0de628b73f1cd291083437de5aa2a88b33804`). #145–#152 are complete; integrated evidence: [PHASE15_EXIT_REVIEW.md](PHASE15_EXIT_REVIEW.md). Completed gameplay phase: **Phase 16 — production vertical slice (#107)**. #153–#160 are accepted and #161 records the integrated automated exit review. Human comprehension, subjective pacing/visual taste and physical-device/GPU judgment are deferred to the user's consolidated playthrough and are not claimed as PASS.

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

1. Read this guide and the current agreed GitHub issue. Issue #2 is historical; do not infer active work from its old NEXT entries.
2. If that issue already has an open PR, continue/review it; do not create a competing implementation.
3. Read the issue, `AGENTS.md`, and only the directly relevant design/architecture docs.
4. Create/use a focused branch named for the issue, e.g. `feat/3-material-ledger`.
5. Implement the smallest complete change that satisfies the issue's acceptance criteria.
6. Run focused tests first. Then run the broader checks required by the touched scope.
7. Open one focused PR referencing the issue. Record exact commands/results and intentional save/content compatibility changes.
8. Resolve review findings, re-check the exact PR head, then squash merge when the acceptance gate is satisfied.
9. Confirm the issue closes or close it with evidence, update current execution docs, then select the next agreed task.

## Verification baseline

For normal simulation/gameplay changes, expect:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Run focused package/tests before the full baseline. Browser acceptance is required when world interaction, Phaser presentation/input, React gameplay UI, save/load UX, or an issue's explicit gate needs it.

GitHub Actions CI is intentionally budget-conscious: it runs the full `npm test` + typecheck + lint + build gate when a pull request becomes ready for review, on later non-draft PR updates, or by explicit manual dispatch. Draft PRs and docs-only changes do not consume runner time, newer commits cancel older in-progress runs for the same PR, and merges to `main` do not trigger a duplicate CI run. Treat the exact workflow result as remote automated evidence. Browser acceptance remains a separate gate when world interaction, presentation/input, save/load UX, or an issue explicitly requires it.

## Scope rules

- `sim-core` owns gameplay truth.
- No generic discard or silent material loss.
- Storage is physical geography, not a global inventory abstraction.
- Preserve hidden authored truth vs player knowledge.
- Stable content IDs are simulation/save identity; localized/player-facing wording is presentation data.
- React stays out of per-frame world transforms.
- Do not add Rust/WASM without benchmark/profiler evidence.
- Completed phases are foundations, not active scope: extend their accepted contracts rather than reopening them casually.
- Phase 7 performance work remains deferred until measured browser/scale evidence justifies reopening it; Phase 8 art work is parallel and explicitly selected only when needed.
- Phase 10 is complete through #119 / PR #174, Phase 11 through #125 / PR #180, Phase 12 is complete under its recorded decisions, Phase 13 through #138 / PR #192, Phase 14 through #144 / PR #196, and Phase 15 through #152 / PR #205. Phase 16 / #107 remains active at dependency-ready child #161.

## Active/later phase epics

- #9 — experimentation and discovery depth — COMPLETE via children #30–#34
- #10 — factory-as-function contracts and abstraction proof — COMPLETE via children #45–#50
- #11 — Content Studio v1 — COMPLETE via children #60–#63
- #12 — Materials Exchange and corporate progression — COMPLETE via #69–#73; exit gate #73 merged through PR #79 / `dcbe1a567cc26ab150f13e159d35bf50030ee570`
- #80 — readable belts and controlled ground junctions — COMPLETE through #84 / PR #89.
- #100 — Phase 9 material-state logistics and containment — COMPLETE through #113 / PR #167.
- #101 — Phase 10 industrial exploration and deep extraction — COMPLETE through #119 / PR #174.
- #102 — Phase 11 hazardous industrial science and recovery — COMPLETE through #125 / PR #180.
- #103 — Phase 12 factory lifecycle and district reconfiguration — COMPLETE; #126–#129 landed, while #130 and #131 closed NOT PLANNED under their recorded evidence/decisions.
- #104 — Phase 13 terminal and off-world exchange depth — COMPLETE through #138 / PR #192 / `a42e6e94a9f41588ddd4ecc19efea3829f8ddb42`.
- #105 — Phase 14 layered and long-distance logistics — COMPLETE through #144 / PR #196 / `04da68325c495f811e611c05ae436c4daec79aa2`; #139–#140 accepted, #141–#143 CLOSED NOT PLANNED under evidence.
- #106 — Phase 15 content scale and expedition arc — COMPLETE through #152 / PR #205 / `d8d0de628b73f1cd291083437de5aa2a88b33804`.
- #107 — Phase 16 production vertical slice — COMPLETE through #161 integrated automated exit review. See [PHASE16_EXIT_REVIEW.md](PHASE16_EXIT_REVIEW.md). Deferred human/physical-device review remains outside the automated Phase 16 blocking gate.
- Phase 8 — art production pipeline — parallel planned track, selected explicitly when useful.
- Completed Phase 7 baseline: **#90 — single-world simulation/snapshot baseline**, through PR #91. Evidence: PHASE7_BASELINE.md. Phase 7 remains deferred; #92 profiling completed through PR #93; 32-factory / 10ms joint-p95 budget FAILS. Evidence: PHASE7_PROFILING.md. Optimization #94 is complete through PR #95: shared connected topology indexing within each throughput observation; all dynamic recurrence checks retained. Browser costs remain a separate gate.

Preserve the active issue dependency order. Archived Issue #2 NEXT entries and deferred roadmap possibilities do not authorize new work.

Completed optimization: #94 through PR #95, shared per-observation topology indexing. See [measurement and verification](PHASE7_TOPOLOGY_OPTIMIZATION.md). 32-factory joint p95: 31.0466ms flowing / 24.4467ms backpressured, both above the fixed 10ms budget. Follow-up #96 is complete through PR #97; the current measurement below supersedes these #94 results.

Completed optimization: #96 through PR #97, fresh local membership reused within observation. See [measurement and verification](PHASE7_MEMBERSHIP_OPTIMIZATION.md). 32-factory joint p95: 24.5777ms flowing / 19.6748ms backpressured, both above fixed 10ms. Fresh parent control: 33.0945 / 27.9175ms. Phase 7 remains open; assess remaining membership/signature and snapshot cloning costs under a separate approved scope.

## Execution reset — 2026-10-02

User chose to return to gameplay after #96 / PR #97 rather than continue snapshot optimization now. #2 is closed as a retired execution index, not evidence that every roadmap gate passed. #75 is closed as not planned: Vercel repair/deployment is outside the current scope, not fixed. Completed gameplay phases 1.5–6 and accepted Phase 7 measurements/optimizations remain documented.

Phase 7 performance work is deferred. The fixed 32-factory joint p95 <=10ms gate remains unmet (24.5777ms flowing / 19.6748ms backpressured); browser/device gates remain unverified. Keep existing evidence and correctness boundaries. Revisit when an actual browser-playability problem or an agreed feature scale requirement justifies it. Old NEXT recommendations in profiling docs are historical candidates, not active assignments.

Next: agree one substantial gameplay milestone, document its intent and acceptance, then open its canonical issue. No new gameplay feature, Phase 8 work, underground transport or optimization is implicitly selected by this reset.


## Post-foundation gameplay roadmap — 2026-10-02

The roadmap now records Phases 9–16 for the major gameplay directions that were already part of the design discussion but were not represented by the completed execution phases:

- Phase 9 — material-state logistics and containment;
- Phase 10 — industrial exploration and deep extraction;
- Phase 11 — hazardous industrial science and recovery;
- Phase 12 — factory lifecycle and district reconfiguration;
- Phase 13 — terminal and off-world exchange depth;
- Phase 14 — layered and long-distance logistics;
- Phase 15 — content scale and expedition arc;
- Phase 16 — production vertical slice.

Canonical GitHub epics and children exist for Phase 9 #100 (#108–#113), Phase 10 #101 (#114–#119), Phase 11 #102 (#120–#125), Phase 12 #103 (#126–#131), Phase 13 #104 (#132–#138), Phase 14 #105 (#139–#144), Phase 15 #106 (#145–#152), and Phase 16 #107 (#153–#161). Phases 9–15 are complete under their recorded exit decisions. Phase 16 / #107 is active at dependency-ready child #161; see [PHASE16_PLAYTESTING.md](PHASE16_PLAYTESTING.md) for #160 evidence and deferred human-review boundaries.

Phase 7 remains deferred with its accepted unmet performance budget preserved. Phase 8 remains a parallel art-pipeline track and does not block gameplay execution. Do not reopen completed foundations merely because later phases deepen discovery, company systems or logistics; extend the accepted contracts.

## Phase 9 liquid gate — #108

Directed pipes, source pumps, single-material tanks and the normal solid → liquid → solid chain are accepted. Evidence: [PHASE9_LIQUID_ACCEPTANCE.md](PHASE9_LIQUID_ACCEPTANCE.md). Save schema 14 / world-01-v7 explicitly reject incompatible earlier content; pre-release compatibility is not a scope constraint. #100 remains open for #109–#113. Next agreed gameplay scope is #109, preserving its dependency on #108.

## Phase 9 gas implementation — #109

#108 merged through PR #162 / main `7f88eb3c326194836e3f360755daf2c87b4287fb`. #109 is implemented on `codex/109-pressurized-gas`, with separate sealed pressure transport/storage and the hidden liquid → gas → solid branch. Local evidence: [PHASE9_GAS_ACCEPTANCE.md](PHASE9_GAS_ACCEPTANCE.md); contract: [PHASE9_GAS_LOGISTICS.md](PHASE9_GAS_LOGISTICS.md). Save schema 15 / world-01-v8; gas blueprint schema 4. The local acceptance gate passed (308 tests PASS, 2 skipped; typecheck/lint/build/browser acceptance PASS). Delivery and merge state are tracked in PR #163. Keep #100 open; #110 is the next dependency after #109 closes, and requires its own agreed scope.

## Phase 9 containment implementation — #110

#109 merged through PR #163 / main `dd67f42f5e391c425cbbc2188618a4366b4e6821`. #110 merged through PR #164 / main `9a2f7be167f013454491d5781ee6370175b9170d`. Authored all-of containment and physical liquid profiles were accepted with **332 tests PASS, 2 skipped; typecheck/lint/build/browser acceptance PASS**. Historical versions: save 16 / world-01-v9 / liquid blueprint 5 / browser slot v10. Evidence: [PHASE9_CONTAINMENT_ACCEPTANCE.md](PHASE9_CONTAINMENT_ACCEPTANCE.md).

## Phase 9 physical terminal handling — #111

Approved design and plan are implemented natively on `codex/111-terminal-handling` in the same checkout. Content-authored fixed liquid/gas docks are physical admission gates with bounded holdings, evidence unlocks, exact installation/refund costs and shared exchange settlement. Current versions: **save 17 / world-01-v10 / browser slot v11**; conditional factory blueprint versions 1–5 remain unchanged and exclude terminal modules. Current fixture saves below schema 17 are incompatible and reject atomically. Final suite: **351 PASS, 2 skipped**. Contract/evidence: [terminal design](superpowers/specs/2026-10-04-terminal-handling-design.md), [acceptance](PHASE9_TERMINAL_ACCEPTANCE.md), [implementation ledger](PHASE9_TERMINAL_IMPLEMENTATION_LOG.md). Delivery: [PR #165](https://github.com/MohamedXIV/unknown-yield/pull/165). #111 merged through PR #165 / main d8578d622e63d7695b2442c3936218d77867cb98. #100 stays open; #112 is approved and active; #113 has not begun.

## Phase 9 recoverable handling — #112

Approved contained pump failure is implemented on codex/112-recoverable-handling in this checkout. Save 18 / world-01-v11 / browser slot v12; conditional blueprint 1–5 unchanged. Contract: docs/superpowers/specs/2026-10-04-recoverable-handling-design.md; implementation ledger: PHASE9_RECOVERY_IMPLEMENTATION_LOG.md. Final gate: 380 PASS / 2 skipped; typecheck/lint/build/static-export/browser/diff PASS. Evidence and delivery: PHASE9_RECOVERY_ACCEPTANCE.md. #112 merged via PR #166. #100 remains open; #113 is now the approved integrated exit review.

#112 merged via [PR #166](https://github.com/MohamedXIV/unknown-yield/pull/166), main `539f3f37dc2d317423748493c7c65383009e0a27`; live #112 CLOSED. #100 remains OPEN. The user approved #113 integrated exit review on 2026-10-04; active evidence is [PHASE9_EXIT_REVIEW.md](PHASE9_EXIT_REVIEW.md). Review only the accepted Phase 9 contract; later phases remain deferred.

## Phase 9 integrated exit review — #113

Approved 2026-10-04 after #112 merge. Native review on `codex/113-material-state-exit` from main `539f3f37dc2d317423748493c7c65383009e0a27`. No production defect or schema change: adds one fresh-world integrated regression, browser continuation and evidence. Local gate: **381 PASS / 2 skipped; typecheck/lint/build/static-export/browser PASS**. [Exit review](PHASE9_EXIT_REVIEW.md) records exact commands, retries, attribution and limits. #113 merged via PR #167 to main `f8d3ac03aba006a0320b51c840441d2564f8a8b2`; #100 and #113 are closed. Phase 10 / #101 is now active, beginning with #114.


## Phase 16 integrated exit review — #161

#160 merged through PR #215 / main `d49806b566265a766018626fcb498132d69c1752`. #161 reconciles accepted children #153–#160 without introducing new gameplay scope. The automated/technical Phase 16 exit gate passes; evidence is [PHASE16_EXIT_REVIEW.md](PHASE16_EXIT_REVIEW.md).

Player comprehension, subjective pacing/visual taste and representative physical-device/GPU judgment remain **DEFERRED HUMAN REVIEW** for the user's consolidated playthrough. They are not claimed as automated PASS and do not block the recorded Phase 16 technical closeout.

After #161/#107 close, do not invent a Phase 17. The next canonical product work must come from consolidated user feedback or a new explicitly approved roadmap decision.
