# Roadmap

## Roadmap philosophy

The project should move by **proof**, not by feature accumulation.

Each phase must answer a design or architecture question. Do not build a large engine foundation that is only theoretically useful.

The roadmap below is intentionally implementation-focused. Historical execution is preserved in closed GitHub Issue #2; `docs/EXECUTION.md` defines how humans and agents advance it.

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

**Epic:** GitHub Issue #12. **Phase 5 COMPLETE** through #73 / PR #79.

**Completed execution:** #69 ✓ → #70 ✓ → #71 ✓ → #72 ✓ → #73 ✓.

- #69 — authoritative Materials Exchange baseline — **COMPLETE** via PR #74;
- #70 — Corporate Orders and Special Directives — **COMPLETE** via PR #76;
- #71 — evidence-driven milestones, terminal handling, and fuel classes — **COMPLETE** via PR #77;
- #72 — corporate assistance, obligations, and recovery standing — **COMPLETE** via PR #78;
- #73 — end-to-end company progression exit review — **COMPLETE** via PR #79 / `dcbe1a567cc26ab150f13e159d35bf50030ee570`.

Phase 5 closed with the integrated gate accepted. Market/company state remains authoritative in sim-core and preserves physical inventory plus hidden-knowledge boundaries. Phase 6 was not started during that closeout; its subsequently approved scope is recorded below.

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

**Epic:** #80 — readable belts and controlled ground junctions. **COMPLETE** through #84 / PR #89.

**Execution:** #81 ✓ → #82 ✓ → #83 ✓ → #84 ✓. Integrated evidence: [PHASE6_EXIT_REVIEW.md](PHASE6_EXIT_REVIEW.md). #81 evidence: [PHASE6_BELT_ACCEPTANCE.md](PHASE6_BELT_ACCEPTANCE.md). #82 evidence: [PHASE6_T_ACCEPTANCE.md](PHASE6_T_ACCEPTANCE.md). #83 evidence: [PHASE6_CROSSING_ACCEPTANCE.md](PHASE6_CROSSING_ACCEPTANCE.md).

### Question

Can readable bends and controlled ground junctions improve spatial factory routing while preserving physical cargo and understandable backpressure?

### Approved scope

- #81 — truthful L turns and visible manual diverter paths, preserving existing routing;
- #82 — directed T splitters and fair mergers, alternating successful transfers;
- #83 — a controlled `+` crossing with two independent directed routes, simulation-timed admission windows and clearance before switching axes;
- #84 — a continuous-world integrated exit review.

[PHASE6_JUNCTIONS.md](PHASE6_JUNCTIONS.md) defines exact routing, blocked-arm policies, persistence, visuals, content and acceptance. D-033 records the accepted direction. Shape alone is not the behavior contract.

Underground/elevated routes, pipes, pressure, vehicles, specialized containment, rail and drones remain deferred possibilities. The user explicitly selected ground-belt improvements before underground transport; none of those deferred systems are prerequisites or mandatory Phase 6 work.

### Exit criteria

In one persistent playable world, a player can read actual L/diverter routes, fairly split/merge flow through T junctions, and cross two distinct material streams through a controlled `+` without changing destinations or losing cargo. Blockage, phase clearance, suspend/reroute/resume and save/load preserve deterministic physical state. Domain/content/persistence/blueprint/throughput regressions, the full baseline and real browser acceptance close #84 before #80 is complete.

## Phase 7 — Scale and performance

**Phase 7 DEFERRED, not complete; baseline COMPLETE:** #90 through PR #91 — single-world simulation/snapshot baseline. [Approved measurement contract](PHASE7_BASELINE.md). #92 profiling COMPLETE through PR #93: [step-tail profiling and approved reference budget](PHASE7_PROFILING.md); the 32-factory budget FAILS and remains fixed. Browser/representative-device budgets and any optimization follow measured evidence.

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

## Phase 9 — Material-state logistics and containment

**Epic:** GitHub Issue #100. **COMPLETE** through #113 / PR #167, merged to `main` at `f8d3ac03aba006a0320b51c840441d2564f8a8b2`. Integrated evidence: [PHASE9_EXIT_REVIEW.md](PHASE9_EXIT_REVIEW.md).

**Completed execution:** #108 ✓ → #109 ✓ → #110 ✓ → #111 ✓ → #112 ✓ → #113 ✓.

### Question

Do liquids, gases and hazardous handling classes create meaningfully different factory layouts without turning the game into a fluid-dynamics simulator?

### Scope

- physical liquid storage, pumps and directed pipe networks;
- pressurized gas storage and pressure-line/cylinder handling;
- authored transport/containment compatibility for corrosive, hot, atmosphere-sensitive or otherwise hazardous materials;
- process chains that intentionally move material between solid, liquid, slurry and gas states;
- terminal staging and handling that respects those physical classes;
- exact conservation through tanks, pipes, machine buffers and terminal staging;
- one recoverable handling failure caused by an understandable incompatibility.

The phase does **not** introduce real fluid dynamics, per-particle liquids, magical global fluid inventory or a generic “pipe everything” abstraction.

### Exit criteria

One persistent playable chain crosses at least two materially different handling states from extraction/processing to terminal export. Blocking, rerouting, suspension and save/load preserve quantity and destination truth. The player can diagnose why a material cannot enter an incompatible route or terminal module from world/UI evidence without seeing hidden reaction definitions.

## Phase 10 — Industrial exploration and deep extraction

**Epic:** GitHub Issue #101. **ACTIVE GAMEPLAY PHASE.** Children #114–#119; #114 is the first unblocked implementation issue.

### Question

Can industry itself reveal the next layer of the world, without turning Unknown Yield into an adventure/exploration game?

### Scope

- scanner/probe capabilities with deliberately incomplete observations;
- deposits that are unknown until the required capability exists;
- depth as an authored extraction constraint;
- at least one deep-extraction machine or operating mode;
- one non-surface resource source such as atmospheric collection or another industrially sensed source;
- manufactured products that become new exploration/extraction capabilities;
- discoveries feeding the existing knowledge/milestone model rather than generic XP.

### Exit criteria

The player manufactures an industrial capability, uses it to reveal a previously unavailable resource opportunity, establishes extraction, and turns that resource into a new useful material/product chain. The company/player knowledge boundary remains truthful: undiscovered authored deposits and outputs are not leaked through UI, saves or market state.

## Phase 11 — Hazardous industrial science and recovery

**Epic:** GitHub Issue #102. Planned after Phase 10. Children #120–#125.

### Question

Can failure become useful industrial knowledge and an emergent story rather than opaque punishment?

### Scope

- deterministic authored hazard classes such as thermal runaway, pressure expansion, corrosion, instability and contamination;
- a consequence spectrum from lost batch/jam through leak, machine damage and bounded local factory damage;
- persisted waste, damaged equipment and contaminated/blocked state where applicable;
- observation text that explains what physically happened rather than reporting “recipe failed”;
- knowledge gained from hazardous outcomes;
- safety/containment capabilities unlocked by demonstrated evidence;
- repair, cleanup, reclaim or safe-disposal flows using existing physical-inventory rules.

Hazards must be attributable to explicit state/conditions. This phase does not add arbitrary catastrophic RNG or routine campaign-ending accidents.

### Exit criteria

A hazardous experiment can be reproduced under the same authored conditions, teaches actionable evidence, leaves conservative physical consequences, survives save/load, and can be recovered from through normal industrial play. A later safer setup can prevent or contain the same class of failure for a reason the player can understand.

## Phase 12 — Factory lifecycle and district reconfiguration

**Epic:** GitHub Issue #103. Planned after Phase 11. Children #126–#131.

### Question

Can solved factories behave like persistent capital that the player adapts, expands and relocates instead of disposable recipes that must be rebuilt?

### Scope

- controlled post-build factory expansion/reshape where surrounding space permits;
- relocation of an intact factory while preserving its internal layout, buffers and machine state;
- explicit disconnection/reconnection of external logistics during relocation;
- relocation cost and downtime as industrial constraints rather than content deletion;
- stronger district-level routing controls for switching persistent production lines;
- storage geography as part of reconfiguration rather than global inventory;
- evaluate factory-as-module composition for larger industrial complexes only after relocation/expansion proves useful.

### Exit criteria

A populated factory can be suspended, moved or expanded under defined rules, reconnected, and resumed without material loss or internal-layout reconstruction. At least two persistent production lines can be reallocated around existing storage/logistics without destructive teardown. Conservation and deterministic restore remain exact.

## Phase 13 — Terminal and off-world exchange depth

**Epic:** GitHub Issue #104. Planned after Phase 12. Children #132–#138.

### Question

Can the company/terminal layer create strategic industrial decisions without turning the game into a dashboard market simulator?

### Scope

Build on the accepted Phase 5 baseline rather than replacing it:

- cargo manifests and meaningful shipment capacity/handling dimensions;
- two-way terminal logistics for imports that cannot yet be produced locally;
- deeper use of dry, liquid, gas, cryogenic, hazardous and secure handling modules as actual logistics gates;
- market memory/saturation that remains slow enough for industrial planning;
- discovery-created market listings and authored demand shocks after classification;
- broader Corporate Orders and Special Directives, including property/quality/experimental requests;
- strategic physical stockpiles that can respond to later demand without magical inventory movement.

### Exit criteria

A newly characterized material can create a new company opportunity; the player can physically stage a shipment under handling/capacity constraints, choose what to send, receive a specialized import/reward, and later benefit from or react to demand change using persistent factories and stock. No market state may reference undiscovered material truth.

## Phase 14 — Layered and long-distance logistics

**Epic:** GitHub Issue #105. Planned after Phase 13. Children #139–#144.

### Question

Can late-game logistics solve real space, congestion and distance problems by changing topology rather than merely increasing belt speed?

### Scope

Introduce only modes justified by demonstrated map problems, in a measured order:

- underground solid/liquid routes with explicit entrances/exits;
- elevated gantries, pipe racks or utility routes;
- utility tunnels where they meaningfully consolidate infrastructure;
- one flexible long-distance freight mode (vehicle or equivalent) if distance warrants it;
- one high-throughput bulk mode (rail/monorail equivalent) only if scale warrants it;
- one low-mass/high-value mode (drone or equivalent) only if its cargo niche exists;
- routing, loading, storage and terminal integration for every accepted mode.

This phase is not permission to implement every transport idea at once. Each added mode must own a distinct industrial use-case.

### Exit criteria

At least two accepted advanced modes solve different measured layout/throughput problems in the same persistent world, with understandable loading/routing constraints and exact cargo persistence. The player gains spatial freedom or freight capability, not a cosmetic Mk2 replacement.

## Phase 15 — Content scale and expedition arc

**Epic:** GitHub Issue #106. Planned after Phase 14. Children #145–#152.

### Question

Can the proven systems sustain a coherent expedition from primitive extraction to genuinely strange late-game industry?

### Scope

- multiple authored material families whose properties create different processing/logistics decisions;
- a broader but still partially hidden knowledge graph;
- meaningful chains from basic to advanced and research-grade/exotic company fuel;
- company technology that can recursively depend on materials first discovered by the player;
- additional terminal modules, directives, hazards and transport requirements using already-proven systems;
- products that alternate between export value and new local capability;
- pacing/balance passes that avoid grind milestones and one-product dominant strategies;
- Content Studio expansion only where repeated authoring pain proves a missing tool.

### Exit criteria

A fresh expedition can progress through several qualitatively different industrial eras without debug intervention or repetitive XP grind: discover -> experiment -> industrialize -> export -> unlock deeper capability. At least one late capability depends on a material/application that did not exist in company knowledge at expedition start.

## Phase 16 — Production vertical slice

**Epic:** GitHub Issue #107. Planned after Phase 15. Children #153–#161.

### Question

Do the full systems, presentation and pacing now feel like one coherent game rather than a collection of accepted technical proofs?

### Scope

- integrate the Phase 8 art pipeline into representative final-quality world assets;
- audio/FX feedback for machines, logistics, discovery and hazards;
- onboarding that teaches observation and experimentation without revealing recipes;
- production-quality inspectors, notebook/knowledge presentation and terminal interaction;
- representative content/balance tuning;
- save compatibility/migration hardening;
- browser/device performance validation at the actual slice scale;
- structured playtesting focused on comprehension, experimentation, reconfiguration and economic motivation.

### Exit criteria

A representative production-quality expedition slice can be played from landing through an advanced industrial objective without debug tools. Players can understand what happened when a process succeeds, fails or blocks; can reconfigure rather than rebuild solved industry; and can explain the core loop as **Discover -> Experiment -> Industrialize -> Export**. The slice meets its agreed browser/device budgets and visual/audio consistency bar.

### Post-foundation gameplay order

The recommended gameplay sequence is:

`Phase 9 -> Phase 10 -> Phase 11 -> Phase 12 -> Phase 13 -> Phase 14 -> Phase 15 -> Phase 16`

Phase 7 remains a deferred evidence gate, not a prerequisite for ordinary gameplay work unless actual scale/browser evidence makes it one. Phase 8 is a production pipeline track that can run in parallel where a gameplay phase needs representative assets; broad art production still waits for proven asset/camera contracts.

The sequence is intentionally dependency-aware: first make material states physically meaningful, then let industry reveal deeper resources, then deepen hazards/recovery, then make factories easier to adapt, then expand company/terminal strategy, then add advanced infrastructure only where the larger world proves a need. Content breadth comes after these systems are stable, and the production vertical slice integrates them rather than inventing another foundation.

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

Phase 1.5 is complete through Issue #8 / PR #29, Phase 2 through Issue #34 / PR #44, Phase 3 through Issue #50, Phase 4 through Issue #63 / PR #67, and Phase 5 through Issue #73 / PR #79 (`dcbe1a567cc26ab150f13e159d35bf50030ee570`). Phase 6 / #80 is complete through #84 / PR #89. Phase 7 baseline #90 is complete through PR #91; #92 profiling is complete through PR #93. The approved 32-factory budget is unmet; #94 is complete through PR #95, sharing indexing within each observation with dynamic recurrence and correctness gates preserved; see PHASE7_TOPOLOGY_OPTIMIZATION.md.

Completed optimization: #94 through PR #95, shared per-observation topology indexing. See [measurement and verification](PHASE7_TOPOLOGY_OPTIMIZATION.md). 32-factory joint p95: 31.0466ms flowing / 24.4467ms backpressured, both above the fixed 10ms budget. Follow-up #96 is complete through PR #97; the current measurement below supersedes these #94 results.

Completed optimization: #96 through PR #97, fresh local membership reused within observation. See [measurement and verification](PHASE7_MEMBERSHIP_OPTIMIZATION.md). 32-factory joint p95: 24.5777ms flowing / 19.6748ms backpressured, both above fixed 10ms. Fresh parent control: 33.0945 / 27.9175ms. Phase 7 remains open; assess remaining membership/signature and snapshot cloning costs under a separate approved scope.

## Execution reset — 2026-10-02

User chose to return to gameplay after #96 / PR #97 rather than continue snapshot optimization now. #2 is closed as a retired execution index, not evidence that every roadmap gate passed. #75 is closed as not planned: Vercel repair/deployment is outside the current scope, not fixed. Completed gameplay phases 1.5–6 and accepted Phase 7 measurements/optimizations remain documented.

Phase 7 performance work is deferred. The fixed 32-factory joint p95 <=10ms gate remains unmet (24.5777ms flowing / 19.6748ms backpressured); browser/device gates remain unverified. Keep existing evidence and correctness boundaries. Revisit when an actual browser-playability problem or an agreed feature scale requirement justifies it. Old NEXT recommendations in profiling docs are historical candidates, not active assignments.

Roadmap expansion approved on 2026-10-02: Phases 9–16 now capture the major post-foundation gameplay discussed but not represented by the earlier execution phases. Canonical epics #100–#107 and children #108–#161 form the canonical queue. Phase 9 / #100 is active; #108 liquid logistics has passed acceptance and #109 is next after its merge; later phases remain planned dependency-ordered work, not authorization to stack speculative implementations. Phase 7 remains deferred and Phase 8 remains a parallel art-production track.
