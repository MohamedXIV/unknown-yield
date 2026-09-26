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

Architecture and UI should support both detailed editing and aggregate operation.

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

**Status:** accepted, updated 2026-09-26

Spatial saves currently use schema 6, separate from content version `world-01-v5`. Schema 4 migrates losslessly through schema 5 by adding empty belt-diverter state; schema 5 then migrates to schema 6 by reconstructing confirmed experiment evidence from discovered reaction IDs and hinted evidence from any undiscovered active processor batch. Schemas 1–3 remain incompatible and are rejected without replacing a running site. Saves tied to the previous `world-01-v4` content are rejected by the exact content-version check. Content Studio remains development-only and receives no scope expansion from save migration work.

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

## How to change a decision

When evidence requires a change:

1. update this document;
2. state the old decision;
3. state the new decision;
4. explain evidence/trade-off;
5. update affected design/architecture docs;
6. avoid leaving contradictory guidance in the repository.
