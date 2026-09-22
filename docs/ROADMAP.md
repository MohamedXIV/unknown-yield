# Roadmap

## Roadmap philosophy

The project should move by **proof**, not by feature accumulation.

Each phase must answer a design or architecture question. Do not build a large engine foundation that is only theoretically useful.

The roadmap below is intentionally implementation-focused and may later be mirrored into GitHub Issues/Projects.

## Phase 0 — Foundation

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

## Phase 1 — Core industrial vertical slice

### Question

Is the basic production loop understandable and satisfying?

### Scope

- tiny map;
- terminal;
- one extractable deposit family;
- small set of materials;
- basic extractor;
- one factory shell;
- a few operation machines;
- simple solid transport;
- inventory/buffers;
- one useful output;
- basic export;
- basic fuel consumption/allocation.

### Exit criteria

The player can:

```text
extract -> process -> produce -> transport -> export -> receive fuel
```

without debug commands.

## Phase 2 — Experimentation and discovery

### Question

Is hidden material behavior fun to discover rather than frustrating?

### Scope

- experiment command/workflow;
- authored reaction matching;
- observations;
- player knowledge state;
- unknown/hinted/confirmed presentation;
- one harmless failure;
- one hazardous failure;
- knowledge-based unlock.

### Exit criteria

A player can discover a useful transformation without the UI directly exposing its recipe first.

A failed experiment teaches something visible.

## Phase 3 — Factory as function

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
- first abstraction prototype;
- blueprint serialization.

### Exit criteria

A solved factory can be closed and understood from its external contract.

Editing it again restores enough detail to diagnose problems.

## Phase 4 — Content Studio v1

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

A new material + reaction chain can be authored and validated through the Studio without editing core simulation code.

Do not build every future editor screen yet.

## Phase 5 — Progression and company systems

### Scope

- milestone graph;
- unlock rules;
- terminal capability modules;
- company requests;
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

Recommended first implementation sequence:

1. workspace/package skeleton;
2. sim-core fixed-step world;
3. minimal content schema + TinyBase loader;
4. Zod + semantic validation;
5. Next app + stable Phaser host;
6. one simulated extractor/process/output;
7. React inspector fed by coarse simulation state;
8. minimal Studio material/reaction page;
9. save/content version primitives;
10. playable Phase 1 loop.

At every step, prefer working vertical integration over isolated framework construction.
