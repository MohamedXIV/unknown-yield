# Technical Architecture

## Implemented world boundary (2026-09-22)

`packages/content` contains versioned definitions and Zod validation. `packages/sim-core` owns placed instances, grid topology, costs, batches, cargo, knowledge and economy. `apps/web/game/session.ts` hosts coarse stepping; Phaser owns only input, camera and drawing. React owns the small HUD and optional panels. TinyBase remains authoring-only.

The world is created once per Session. Resize, selection, roof state and panel updates do not recreate it. Late renderer loading consumes the latest mode/snapshot. Teardown unsubscribes and destroys Phaser; hidden tabs reset the session clock, without offline production. No per-frame transforms go through React.

Public snapshots omit active reaction IDs and unknown material/reaction definitions. Discovery locations are transient presentation metadata after observation, not persisted truth. Save schema 2 validates a replacement completely before applying it. The player export excludes the opt-in Studio route.

The broader architecture below describes possible evolution; it does not authorize systems outside the active roadmap/issues and accepted design documents.

## 1. Goals

The architecture should optimize for:

- rapid iteration in TypeScript;
- strong data-driven tooling;
- a rich Content Studio;
- deterministic and testable simulation;
- a clear separation between gameplay truth and presentation;
- a path to large simulations without committing to premature low-level optimization;
- static/web-first development with optional desktop packaging later;
- minimal coupling between content, UI, renderer, and simulation.

## 2. Chosen stack

### Application shell: Next.js + React

Responsibilities:

- app shell;
- menus;
- HUD;
- inspectors;
- terminal UI;
- knowledge graph UI;
- charts and production analytics;
- Content Studio routes;
- editor forms;
- debug and development tools.

Next.js is not the game engine and should not own the simulation loop.

The project should remain compatible with a static-export deployment model unless a concrete feature requires a server.

### World renderer and interaction: Phaser 4

Responsibilities:

- 2D world rendering;
- camera;
- pointer/keyboard input;
- world selection and placement interaction;
- sprites, animation, particles, filters, lighting where appropriate;
- visual interpolation between simulation updates;
- world-space overlays.

Phaser objects are views. Their existence is not authoritative gameplay state.

### Simulation: pure TypeScript

The simulation package owns gameplay truth.

It must not depend on:

- Phaser;
- React;
- Next.js;
- DOM APIs;
- Canvas APIs;
- browser rendering state.

It should be runnable in tests and eventually in a worker or non-browser context.

### Content: TinyBase

TinyBase is the editable/queryable content layer for data such as:

- materials;
- material properties;
- operations;
- machines;
- reactions;
- hazards;
- terminal modules;
- milestone definitions;
- unlocks;
- transport definitions;
- corporate requests/contracts;
- content tags and relationships.

TinyBase must **not** become the high-frequency world simulation store by default.

### Validation: Zod

Zod validates content and serialized boundaries. This includes localization-ready content/resource structures introduced by Issue #14; localization does not replace the existing content-validation path.

It should catch errors such as:

- missing referenced IDs;
- illegal process/machine compatibility;
- invalid ranges;
- impossible output definitions;
- duplicate IDs;
- malformed milestone conditions;
- unsupported cargo/terminal combinations.

Structural validation and semantic validation are separate concerns.

## 3. Recommended repository shape

Initial target:

```text
apps/
  web/
    app/
      game/
      studio/
      debug/
    components/
    game-host/

packages/
  sim-core/
    src/
    test/

  content/
    src/
      schema/
      store/
      validation/
      fixtures/
    test/

  game-protocol/
    src/
      commands/
      events/
      snapshots/

  phaser-view/
    src/
      scenes/
      systems/
      presentation/

  shared/
    src/

docs/
```

This is a guide, not a requirement to create empty packages before they earn their existence.

## 4. Runtime boundaries

Conceptually:

```text
+------------------------- NEXT / REACT --------------------------+
|                                                                 |
|  HUD   Inspectors   Terminal UI   Knowledge UI   Content Studio |
|                                                                 |
+------------------------+--------------------------+-------------+
                         |                          |
                  UI commands/events          content edits
                         |                          |
                         v                          v
+----------------- SIMULATION API --------+     TinyBase
|                                         |        |
| commands -> pure TS world -> events     |<-------+
|             / snapshots                 |  validated content snapshot
+---------------------+-------------------+
                      |
                      | presentation snapshot / delta
                      v
                 +---------+
                 | Phaser  |
                 |  View   |
                 +---------+
```

The important rule is not the exact diagram. It is **direction of authority**.

## 5. Simulation API

Design the TypeScript simulation behind a coarse API from the first implementation.

Illustrative shape:

```ts
interface Simulation {
  command(command: GameCommand): CommandResult;
  step(deltaMs: number): SimulationEvents;
  snapshot(scope?: SnapshotScope): WorldSnapshot;
  serialize(): SerializedWorld;
}
```

Avoid exposing hundreds of mutable internal objects to Phaser or React.

This boundary is intentionally compatible with a future worker or Rust/WASM implementation.

## 6. Timing model

Rendering and simulation should not be coupled one-to-one.

Target direction:

```text
rendering:          display refresh / requestAnimationFrame
interactive view:   frame based
industrial sim:     fixed lower-frequency ticks or event-driven
economy/contracts:  lower-frequency or event-driven
```

Do not require industrial production to execute at 60 Hz.

Phaser interpolates visual state where smooth motion is needed.

## 7. React rules

React receives **meaningful UI state**, not high-frequency world transforms.

Good examples:

- selected factory changed;
- factory summary changed;
- discovery completed;
- terminal inventory summary changed;
- contract state changed;
- player opened an inspector.

Bad examples:

- every belt item's position every frame;
- every vehicle position every frame;
- raw simulation arrays copied into React state at 60 Hz.

A stable game host should create the Phaser game once and avoid remounting the world due to unrelated UI changes.

## 8. TinyBase rules

TinyBase is excellent for:

- content editing;
- tables and relationships;
- indexes;
- reactive Content Studio forms;
- discovery/reference views;
- data inspection.

Do not default to representing every runtime machine tick, belt item, or vehicle transform as reactive TinyBase rows.

The runtime should consume a validated, versioned content snapshot or content service interface.

Phase 4 Content Studio v1 uses a deterministic bundle boundary:

```ts
{
  schemaVersion: 1,
  content: Content,
  locale: LocaleCatalog
}
```

TinyBase owns editable draft tables for core content plus English source/fallback text. Drafts may be temporarily invalid while related records are being authored; export/import requires the complete bundle to pass Zod and semantic validation.

Localization-ready presentation follows the same direction of authority: TinyBase authors stable content records and localization-key references; presentation resources are versioned alongside the Studio bundle; translated strings do not become simulation identity.

Validation has two explicit boundaries:

- `validateContent(input, catalog)` is the authored/distribution boundary and requires locale-resource coverage;
- `validateSimulationContent(input)` is the sim-core boundary and validates structure, gameplay semantics and stable key relationships without requiring a particular locale resource catalog.

This prevents sim-core from depending on presentation-resource availability while preserving locale completeness at the content boundary.

## 9. Save data and content are different things

Do not conflate:

```text
CONTENT
designer-authored definitions
material/process/reaction/machine data
```

with:

```text
SAVE GAME
player world state
discoveries
factory layouts
inventories
company standing
progression state
```

Both need explicit versions.

A save should record enough version information to support migration when content evolves.

## 10. Worker path

If profiling shows meaningful main-thread simulation cost, move the simulation behind a Web Worker without changing its domain API.

Preferred shape:

```text
Main thread
  Next / React
  Phaser
      |
      | coarse commands + snapshots/deltas
      v
Web Worker
  TypeScript simulation
```

Comlink or a custom typed protocol may be used, but neither is required at foundation stage.

## 11. Rust / WebAssembly path

Rust is an optimization path, not the default implementation language.

Only consider migration after a reproducible benchmark identifies a real bottleneck.

Potential candidates:

- very large logistics updates;
- pathfinding;
- graph/network solving;
- bulk production computation;
- specialized algorithms that benefit from packed data.

The API boundary must stay coarse.

Bad:

```ts
for (const machine of machines) {
  wasm.updateMachine(machine);
}
```

Good:

```ts
wasmSim.step(100);
const delta = wasmSim.takeDelta();
```

If Rust is introduced later, target a structure where a pure Rust simulation core can have:

- a WASM adapter for browser development;
- an optional native adapter if a desktop shell later benefits from it.

Do not redesign the project around this before benchmarks justify it.

## 12. Rendering scale

Do not represent simulation scale by blindly creating one expensive interactive object per logical entity.

Possible strategies, only when needed:

- tile layers for terrain;
- GPU-oriented sprite layers for large static decoration sets;
- pooled objects for repeated transient visuals;
- chunked world presentation;
- factory abstraction;
- culling;
- aggregated belt rendering;
- interpolation over low-frequency state.

Profiling decides which strategy is necessary.

## 13. Testing strategy

### sim-core

Highest test density.

Test:

- deterministic stepping;
- production;
- buffers;
- reaction resolution;
- hazards;
- logistics contracts;
- bailout/debt rules;
- milestones;
- save/load round trips.

### content

Test:

- schema validity;
- reference integrity;
- semantic validators;
- migration;
- canonical fixture loading.

### game-protocol

Test:

- serialization;
- command validation;
- snapshot/delta compatibility.

### Phaser view

Use focused unit tests where practical and browser/smoke tests for integration.

Do not test core production correctness through pixels if it can be proven in sim-core.

## 14. Performance budgets are evidence-driven

Before optimization, create benchmark scenarios.

Examples:

- 1k / 10k / 100k logical machines;
- large numbers of transport segments;
- many stable abstracted factories;
- worst-case pathfinding request bursts.

Record:

- simulation tick duration;
- allocation rate;
- snapshot size;
- main-thread frame time;
- worker transfer cost.

A Rust migration is accepted only when a benchmark demonstrates that it solves an important budget failure better than simpler TypeScript/data-layout changes.
