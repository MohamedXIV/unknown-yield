# Roadmap

## Roadmap philosophy

The project should move by **proof**, not by feature accumulation.

Each phase must answer a design or architecture question. Do not build a large engine foundation that is only theoretically useful.

The roadmap below is intentionally implementation-focused. Live execution is mirrored in GitHub Issue #2; `docs/EXECUTION.md` defines how humans and agents advance it.

## Phase 0 — Foundation (implemented)

The shared app, package boundaries, authored fixture and test/check scripts now run. The original foundation outline below records their intent; the approved spatial scope and its completed gate follow in Phase 1.

### Goal

Establish project contracts before implementation.

### Deliverables

- project docs;
- Next.js + TypeScript application skeleton;
- Phaser 4 game host;
- package boundary for pure TypeScript sim-core;
- initial content schema package;
- TinyBase proof;
- Zod validation proof;
- test runner;
- formatting/lint/typecheck baseline;
- one browser smoke path.

### Exit criteria

A trivial test fixture can:

1. load validated content;
2. create a simulation;
3. advance simulation;
4. render a representation in Phaser;
5. show a React inspector;
6. open a minimal Studio route;
7. run tests without starting a full browser for sim-core.

No production art required.

## Phase 1 — Spatial construction and automation (implemented)

### Question

Is discovering an unknown process and turning it into repeatable export production understandable and satisfying?

### Active scope and gate

[FIRST_PLAYABLE.md](FIRST_PLAYABLE.md) records the accepted slice: an authored world, free camera, player-built equipment, factories and ports, directional ground belts, construction economy, autonomous processing and observed discovery. No characters or robots.

A fresh expedition must build both the local construction and alien export chains without debug commands, earn expansion materials and fuel, diagnose a blocked line from the map, and save/restore running batches and belt cargo. Closing roofs must preserve detailed simulation. Domain tests, browser acceptance, TypeScript, lint and player-only production export form the implementation gate.

This is the continuing game foundation, not another disposable dashboard experiment. Visual polish, content breadth and enjoyment/balance testing remain follow-up development.

## Phase 1.5 — Physical inventory and flexible routing

**Live execution:** #3 ✓ → #14 ✓ → #4 ✓ → #5 ✓ → #6 ✓ → #7 ✓ → #8 ✓. **Phase 1.5 COMPLETE.** See GitHub Issue #2 and [EXECUTION.md](EXECUTION.md).

### Question

Can the accepted first-playable loop obey the long-term economic invariant without turning inventory into UI bookkeeping?

### Scope

- replace the explicit discard path with defined handling/disposal behavior;
- stop treating non-construction materials as magical global site inventory;
- introduce at least one physical storage form and terminal staging;
- preserve stopped-factory buffers;
- add split/reroute capability sufficient to redirect a shared feed between persistent factories;
- add conservation-ledger tests for extraction, transit, buffers, storage, transformation and export;
- before content/UI breadth grows, complete #14 so stable content IDs are independent from display/localized text.

### Exit criteria

No normal gameplay action can silently delete material. A player can stop one line, preserve its contents, redirect future input to another line, and later resume the original line. Save/load preserves the same accounting. New content introduced after this gate must not use player-facing strings or array positions as simulation/save identity.

## Phase 2 — Experimentation and discovery depth

**Epic:** GitHub Issue #9. **Phase 2 COMPLETE** through Issue #34 / PR #44.

**Live execution:** #30 ✓ → #31 ✓ → #32 ✓ → #33 ✓ → #34 ✓. **Phase 2 COMPLETE.**

### Question

Does expanding the discovery model create meaningful choices beyond the first slice?

### Scope

- richer experiment conditions and authored reaction matching;
- additional observations and knowledge relationships;
- unknown/hinted/confirmed presentation;
- additional harmless failures;
- one explainable hazardous failure;
- additional knowledge-based unlocks.

### Exit criteria

- the Phase 1 hidden-reaction boundary remains intact as conditions and content expand;
- an in-progress/failed experiment teaches useful evidence without exposing authored output truth early;
- the same input + operation can resolve to different deterministic authored results under explicit conditions;
- the single hazardous condition produces an explainable, persisted and recoverable consequence without bypassing material conservation;
- confirmed knowledge deterministically unlocks one industrial capability without XP/currency/tech-tree purchase state;
- save/load preserves partial evidence, confirmed knowledge, hazard state and capability availability;
- Phase 1.5 physical storage, routing, suspend/reroute/resume and conservative reclaim remain green;
- focused/domain tests, full baseline and the continuous browser acceptance path close Issue #34 before Phase 3 starts.

## Phase 3 — Factory as function

**Epic:** GitHub Issue #10. Phase 3 is complete through #50.

**Completed execution:** #45 ✓ → #46 ✓ → #47 ✓ → #48 ✓ → #49 ✓ → #50 ✓.

### Question

Does the black-box factory model reduce clutter while preserving meaningful design?

### Scope

- adjustable factory footprint;
- roof/exterior and interior edit presentation;
- input/output ports;
- internal machines;
- internal routing;
- factory throughput summary;
- stable-state detection;
- evidence-driven aggregate-execution decision;
- blueprint serialization.

### Exit criteria

A solved factory can be closed and understood from its external contract.

Editing it again restores full detailed truth for diagnosis.

Phase 3 measured the detailed runtime before introducing a second executor and recorded a NO-GO for aggregate execution at the current scale. The detailed simulation remains authoritative.

## Phase 4 — Content Studio v1

**Epic:** GitHub Issue #11. **Phase 4 COMPLETE** through #63 / PR #67.

### Question

Can content scale without code edits?

### Scope

- material editor;
- operation editor;
- machine capability editor;
- reaction editor;
- validation dashboard;
- reference browser;
- versioned content snapshot;
- simulation preview harness.

### Exit criteria

A new material + operation + processor + reaction chain, including its source/fallback presentation text, can be authored, validated, reverse-inspected, deterministically exported/imported and previewed through a fresh real simulation without a per-content sim-core code edit.

The Studio remains development-only and absent from the player production export.

Phase 4 intentionally stops before economy/site/storage/asset/general-purpose schema editors.

## Phase 5 — Progression and company systems

**Epic:** GitHub Issue #12. **ACTIVE.**

**Execution:** #69 → #70 → #71 → #72 → #73.

- #69 — authoritative Materials Exchange baseline;
- #70 — Corporate Orders and Special Directives;
- #71 — evidence-driven milestones, terminal handling, and fuel classes;
- #72 — corporate assistance, obligations, and recovery standing;
- #73 — end-to-end company progression exit review.

Do not skip the dependency order. Market/company state remains authoritative in sim-core and must preserve physical inventory plus hidden-knowledge boundaries.

### Scope

- milestone graph;
- unlock rules;
- terminal capability modules;
- Materials Exchange with demand + saturation;
- corporate orders and special directives;
- bailout/obligation loop;
- additional fuel classes;
- import/export handling classes.

### Exit criteria

Progression is driven by discoveries and demonstrated capability rather than generic XP grind.

A player who collapses basic fuel production can recover through the designed assistance path.

## Phase 6 — Logistics depth

### Possible scope

Only add systems justified by the game at this stage:

- pipes;
- pressure handling;
- vehicles;
- underground routes;
- elevated routes;
- specialized containment;
- rail-like bulk transport;
- drones/high-value cargo.

These should not all be assumed mandatory.

### Exit criteria

At least one later logistics technology solves a spatial or material-handling constraint the player has already experienced.

## Phase 7 — Scale and performance

### Work

- create benchmark worlds;
- profile sim-core;
- profile rendering;
- implement pooling/chunking/aggregation where justified;
- evaluate worker migration;
- evaluate packed data structures;
- evaluate Rust/WASM only if TypeScript remains the measured bottleneck after simpler fixes.

### Exit criteria

Target-scale benchmark scenarios meet agreed budgets on representative hardware.

## Phase 8 — Art production pipeline

Art validation begins earlier, but broad production should wait until the camera/asset contract is proven.

### Work

- fixed camera specification;
- blockout render template;
- AI generation guide;
- asset metadata format;
- atlas/spritesheet pipeline;
- machine animation workflow;
- damage/effect layers;
- consistency checklist.

### Exit criteria

Multiple assets created by the pipeline read as one coherent game and can be regenerated predictably.

## Deferred decisions

Do not prematurely lock:

- Tauri vs Electron vs another desktop wrapper;
- whether native desktop code is required at all;
- Rust/WASM;
- exact world size;
- exact number of fuel tiers in final game;
- final art style;
- multiplayer;
- combat;
- procedural world generation;
- huge vehicle populations;
- advanced rail systems.

## Anti-roadmap

The following should not be treated as progress during foundation unless required by the current phase:

- building generic engine abstractions;
- creating hundreds of materials;
- making a complete tech tree;
- polishing menus before the loop works;
- writing a custom ECS because the game might become large;
- porting to Rust without a benchmark;
- creating native packaging before web development needs it;
- generating large amounts of art before camera/pipeline validation.

## Near-term implementation order

The accepted implementation and evidence are summarized in [FIRST_PLAYABLE.md](FIRST_PLAYABLE.md) and [BROWSER_SMOKE.md](BROWSER_SMOKE.md). Continue from this foundation; do not rebuild the retired dashboard prototype.

Phase 1.5 is complete through Issue #8 / PR #29, Phase 2 through Issue #34 / PR #44, Phase 3 through Issue #50, and Phase 4 through Issue #63 / PR #67. Phase 5 / #12 is active; #69 is complete and #70 is the active implementation slice.
