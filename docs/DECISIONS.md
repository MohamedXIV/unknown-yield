# Decision Log

This document records project decisions that should not be casually reopened by future implementation work. Decisions can change, but changes should be explicit and supported by new evidence.

## D-001 — Runtime presentation is 2D

**Status:** accepted

Unknown Yield targets a fixed top-down / three-quarter 2D presentation.

3D runtime rendering is not the current direction.

### Reason

A full 3D industrial game substantially raises art, lighting, material, asset, environment, polish, and production expectations. The project gains more from controlled 2D art and data/simulation depth.

### Consequence

Do not introduce a 3D runtime engine because a single mechanic seems easier to depict in 3D.

---

## D-002 — 3D blockouts are part of the 2D art workflow

**Status:** accepted

Simple 3D models, animation, camera renders, and render passes may be used to guide AI-assisted sprite generation.

### Reason

This provides consistent perspective, silhouette, part placement, and animation while keeping runtime assets 2D.

### Consequence

3D authoring tools are production tools, not evidence that the runtime should become 3D.

---

## D-003 — Next.js + React are the application/tooling shell

**Status:** accepted

Next.js is allowed and encouraged where it provides application/UI/tooling value.

### Responsibilities

- HUD;
- inspectors;
- terminal UI;
- knowledge UI;
- Content Studio;
- debug tooling.

### Consequence

Next.js does not own world simulation.

---

## D-004 — Phaser 4 owns world rendering and interaction

**Status:** accepted

Phaser is the primary world renderer/input layer.

### Consequence

Do not put authoritative production logic inside Phaser GameObjects or scene update methods.

---

## D-005 — Simulation begins in pure TypeScript

**Status:** accepted

The authoritative gameplay simulation starts as a renderer-independent TypeScript package.

### Reason

- fastest iteration;
- easy testing;
- shared language across project;
- good AI/tool support;
- sufficient performance until proven otherwise.

### Consequence

No Rust rewrite at foundation stage.

---

## D-006 — Rust/WASM is a measured optimization path

**Status:** accepted

Rust may be introduced later for proven bottlenecks.

### Gate

A reproducible benchmark must show an important budget failure after simpler TypeScript/data-layout/update-frequency improvements.

### Consequence

Keep the simulation API coarse enough that implementation can move without changing gameplay clients.

---

## D-007 — TinyBase is content data, not default per-frame world state

**Status:** accepted

TinyBase drives the data-centric Content Studio and game definitions.

### Consequence

Do not store every belt item/vehicle transform/machine tick as reactive TinyBase state by default.

---

## D-008 — Content and saves are separately versioned

**Status:** accepted

Designer-authored content definitions and player save state are distinct artifacts.

### Consequence

A save records the content version it depends on and may require migration.

---

## D-009 — No generic XP progression

**Status:** accepted

Progression is based on discoveries, demonstrated capability, industrial milestones, and company relationships.

### Consequence

Do not implement "mine N ore -> gain generic XP -> purchase arbitrary tech" without a new design decision.

---

## D-010 — Recipes are hidden player knowledge

**Status:** accepted

The implementation may contain deterministic reaction definitions, but the player does not automatically see them.

### Consequence

Designer truth and player knowledge must be modeled separately.

---

## D-011 — Factory as function is a core identity

**Status:** accepted

Player-built factory interiors can become external black boxes with explicit input/output contracts once solved/stable.

### Consequence

Architecture and UI should support detailed editing plus a readable external black-box contract. Aggregate operation is optional optimization work, not a required consequence of the game identity; D-027 currently defers it by measured evidence.

---

## D-012 — Company/terminal dependency is a core identity

**Status:** accepted

The expedition remains connected to and dependent on off-world company infrastructure.

### Consequence

Exports should have operational purpose beyond abstract money.

---

## D-013 — Scope is intentionally narrower than major factory sandboxes

**Status:** accepted

Combat, survival systems, huge technology catalogs, multiplayer, fully physical chemistry, and large vehicle ecosystems are not foundation requirements.

### Consequence

Do not add genre-standard systems merely because comparable games contain them.

---

## D-014 — Prove discovery in the first industrial slice

**Status:** accepted, 2026-09-22

Previously the roadmap deferred experimentation and knowledge to Phase 2, despite the first-playable goal in GAME_DESIGN requiring them. Phase 1 now includes one hidden useful transformation, an informative failed experiment, one milestone, and fuel recovery. Phase 2 expands these systems.

### Reason

A known-recipe production line tests factory plumbing but does not test this game's central discovery-to-industry promise. Fuel recovery must accompany fuel depletion to avoid an accidental soft-lock.

## D-015 — Factory presentation does not select simulation accuracy

**Status:** accepted, 2026-09-22

The initial factory remains fully simulated when its interior is hidden. The previous description of black-box factories as a scaling strategy is a future optimization hypothesis, not an initial implementation requirement. Aggregate execution needs behavioral equivalence tests and profiling evidence.

## D-016 — Build the ongoing game in the world

**Status:** accepted, 2026-09-22

The fixed-site dashboard is replaced by a full-screen spatial building game. There are no characters or robots. The player controls a free camera on a fixed three-quarter 2D map and places all equipment beyond the company terminal. Factories reveal their interior on the same map and scale. This implementation is the continuing foundation.

## D-017 — Automatic batches, physical belts and construction economy

**Status:** accepted, 2026-09-22

Definitions and placed instances are separate. Machines operate automatically from physical inputs, without knowledge-gating outcomes. Directional single-slot ground belts connect adjacent cells; factory walls require player-built ports. Build/refund operations are atomic. Local structural-plate production funds expansion. Terminal policies retain materials or export discovered valuable outputs for fuel; exports repay assistance debt first.

## D-018 — Save schema evolves separately from content

**Status:** accepted, updated 2026-09-30

Spatial saves currently use schema 10, separate from content version `world-01-v6`. Schema 4 migrates losslessly through schema 5 by adding empty belt-diverter state; schema 5 then migrates to schema 6 by reconstructing confirmed experiment evidence from discovered reaction IDs and hinted evidence from any undiscovered active processor batch; schema 6 migrates to schema 7 by adding an empty machine-incident slot; schema 7 migrates to schema 8 by initializing company-known Materials Exchange listings at authored baseline demand with zero saturation; schema 8 migrates to schema 9 with empty company-opportunity history; schema 9 migrates to schema 10 by deriving newly satisfied milestones from the preserved authoritative evidence already in the save. Schemas 1–3 remain incompatible and are rejected without replacing a running site. Content version remains `world-01-v6` because #70 and #71 are additive compatible extensions with default-empty authored arrays/optional handling gates. Saves tied to other content versions are rejected by the exact content-version check. Content Studio remains development-only and receives no scope expansion from save migration work.

## D-019 — Material conservation is a design invariant

**Status:** accepted, 2026-09-22

Nothing produced may silently disappear. Material remains in tracked transit, machine/factory buffers, physical storage, terminal staging, or another defined location until it is transformed, consumed by a defined process, or exported off-map.

### Consequence

The first playable's global site-stock convenience is a prototype exception, not a system to expand. The explicit buffer `discard` escape hatch was removed in Issue #5: buffered machines and loaded non-construction belts refuse dismantling instead of deleting or teleporting contents. Issue #6 added deterministic belt diverters so future feed can be rerouted physically while cargo already in transit remains on its existing route. Waste/dead stock require storage, processing, recycling, export or defined disposal. Conservation should become an automated simulation invariant.

---

## D-020 — Company economy has three market layers

**Status:** accepted, 2026-09-22

Known products participate through **Materials Exchange + Corporate Orders + Special Directives**.

The exchange uses understandable demand/saturation behavior over industrially meaningful time scales. Orders provide temporary procurement premiums. Directives provide differentiated research/prototype/property-based opportunities and may reward capability, not only fuel.

### Consequence

A product cannot be demanded before the company knows it exists. Market movement should encourage diversification without becoming rapid chart-chasing.

---

## D-021 — Factories are persistent capital

**Status:** accepted, 2026-09-22

Market changes should primarily cause suspension/resumption and logistics rerouting, not demolition/rebuilding of solved factories.

### Consequence

Stopped factories preserve their internal state without rebuilding. Disabling prevents new batches after the current batch finishes, while residual logistics may still fill inputs or drain outputs until already-routed cargo settles. Diverters redirect future feed only; a factory may then remain idle for a long period and resume from preserved buffers and identities.

---


## D-022 — Content identity is independent from localized presentation

**Status:** accepted, 2026-09-22

Gameplay/content entities use stable machine-readable IDs. Player-facing names, descriptions, observations and similar copy are presentation/localization data and may change without changing the underlying identity.

A placeholder ID such as `fuel-0` may therefore remain stable while the eventual displayed fuel name is still undecided.

### Consequence

Saves, references and simulation rules use stable IDs rather than visible text or array positions. UI resolves display text through localization resources/keys. `sim-core` must not depend on a localization framework or branch on translated strings.

The project should become localization-ready before content breadth grows, without requiring complete translations now.

---

## D-023 — Hazards are authored causal incidents, not a generic damage system

**Status:** accepted, 2026-09-26

A hazardous experiment is caused by an explicit authored process condition and reaction, never by arbitrary outcome RNG. The first proof stores only a machine incident lockout after the hazardous batch completes: material accounting proceeds normally, the machine disables, the player can inspect localized cause/effect text, and an explicit re-enable acknowledges the incident and restores operation.

### Consequence

Issue #32 does not introduce hit points, repair resources, generic fire/pressure/contamination simulation, or a reusable damage framework. Future hazards may justify broader systems later, but they must earn that scope from gameplay evidence. Hazard consequences remain save/load deterministic and subject to the same material-conservation rules as ordinary reactions.

---

## D-024 — Capability unlocks derive from confirmed knowledge

**Status:** accepted, 2026-09-27

The first progression proof does not add XP, a research currency, a tech-tree purchase state, or a parallel unlock save table. A capability may declare one stable reaction ID as its knowledge requirement. Availability is derived deterministically from the existing confirmed reaction knowledge already persisted in the save.

The first proof gates the **Oversealed furnace** on confirmed `heat-raw-sealed` knowledge. Its localized hint is presentation only and is not used to decide availability.

### Consequence

`sim-core` enforces the gate on placement commands; React only presents the derived state. Player snapshots expose `unlocked + hintKey` and deliberately omit the authored prerequisite reaction ID. Save schema remains 7 because confirmed knowledge already carries the durable progression state. Renaming localized copy cannot change unlock identity.

---

## D-025 — Factory external contracts are derived views before they become optimization inputs

**Status:** accepted, 2026-09-27

Phase 3 begins by projecting a read-only external contract from the existing detailed factory state. The contract is not a second authoritative factory model and is not persisted in saves.

For Issue #45, the contract contains only facts already present in detailed topology/state: stable factory identity/footprint, wall-port direction interpreted as input vs output, and counts of current semantic machine statuses. It deliberately does **not** infer recipes, hidden outcomes, material throughput, or aggregate execution.

### Consequence

Opening or closing a roof cannot change the contract or simulation truth. Save/load reconstructs the same view from the same detailed state. Throughput certification is implemented by #46 and blueprint serialization by #47. #49 subsequently measured the detailed runtime and recorded a NO-GO for aggregate execution at the current scale.

---

## D-026 — Stable throughput is certified from repeated detailed boundary flow

**Status:** accepted, 2026-09-27

A factory throughput contract may become **stable** only from observed detailed simulation behavior. Phase 3 does not calculate throughput from recipe tables, machine capacity, nominal durations, or roof state.

Issue #46 records successful cargo moves that actually leave a wall-port belt in its authored direction. A wall port already identifies whether that crossing is an input or output. The monitor then waits for the same detailed local factory state to repeat with the same non-zero input/output flow cycle twice before certifying rates.

Certification is transient derived evidence, not a second gameplay truth and not save data. Any successful gameplay command or Load clears the certificate. Disabled, incident, fuel-starved, output-blocked, incompatible-input or exhausted detailed states cannot certify stable throughput. A loaded save must earn the same contract again from detailed execution.

### Consequence

Save schema remains 7. A Stable contract remains a derived presentation/tooling fact and does not authorize aggregate execution by itself. #49 completed the evaluation and rejected an alternate execution path as unjustified by current measurements.

---


---

## D-027 — Aggregate factory execution is deferred by measured evidence

**Status:** accepted, 2026-09-29

Phase 3 Issue #49 measured the current detailed TypeScript simulation before introducing any alternate factory executor.

On exact evaluation head `0ebf2d6acb2d8dfa292cd689a9597fe8afe6a44f`, the representative certified Veined ore → Crusher → terminal line passed deterministic Save/Load continuation, identical throughput re-certification, material conservation, the full test/typecheck/lint/build gate, and the dedicated detailed-simulation benchmark.

The benchmark simulated 300 seconds per copy and measured median wall time of approximately 467 ms for 1 copy, 3.027 s for 8 copies, and 11.996 s for 32 factory-equivalent copies. The 32-copy case represented 9.6 million ms of aggregate simulated time and achieved about an 800× simulated-to-wall ratio.

### Decision

Do **not** introduce aggregate factory execution now.

The benchmark does not show a near-term performance failure large enough to justify:
- a parallel gameplay truth;
- detailed/aggregate synchronization;
- additional save compatibility surface;
- divergence risk in material, fuel or time behavior.

Closed/open roof presentation continues to have no effect on simulation accuracy. Detailed simulation remains authoritative.

### Revisit gate

Reopen aggregate execution only when a larger representative real-world profile demonstrates a concrete performance budget failure after ordinary TypeScript/data-layout/update-frequency optimizations. Any future aggregate prototype must still prove behavioral equivalence, conservation, deterministic Save/Load, and useful measured improvement before entering runtime code.

---


---

## D-028 — Content Studio bundles separate authoring, locale resources and simulation semantics

**Status:** accepted, 2026-09-29

Content Studio v1 authors core industrial definitions in TinyBase and exports a deterministic versioned bundle containing both validated `content` and its English source/fallback `locale` catalog.

Stable content IDs and stable localization-key references remain identity. Visible wording remains presentation data.

### Validation boundaries

`validateContent(input, catalog)` is the content authoring/distribution boundary. It validates structure, gameplay semantics, stable key relationships and required locale-resource coverage.

`validateSimulationContent(input)` is the sim-core boundary. It validates the same gameplay/content semantics and stable key relationships, but does not require a particular presentation catalog to be installed.

### Reason

Before Phase 4, constructing `Simulation` indirectly required every localization resource to exist in the built-in `enCatalog`. That prevented otherwise-valid dynamically authored content from being previewed even after its own locale bundle had validated, coupling gameplay simulation to presentation-resource availability.

### Consequence

- sim-core remains independent from localization resources/frameworks;
- built-in/player-distributed content still proves locale completeness before runtime;
- Studio-authored new IDs can be validated and previewed without editing the static fallback catalog first;
- authoring/preview never changes the active expedition or save;
- Studio bundles are development authoring artifacts, not runtime mod/hot-reload support.


---

---

## D-029 — Materials Exchange truth belongs to sim-core and follows discovery

**Status:** accepted for Phase 5 baseline, 2026-09-30

Static per-material export values are replaced by authored Materials Exchange definitions plus persisted runtime market memory. The exchange definition owns baseline compensation, a utility floor, baseline demand, saturation sensitivity and recovery cadence; the save owns current demand/saturation for listings the company legitimately knows.

A listing may appear only when its material is initially known or confirmed knowledge proves a reaction involving it. Player snapshots expose only sanitized known listings and current compensation. React presents that state but cannot create listings, prices or rewards.

### Consequence

Physical terminal staging remains the only normal export sink. Exported units leave tracked world inventory, update the material ledger, earn compensation from the current authoritative market state, repay corporate debt before net fuel allocation, and increase saturation. Saturation recovers deterministically on a slow simulation cadence. There is no stock ownership, speculative buy/sell loop, chart-driven price authority or hidden-content preview.

This baseline deliberately keeps one fuel resource. Orders, directives, additional fuel classes and broader company progression remain later dependency-ordered Phase 5 children.

## D-030 — Company opportunities are deterministic sim-core state, not a quest feed

**Status:** accepted for Phase 5 #70, 2026-09-30

Corporate Orders and Special Directives are authored opportunities evaluated on the existing slow company/market cadence. Runtime offer, expiry, progress, completion and reward state belongs to `sim-core` and is persisted in save schema 9.

Orders reference a company-known Materials Exchange product and progress only when staged cargo physically leaves the map through the terminal export path. A shipped unit may satisfy at most one active order. Exchange compensation remains unchanged; completing an order grants one additional authored fuel allocation.

Special Directives reference only an experiment tuple the player can legitimately understand: operation, known input material and setup/process condition. They do not expose reaction IDs or output IDs. Eligibility requires an unlocked capable processor; completion derives from the existing confirmed experiment-evidence record.

### Consequence

The terminal may present sanitized active opportunities and their clear reward/progress, but React does not own eligibility, deadlines, progress or rewards. Expired/completed offers do not rotate back automatically. #70 does not add standing, advanced fuel classes, terminal handling classes or a generic quest framework.

---

## D-031 — Evidence milestones unlock real terminal handling

**Status:** accepted for Phase 5 #71, 2026-09-30

Company progression uses a small data-driven milestone graph evaluated from authoritative evidence; it does not introduce XP or a spend-to-unlock currency. Milestone identity, evidence references and terminal capability identity use stable IDs, while names/hints remain localization data.

The first proof unlocks one terminal outbound-handling capability from durable confirmed `heat-raw-sealed` trial evidence. The Sealed thermal study remains an optional, time-limited bonus opportunity rather than a permanent prerequisite. Conductive granules may exist in terminal staging before the unlock, but they cannot leave the map, earn compensation, advance an order or enter the export ledger until the capability is available. Because staging remains bounded, blocked cargo naturally creates backpressure rather than disappearing.

Content validation rejects circular milestone/capability dependencies and rejects a required handling unlock that depends on exporting or completing an order for the same material it blocks. Because the gate uses confirmed reaction evidence, an expired Directive, a Directive that never appeared, or a pre-offer confirmed experiment cannot create a permanent handling soft-lock.

No second fuel/allocation class is added in this slice: there is not yet a second distinct machine/logistics behavior for it to represent. Adding one now would be naming/color breadth rather than capability depth.

---

## How to change a decision

When evidence requires a change:

1. update this document;
2. state the old decision;
3. state the new decision;
4. explain evidence/trade-off;
5. update affected design/architecture docs;
6. avoid leaving contradictory guidance in the repository.
