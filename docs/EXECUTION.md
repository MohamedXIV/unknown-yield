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
- Phase 10 is complete through #119 / PR #174, Phase 11 through #125 / PR #180, Phase 12 under its recorded decisions, Phase 13 through #138 / PR #192, Phase 14 through #144 / PR #196, Phase 15 through #152 / PR #205, Phase 16 through #161 / PR #216, Phase 17 through #223 / PR #230, and **Phase 18 — camera comfort, mobile touch and Game Configuration (#232)** through #238 / PR #244 / `a4ab5a8cb70e63134f8398807facca20d8ff421e`. No later product phase is implicitly selected.

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

Canonical GitHub epics and children exist for Phase 9 #100 (#108–#113), Phase 10 #101 (#114–#119), Phase 11 #102 (#120–#125), Phase 12 #103 (#126–#131), Phase 13 #104 (#132–#138), Phase 14 #105 (#139–#144), Phase 15 #106 (#145–#152), Phase 16 #107 (#153–#161), Phase 17 #217 (#218–#223), and Phase 18 #232 (#233–#238). Phases 9–18 are technically complete under their recorded exit decisions. See [PHASE17_EXIT_REVIEW.md](PHASE17_EXIT_REVIEW.md) and [PHASE18_EXIT_REVIEW.md](PHASE18_EXIT_REVIEW.md); human device/visual feedback remains deferred.

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

Phase 16 is closed. On 2026-10-07 the user explicitly approved Phase 17 / #217 to fix interaction UX before the later visual/UI polish pass. Phase 17 is now closed through #223 / PR #230; evidence: [PHASE17_EXIT_REVIEW.md](PHASE17_EXIT_REVIEW.md). Broad appearance restyling remains a separate, not-yet-selected scope.


## Phase 17 interaction UX — #217

User decision 2026-10-07: prioritize build-tool **UX organization and interaction** before broad UI appearance work. The current flat toolbar exposes the full tool catalog at equal weight and scales poorly as content grows.

Canonical execution:

`#218 -> #219 -> #220`

`#218 -> #221 -> #222`

`#219 + #220 + #221 + #222 -> #223`

Phase 17 is **COMPLETE** through #223 / PR #230 / `a9f7d8374aec98e42c101c96a8487568a322b225`. The accepted model is functional tool groups, short-click effective-primary selection, press-and-hold upward submenus for pointer and group shortcuts, deterministic contextual submenu shortcut precedence, and optional last-used child promotion controlled by persisted Game Configuration preferences. The exact production-browser exit gate passed on head `d2b25105313cda6e43e962912568d2e374d320a6` in CI #189. See [PHASE17_EXIT_REVIEW.md](PHASE17_EXIT_REVIEW.md).

Gameplay/simulation semantics remain unchanged by the Phase 17 interaction layer. Broad visual identity, stylistic polish and the user's “AI-ish” appearance concerns remain deliberately deferred until explicitly selected.

## Phase 18 camera, touch and configuration UX — #232

The user approved improving desktop camera comfort, real mobile touch gestures,
discoverable settings and restrained UI animation on 2026-10-08. All canonical
children #233–#238 are **technically COMPLETE**:

- #233 camera target/current navigation, bounded zoom and reduced/instant mode:
  PR #239, main `ff678e97f6cc0416218666d7b580c045f0f8fef2`.
- #234 + #235 versioned Game Configuration and live desktop camera controls:
  PR #240, main `717e4b1a785bbe95a7c37324010abb3274a9ed95`.
- #236 safe touch drag/tap/pan/pinch and accessible zoom alternatives:
  PR #241, main `06abf715d145eaae439fd4f771946a87af1885e8`.
- #237 subtle mount-only CSS motion and System/On/Off reduced motion:
  PR #243, main `45f29061209acb14673dd7cb7050c8ed54024a49`.
- #238 integrated production-export browser gate, opt-in measurement and
  runtime-error evidence: PR #244, main
  `a4ab5a8cb70e63134f8398807facca20d8ff421e`.

Exit gate CI #206 passed at `c32ea23b269d7cd9f62d5644cd57415776e6d16d`:
**557 tests pass / 3 skipped**; typecheck, lint, build, static export
and real desktop/mobile-emulated browser acceptance pass. JS runtime errors: 0.
Evidence and limitations: [PHASE18_EXIT_REVIEW.md](PHASE18_EXIT_REVIEW.md).

**Deferred, not PASS:** physical Android touch/zoom feel, real-device GPU frame
pacing and the user's consolidated visual-taste review. Phase 7 scale budget
remains unmet/deferred; broad UI appearance/visual identity redesign is
not included or automatically opened by this exit. Phase 19 was subsequently selected as #248; see the technical closeout below.


## Phase 19 — placement feedback and runtime Studio playtest (#248)

The 2026-10-08 scope is complete at its **technical gate** under the per-child evidence recorded in [PHASE19_EXIT_REVIEW.md](PHASE19_EXIT_REVIEW.md).

- **#249** placement feedback VFX/SFX/very small optional camera impulse was merged in PR #255, main `07886344e052d31da02ffadfd5ee08c25707912b`. This is a presentation-only, command-confirmed cue and does not alter authoritative simulation.
- **#250** construction-time decision is **NO-GO for Phase 19**. Placement remains immediate for paths and machinery; **#253** was closed **NOT PLANNED** under that decision. Never assume construction-job/save semantics are implemented.
- **#251** runtime Studio content packs merged in PR #256, main `2a42160e5bac9d00afeb753a2cd874596617276b`. Validated external schema-1 JSON can start new content-specific worlds in a prebuilt static web client, with exact SHA-256 pack identity and independent saves. No silent world hot-swap.
- **#252** Studio draft recovery and validated playtest export merged in PR #257, main `96ae445bf52183baf1e41544b554ef17baf2a65e`. The development-only Studio is not shipped in the player bundle.
- **#254** targeted Studio source-passthrough gap addressed via PR #258: editable finite surface deposits, invalid reference/geometry rejection and end-to-end new ore→deposit→processor content testing. The pre-merge code head `e9f9775c2e0eefd44e30acd8377fdc2ecacb1ed0` passed **577 tests / 3 skipped** plus typecheck, lint, build, and production browser acceptance.

See [RUNTIME_CONTENT_PACKS.md](RUNTIME_CONTENT_PACKS.md) and [STUDIO_PLAYTEST.md](STUDIO_PLAYTEST.md) for how to test authored content without rebuilding the web game.

Human review remains explicitly deferred for subjective SFX/VFX/impulse taste and fresh target-device frame pacing. The previously user-tested 60 FPS after PR #247 is not falsely extended as a new physical-device proof for Phase 19. Do not reopen the technical phase solely for these voluntary polish judgments, and do not start a new phase without agreement.

## Active Phase 20 — Smart Construction & Selective Dismantling (#261)

On 2026-10-09 the player explicitly selected **Phase 20** to improve on-map building and reconfiguration UX, **before** broad art/UI restyling. See the canonical [PHASE20_SCOPE.md](PHASE20_SCOPE.md), [ROADMAP.md](ROADMAP.md) and [epic #261](https://github.com/MohamedXIV/unknown-yield/issues/261).

**Live baseline on selection:** `main` `678f48f54731df3e69436f2d3d784b32ea0f3885`, Phase 19 complete and post-phase #259 compatibility repair merged. The user did **not** request immediate speculative implementation of another game phase. Phase 20 P0–P4 (**#262–#266**) are completed via PRs #274, #278, #280, #282 and #284 (merged 2026-10-09); #267–#269 remain pending their own runtime/test evidence. #266 was authored through GitHub tools and verified on exact-head Actions, not claimed to be a Codex VM run or an independent second-author review.

### Execution split (2026-10-09)

The user divided execution by VM needs. **ChatGPT/GitHub connector** owns Phase 20 design and acceptance decisions, the [P0 interaction contract](PHASE20_INTERACTION_CONTRACT.md), issue/PR sequencing and independent review. **Codex Cloud VM** owns TypeScript implementation and runnable tests, full checks and actual production-browser acceptance for #262–#269. The [collaboration/handoff](PHASE20_EXECUTION_SPLIT.md) is the canonical work split. Codex must be initiated by the user; creating docs or issues does not start its VM.

P0 is now **complete**: the design decisions and pure entity classifier/candidate selector with tests were delivered in [PR #274](https://github.com/MohamedXIV/unknown-yield/pull/274), merge commit `80a457b8edb0cbd21d62c43fc19772334d664ded`. Codex reported 586 tests passed / 3 skipped, plus typecheck and lint; standard `npm run build` failed within its VM on Next's TypeScript CLI output parsing, while an alternate TypeScript-API-path build passed and the Vercel preview was Ready. The original build problem is **not certified fixed**. The Phaser belt construction preview now shows per-cell add/reuse/blocked feedback from P1, the P2 L-corner/flow selector is shipped and **P3 liquid/gas gap reuse is also shipped**, but **no group dismantle UX has shipped**; preserve remaining issue gates.

### NEXT: #267 world-first four dismantle selection modes (P5), then #268–#269

1. **#262 DONE**: P0 contract + pure classifier/candidate selector and focused tests merged via #274. The selector is read-only, **not** authorization to bypass sim-core dismantle checks. On later P5 gesture integration, freeze the exact/family token at pointer-down, not via fresh anchor lookup after drag.
2. **#263 DONE**: Codex PR #278 merged as `93c583aba35981ee9c03c47fe68027068b84dbaa`. Pure authoritative add/reuse/block belt planning, new-only cost, full path atomicity, idempotent zero-op, conserved cargo, world preview and production-browser validation. Actions run `37894626448` fully passed including standard build and production-browser; VM standard build remained affected by subprocess output capture. Vercel's automatic PR deployment was **blocked**, not deployed. **#264 DONE**: flow-aware L corners, safe directed socket joins and mobile pinch regression fix via PR #280, squash `9d75209e5da74fc90a4834c1064df066d52ea4ab`. Actions `37920166990` passed 610 tests (3 skipped), typecheck, lint, standard build and full production-browser (native touch, ferrite delivery, save/load). Vercel separate status rate-limited, not a preview PASS. **#265 DONE**: safe add/reuse/blocked directed liquid/gas line planning, new-only costs, exact profile/orientation preservation, loaded fluid/gas conservation, atomic commit and line previews via PR #282, squash `afb0d49c8d21f1d8d90d85993d1bcf82f551feba`. Actions `37940072627` fully passed 625 tests (3 skipped), typecheck, lint, standard build and full production-browser incl. mobile touch, pipe/gas gaps and saved-byte no-ops. Vercel account rate limit remained separate, no preview PASS. **#266 NEXT**: authoritative material-safe batch dismantle.
3. **#266 DONE; #267 NEXT**: [PR #284](https://github.com/MohamedXIV/unknown-yield/pull/284) merged as `5a8e9905e6828726fdd62d759e077c9e700515f6`. Authoritative bounded `dismantleMany` command (256 unique IDs), single-target safeguards, deterministic child/port/factory order, explicit blocked/ignored/stale/duplicate reports, structural versus carried-cargo refund accounting and a pure preview. Exact-head Actions `37946886579` passed 644 tests/3 skipped, typecheck/lint/normal build/full browser regressions. This P4 backend was authored via GitHub connector, not Codex VM; no separate second-author review is claimed. **#267 NEXT** implements four player-facing modes (single, all, exact starting type, semantic family), explicit confirmation/cancel, touch/keyboard UX and production-browser proof. Vercel status remains a separate external caveat.
4. **#268** after #264 and #267: sample/pipette tool, preflight legends, safe path-corner choice, accessible keyboard/touch controls and clear cancellation.
5. **#269** after all: integrated production-browser and conservation gate, exact CI checks, `PHASE20_EXIT_REVIEW.md`, then child+epic closure.

**Non-negotiable:** a pre-existing **compatible** belt/pipe is reused for free and holes are filled; an **incompatible** or loaded segment may NOT be overwritten, auto-rotated, implicitly demolished or ignored as though connected. Construction and batch removal must use sim-core authoritative validation at execution, not stale Phaser/UI preview results. The existing material ledger, refund/empty-buffer rules, save compatibility, hidden recipes, reduced-motion accessibility and world-first camera are preserved. Group dismantle is explicit and never default. Exact type and family filters freeze their initial target identity at gesture start.

No blanket construction delays (#250 NO-GO), auto-routing around foreign obstacles, new blueprint/undo system, premature Rust/per-frame React, or Vercel redeploy. **Repo-specific CI update (2026-10-09):** this public project's user explicitly permits GitHub Actions freely. Run available CI on ready PRs and use `workflow_dispatch` where useful, including to verify the normal `npm run build` on a clean Ubuntu/Node 24 runner after a Codex VM-specific subprocess problem; do not treat a VM workaround as ordinary-build PASS. Avoid pointless duplicate runs, not necessary verification. Human physical-device FPS and subjective polish remain deferred, not technically certified.

**No broad performance rewrite:** Phase 7 recorded 32-factory 10ms budget remains unmet/deferred; preserve Phase 18 camera performance and verify integration without making untested 60 FPS claims.
