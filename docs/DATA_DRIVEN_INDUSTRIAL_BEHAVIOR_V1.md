# Data-Driven Industrial Behavior v1 — approved design contract

**Status:** APPROVED DESIGN. P0 foundations PARTIALLY IMPLEMENTED via [PR #298](https://github.com/MohamedXIV/unknown-yield/pull/298) and [PR #299](https://github.com/MohamedXIV/unknown-yield/pull/299) through 2026-10-15; P0 remains OPEN; P1a [PR #300](https://github.com/MohamedXIV/unknown-yield/pull/300) and P1b [PR #301](https://github.com/MohamedXIV/unknown-yield/pull/301) are MERGED, but P1 is still OPEN; P2–P3 are NOT IMPLEMENTED. This contract describes the intended full system, not a claim that wear, wrecks, new reaction logic, or final art/audio exist. Each phase needs separate acceptance evidence.

**Project boundaries:** [Content Model](CONTENT_MODEL.md), [Simulation](SIMULATION.md), [Art Pipeline](ART_PIPELINE.md), [World Identity](WORLD_IDENTITY.md), [Phase 16 acceptance](PHASE16_EXIT_REVIEW.md), and [Decisions](DECISIONS.md) remain authoritative for existing behavior. Preserve the established Pure TS sim-core / TinyBase authoring / Zod validation / Phaser-React presentation division, hidden truth vs player knowledge, physical conservation and exact deterministic save/load.

## 1. Design intent

> Machines define capabilities. Materials define properties. Operating conditions describe the attempt. Simulation rules resolve throughput, yield, wear and consequences. Special discoveries are designer-authored without requiring a bespoke recipe for every ordinary failure.

> Every industrial outcome must have a physical cause, an observable consequence, and a learnable explanation.

This is **industrial plausibility**, not an unrestricted real-world physics/chemistry solver. Author a small set of meaningful, mutually coherent dimensions. The player should be free to attempt risky or inefficient operations where the machine can physically act, but should not be promised that any material works in any machine.

The player/company knowledge base cannot see designer-only outputs, hazard identities or hidden thresholds before they are observed. An experiment that fails or produces no valuable product can still yield bounded, useful evidence.

## 2. Separate four kinds of truth

1. **Immutable, versioned content:** material traits, operation semantics, machine capabilities/envelopes/modes, maintenance parts, authored transformations, presentation manifests and failures/observations. Localization names are presentation, not identity.
2. **Persisted runtime instance state:** installed modules/tooling, configured mode and settings, integrity, component wear, temperature/contamination if actually simulated, jam/incident state, active job/reservations, physical buffers and repair/recovery work.
3. **Derived effects:** compatible/strained/impossible diagnosis, effective rate, fuel consumption, batch yield, generated waste/byproducts, wear progression and deterministic failure consequences from the authoritative current state.
4. **Knowledge/presentation:** what is observable, measured or confirmed by the player, and state-specific art/audio chosen from a sanitized snapshot. Visual asset keys and SFX never decide gameplay behavior.

Explicitly distinguish **operating state** (idle, running, blocked, disabled, jammed, recovering, etc.) from **physical condition** (healthy, worn, damaged, wrecked/destroyed). Combinations such as `running + damaged + overheating` are allowed; avoid one mutually exclusive mega-enum.

## 3. Material characteristics and machine envelopes

Material properties are numeric traits or qualified tags with documented meaning, units/ranges where useful, and safe defaults for older content. Start narrow:
- **Mechanical:** hardness, abrasiveness, fracture/brittleness as separately meaningful dimensions.
- **Thermal/chemical/handling:** thermal response and stability, corrosiveness/reactivity, phase, necessary containment tags (reuse the existing containment system, don't fork it).
- **Observation:** per-property visibility/measurement precision separated from the full authored values.

Machine definitions own **capabilities**, not hard-coded material allowlists: supported operation types, available force/penetration, heat/pressure/cooling/containment limits, operating modes, supported inputs/outputs and physical energy/consumable requirements. Tooling/installed modules can modify operating envelopes in explicitly authored ways. This does **not** abolish true hard constraints: inability to penetrate, incompatible phase/port, absent containment, impossible operating temperature or insufficient power can genuinely prevent work.

Define a deterministic compatibility evaluation with distinct results:
- **Within nominal envelope:** regular throughput and wear.
- **Strained but operable:** slower batches or smaller yield, increased power/consumables and wear; bounded failure risk under specific conditions.
- **Beyond physical capability / unsafe admission:** blocked or refused with a meaningful, non-spoiling cause. No free experiment that consumes invisible matter or silently deletes cargo.

Material grade/level may be a **readable classification**, never the sole simulation gate. Example: a basic extractor might slowly penetrate a moderately harder deposit while wearing its bit; an extreme deposit remains impossible without greater capability. Hardness alone must not account for abrasiveness, brittleness or hazard behavior.

## 4. Reliability, physical failure and maintenance

**Wear**, **damage/integrity**, and **failure/incident** are separate. Wear is cumulative stress/service degradation, damage is retained physical loss of integrity or capacity, failure is an operational event (jam, overheat, broken tool, leak, containment incident). A machine may operate while worn/damaged where physically justified.

- Compute stress from actual load, material traits, mode, tooling and operating conditions. Resolve wear/damage using one documented rule family rather than machine-ID switches.
- Deterministic incident decisions depend on persistent state plus seed/time/job identity when chance is needed. Exact state + command history + seed reproduces exact incidents across save/reload/replay. Avoid arbitrary catastrophic RNG and content-defined outcomes with no attributable cause.
- Favor a **graded consequence ladder:** extra wear, lower yield, jam, tool break, contained spill/stranded physical byproduct, localized damage, disabled/wrecked machine; rare catastrophic propagation only when designed, bounded, explainable and protected by safety capabilities.
- Maintenance consumes physical replacement parts, fuel/energy or materials when applicable, with actual routing/reservations. Damage/wrecks yield explicitly modeled recoverable scrap/parts or conserved waste, not silent erasure. Existing Phase 11 hazards/incident locks and Phase 9 containment failures must be reused or migrated, not duplicated by parallel incident systems.
- Idle and paused machines preserve work-in-progress and materials as the current simulation already requires. No passive decay/spoilage is introduced without explicit authored behavior.
- The **Material Ledger must reconcile** every state transition: deposits, buffers, transit, escrow, conversion, waste, cleanup, repair, salvage and exported/discarded sinks. Production/reaction outputs require capacity or explicit physical overflow/incident locations; no virtual global stash.

## 5. Outcomes and experiments — hybrid resolution

Use three layers, evaluated under explicit deterministic precedence:
1. **General operation behavior:** attempts may fail physically, leave the input unchanged, create an already-authored generic waste/residue where conservation permits, produce measured stress or diagnostic evidence. No arbitrary novel substance is invented merely because a tuple is not authored.
2. **Hidden authored transformations:** exact or constrained matching on one/multiple input materials and amounts, operation, condition ranges, catalyst, process context and potentially history, with authored outputs/byproducts and observations. Specificity/priority must be unambiguous and validated; no order-dependent first-match surprises.
3. **Cross-cutting consequences:** pressure, instability, abrasion, corrosion, overload and safety interactions can modify yield or cause an incident even when a valuable transformation succeeds. Incident effects and transformation material accounting are separate and reconciled.

A transformation may have **multiple conserved physical outputs**, byproducts, waste, quality/purity/stability metadata and condition-dependent yield; only add properties that alter an actual gameplay decision. If mass units differ from current integer `units`, define a consistent accounting basis and conversion contract first; never claim rigorous physical mass conservation when using arbitrary unit counts.

Do not replace the authored alien discovery graph with random recipe generation. Designers still curate interesting materials and spectacular/absurd reactions; general evaluators handle ordinary strain/failure so every combinatorial non-recipe need not be individually scripted.

New matcher semantics must migrate deliberately from today's exact `operation + input + optional processConditionId` contract. Preserve current tuples and saves until a proven migration exists. Hidden outcomes remain inaccessible via player UI, public snapshots, company market listings, inspector tooltips, logs and untrusted content-preview surfaces.

## 6. Data-driven machine presentation

Each machine may reference a **validated presentation manifest**:
- identity: logo/serial/decal, icon and minimap representation (identity art is optional);
- base sprite and shadow, optional moving components/animation atlases, emission/heat, material tint and dirt/wear/damage masks;
- visual variants for operational state, physical condition, contamination/overheat and persistent wreck; precedence + fallback when a variant is missing;
- audio events: startup/stop, operation loop, load/strain layer, jam/break/impact, repair/restart and aftermath; optional values for pitch/rate/attenuation, audio grouping, priorities and virtualization.

The art direction stays **fixed-angle 2D functional Dieselpunk**, with 3D blockouts used only for coherent asset production. The same machine must remain recognizable through idle, working, damaged, wrecked/destroyed appearances.

Visual/audio presentation is **derived** from the sim snapshot/events; no render timing or missing SFX may change sim results. Rate-limit/virtualize repeated loops for large sites; expose key states via sound plus shape/text/animation, not color alone. Honor accessibility/reduced-motion preferences. The current fixed art registry is not yet an arbitrary runtime content-pack system: any pack/manifest loading is an implementation milestone, not a preexisting capability.

## 7. Suggested declarative definitions (conceptual, not current TS API)

```ts
type MachineDefinition = {
  id: string;
  capabilities: CapabilityProfile[];
  operatingModes: OperatingMode[];
  requirements: ResourceRequirement[];
  envelope: OperatingEnvelope;
  reliability: ReliabilityProfile;
  presentationId?: string;
};

type MaterialDefinition = {
  id: string;
  traits: MechanicalAndChemicalTraits;
  handling: HandlingProfile;
  discovery: DiscoveryPresentation;
};

type TransformationDefinition = {
  id: string;
  matcher: InputsOperationConditions;
  outcomes: ConservedOutcome[];
  observations: KnowledgeEvidence[];
};
```

Rules are named, typed, bounded, validated **declarative evaluators**; no arbitrary executable scripts or callbacks inside JSON, no `if (machineId === 'extractor-mk1')` branches, no generic ECS or chemistry engine. TinyBase is for authoring and versioned bundles, never per-frame simulation state. Zod plus semantic validators check missing assets/references, impossible operating modes, reachable processing paths, ambiguous matches, repair loops, conservation contracts and unintended hidden-content leakage.

## 8. Content Studio requirements

- Edit machine operations, physical envelope, modes, fuel/consumables, tool/maintenance profiles, wear/failure rules and presentation/audio mapping.
- Edit material mechanical/chemical traits, visibility, phase and handling.
- Author multi-output transformations, nonvaluable results and conditional consequences without editing sim-core for each content row.
- Reverse references and preview real isolated simulation examples: nominal, strained, impossible, hazard and repaired outcomes.
- Validation shows precise errors and warnings, not merely successful JSON parsing; export/import versioned packs atomically.
- Authoring Studio and its complete hidden recipe data are **development-only**, never bundled in player-facing production routes.

## 9. Delivery order and acceptance gates

### P0 — Machine Identity and Presentation
**Target:** state-driven art/audio manifests, operational-vs-condition resolver, safe fallbacks, representative machine art states, trustworthy inspector cues. **Acceptance:** `idle`, `running`, `damaged`, `wrecked` are visually/audio-distinguishable from correct snapshots; no missing assets, spoiler data, renderer-driven simulation or per-machine unbounded audio loops. Coordinate non-conflictingly with the existing first Dieselpunk extractor art PR.

### P1 — Material Compatibility and Operating Envelopes
**Target:** basic extractor + three authored deposits, two operating modes, property-dependent throughput/fuel/tool stress, hard impossibility and soft-overload behavior. **Acceptance:** a fourth material can be authored and changes behavior by its properties **without sim-core code edits**; difficulty is not controlled by a single tier number; diagnostics remain non-spoiling; old exact reaction behavior survives migration.

### P2 — Reliability and Failure Lifecycle
**Target:** persistent wear/integrity and distinct failure states, deterministic risk/incident resolution, recoverable jam/broken bit/wreck, physical repair/salvage, snapshot and persistence support. **Acceptance:** reproducible same-seed results after save/load, conservation across every failure/repair/salvage path, repeatable observation/learning and no unbounded arbitrary catastrophic failures.

### P3 — Rich Outcomes and Studio Authoring
**Target:** composable multi-input/multi-output transformations with byproducts and condition-dependent results, generic physically meaningful non-recipe handling, complete Studio forms/previews/reference checks. **Acceptance:** a novel authored experiment chain and a non-authored stressed case can both be added, validated and played with no per-content sim-core edits; no output/hidden hazard spoilers; material-ledger audit holds.

## 10. Non-goals and evidence boundaries

Not approved: full chemistry/thermodynamics solver, arbitrary emergent substance synthesis, runtime mod scripting, a new state-management stack, Rust/WASM/ECS rewrite, rebuild of the whole 2D asset library, free background material disposal, chance-based arbitrary factory destruction, or replacing existing authored recipes overnight.

No runtime PR, content migration, save migration, test result, browser acceptance or art asset is implied by acceptance of **this design**. A phase is only **implemented** after code, versioning, tests, integration evidence and actual player-visible behavior land.


## Implementation checkpoint — 2026-10-13

[P0 foundational PR #298](https://github.com/MohamedXIV/unknown-yield/pull/298) merged at `690951c3d9d17b2b2f5acf2efea9e62bc9400536` after CI run [#38418283199](https://github.com/MohamedXIV/unknown-yield/actions/runs/38418283199) passed tests, typecheck, lint, build and production-browser acceptance. Introduced an optional versioned machine presentation manifest on content definitions, authored extractor startup sound and status colors, public-state presentation resolver, physical-condition type boundary with safe fallback, Studio manifest round-trips, and focused regressions. The **current sim does not yet track true wear, damage or wreck state**; the display does not invent those states. The first Dieselpunk extractor art [PR #291](https://github.com/MohamedXIV/unknown-yield/pull/291) remains open and explicitly awaits visual review. P0 also still needs validated full state art/logo and bounded operating-loop audio before its own exit can be claimed. Vercel's independent build rate-limit check is not a runtime test result.

### P0 continuation — viewport-bounded operating audio (2026-10-15)

Implementation proposal on branch `feat/293-ambient-machine-audio`: `audio.runningLoop` is an optional closed enum in the authored presentation manifest (initial `diesel-drive`, `rotary-drive`). Only the real `processing` status may sustain a loop. The audio planner deterministically chooses at most **3** audible machines that are physically on screen and not hidden inside closed factories; nearest machines win and machine IDs break ties. New WebAudio oscillators are not allocated on every tick: voices are reused until the active selection changes, with a limited release fade.

The planner runs at most about four times per second during camera navigation. The sound engine does not open an `AudioContext` until a player pointer/keyboard gesture. Pause, document visibility and the existing sound-effects preference silence operating voices immediately; one-shot alert semantics remain unchanged. The audio engine reads sanitized public state only and never touches sim inventory, jobs or time.

This does **not** supply approved real machinery recordings, multi-layer engine SFX, worn/damaged/wrecked physical states, or a new art pack. Do not mark P0 complete based only on this audio slice or substitute temporary procedural audio for final approved assets.


**Audio implementation checkpoint, 2026-10-15:** [PR #299](https://github.com/MohamedXIV/unknown-yield/pull/299) merged at `979b490df5f6ab7b23bc7d8f7f6ba3d22318b494`; [CI #38690580623](https://github.com/MohamedXIV/unknown-yield/actions/runs/38690580623) passed 661 tests/3 skipped, typecheck, lint, build and 2 browser cases. Bounded on-screen running-loop selection and pause/mute/visibility handling now exist. Real production-quality audio, full machine states/art and physical damage still do not. The earlier draft paragraph describing proposed audio should now be read as implemented technical behavior only.

## P1a slice — mechanic traits and real extraction envelope (in implementation)

Partially implements [#294](https://github.com/MohamedXIV/unknown-yield/issues/294) and does **not** close P1. Content v15 adds optional mechanical material traits (hardness/abrasiveness/brittleness, bounded ordinal 0–10) and an optional mineral-extractor load envelope. For a profiled mineral deposit, `load = max(0, 2 * hardness + abrasiveness - brittleness)`; load at/below `nominalLoad` works at base time/fuel; load above nominal but at/below `maximumLoad` deterministically costs additional fuel and ticks using authored penalty coefficients; load above maximum is blocked with `material-too-hard`. A material class/grade/ID is **never** an input to the formula. Absolute numbers are balancing proxies, **not** a physical hardness unit. This does not implement actual wear/damage or selective operating modes yet.

**Provisional fixture tuning:** basic extractor nominal load = 6, hard limit = 10, extra duration = 2500 basis points per excessive load, extra fuel = 1 unit per excess load. Ferrite traits (2,1,2) yield load 3 / 20 ticks / 1 fuel. Veined raw traits (3,2,1) yield load 7 / 25 ticks / 2 fuel. Other machines/materials without an authored profile retain legacy extraction throughput and fuel. Actual start, published snapshot/inspector, fuel admission and completion all derive from one pure TS evaluator. On mechanical impossibility, no fuel/cargo is consumed; no recipe truth is exposed.

**Versioning (implemented in PR #300):** fixture content version bumps `world-01-v14` → `world-01-v15`; old saves pinned to the prior content version are not silently replayed under new mechanics. P1a did not change the serialized save object shape. Content Studio round-trips the two optional JSON profiles. The next P1 slices still require selectable operating modes, three distinct real deposit examples, wear/stress linkage to P2, and additional test/UX gates; report CI and browser results separately once known.


**P1a merge checkpoint (2026-10-15):** [PR #300](https://github.com/MohamedXIV/unknown-yield/pull/300) squash-merged as `de514b07e6c87e58ab909d11de397be14625fee3`; [CI #38781799351](https://github.com/MohamedXIV/unknown-yield/actions/runs/38781799351) PASS: 666 tests, 3 skipped, typecheck, lint, build, 2 production-browser cases, no browser runtime errors. The preceding P1a implementation section is current implementation evidence, not just a proposal. P1 remains OPEN for modes and additional live material/deposit cases. Content v15 invalidates v14 saves intentionally.

## P1b — selectable operating modes (merged)

Two **authored, validated mineral-extractor modes** now drive the pure TS P1a envelope: `steady` retains the previous baseline, while `force` grants +2 nominal and +2 maximum mechanical load, uses 85% of derived batch ticks (ceiling once), and incurs +2 additional physical operating fuel per batch. These are **provisional balance values**, not real pressure units or physical wear. The same trait-driven evaluator is used for start, preview diagnosis, fuel check, snapshot and active-batch save validation; the current batch cannot be reconfigured after its fuel and source ore have been reserved. An otherwise impossible load may become strained/operable under force; an extreme load remains impossible. No P2 wear or incidents invented.

`setOperatingMode(machineId, modeId)` accepts only authored IDs and only when no job is running; both command and dry-run preview have identical validation. The choice lives in the machine's persisted authoritative state and appears as a localized selector in the world inspector, rather than client local storage or a fake UI mode. Save schema v28 records `operatingModeId`; schema 27 automatically resumes with the first authored default mode. Built-in content is now v16 so earlier v15 expeditions are **not silently reinterpreted**, despite unchanged physical inventories. TinyBase stores operatingModes as a bounded JSON array.

P1b is not the P1 exit gate: representative third live mineral example, and later P2 actual stress/wear lifecycle still require further evidence.


**P1b acceptance checkpoint (2026-10-15):** [PR #301](https://github.com/MohamedXIV/unknown-yield/pull/301) squash `94bf74e8ad81b7a31ff21a0c973fb426abfd754c` verified by [CI #38789142702](https://github.com/MohamedXIV/unknown-yield/actions/runs/38789142702): **670 passed / 3 skipped**, typecheck, lint, build and two production-browser cases (zero runtime errors). This confirms implemented simulation/UI/save mode selection, not the third-distinct-deposit P1 gate, accumulated stress/wear or user-approved art.

## P1c — authored third reference mineral (implementation candidate)

Instead of adding an industrially dead-end material, the third mechanical reference is the **existing Catalytic Stone** (`catalyst`), whose recipes, company uses, late-game resonance-probed seam and material handling are already authored. It now has provisional mechanical traits `hardness=6, abrasiveness=4, brittleness=1`, so `load = 2×6 + 4 − 1 = 15`: beyond starter Extractor maximum 10 in steady and 12 in high-pressure mode. The initial-world `catalyst-outcrop` at (5,49), 5×5 tiles, **90 preserved units**, is a small visible teaser and an honest physical hard-block demonstration; merely placing an extractor costs build plates, not hidden ore or fuel. Existing larger `catalyst-seam-a` remains **hidden** behind the authored resonance probe and depth protection. The new visible outcrop doesn't bypass actual harvesting progression because both starter modes cannot penetrate it.

The evidence/unlock-gated **Deep Extractor** receives its first mechanical envelope, nominal 14, maximum 18, excess duration +20% per load, no excess imported-fuel surcharge (all provisional). Catalytic Stone load 15 is strained but possible at 36 ticks and 1 unit of imported advanced propellant for a deep machine, vs 30 ticks / 1 propellant on raw. Factory-built catalyst conversion and company markets remain untouched; no synthetic new recipes. Tests assert 3 distinct live materials/deposits, zero ore/fuel debit for both hard-blocked modes, real survey knowledge gating, deep extractor unlock and special-fuel delivery, saved batch replay and physical ledger audit. This is a bounded P1 completion candidate; verify exact-head CI and integration gates before closing #294. Actual machine wear, tooling consumption, damage and repair remain in P2 and are NOT implemented.

**Content compatibility:** fixture `world-01-v16` → `world-01-v17` because new visible deposit stocks and changed deep-machine operating rules alter authoritative initial material totals and throughput. Save schema remains v28; v16 content saves are rejected rather than merged into incompatible world inventories.
