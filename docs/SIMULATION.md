# Simulation Model

## Implemented spatial contract (2026-09-22)

Commands cover placeMachine, placeStorage, placeFactory, placePort, placeBelts, rotateDivert, switchDivert, dismantle, setEnabled, setOperation, setPolicy and assistance. Preview and commit share validation. Placement checks bounds, rotated footprints, occupancy, deposit/factory membership and complete material cost before changing state.

Every content-defined tick increments time, completes current batches and records observations, runs transport when due, then starts eligible batches. Starting charges fuel and inputs once and reserves output capacity. Stopping prevents new batches while the current batch finishes. Dismantling running equipment is refused; an empty factory can be reclaimed after machines, belts and ports are removed.

Each directional belt cell has one cargo slot. Transport plans against previous occupancy, resolves arrivals deterministically in row/column order, clears sources, applies arrivals, and finally emits machine outputs. Cargo moves at most one edge per transport update. Occupied cells block upstream movement even if they will vacate this update. Walls require a port with matching outgoing direction. There is no remote source/destination link. A belt cell may carry a player-set alternate exit (`rotateDivert` cycles it through non-primary directions, `switchDivert` toggles the active exit); switching redirects only future moves, in-slot cargo is untouched, and the ledger needs no new category for it. Belts occupying factory wall cells can never hold an alternate exit: walls are crossed only through a matching directional port, so diverters there are refused by commands and rejected at load.

Terminal arrivals of the construction material become site stock; all other arrivals enter bounded terminal staging. Eligible export policies exchange staged material for fuel after repaying assistance debt. Construction stock is retained by default. Roof state is entirely presentation; factories always run their full internal simulation.

Save schema 5 records topology, identities, inventories, cargo, jobs, knowledge, policies, deposits, storage buildings, terminal staging, belt diverter state, fuel/debt, tick, fractional remainder and cumulative material flow totals (`consumed`, `produced`, per-material `exported`, `discarded`). Loading validates compatibility, topology, material knowledge, capacities (including storage and staging bounds) and active-job legality before replacing live state. Schema 4 migrates exactly (plain belts gain empty diverter state); schemas 1–3 are rejected without migration alongside older content versions: their saves predate tracked staging and storage. Discovery popup locations are transient and are not replayed when loading.

### Material ledger (Issue #3)

`packages/sim-core/src/ledger.ts` exposes `collectLedger`/`auditLedger`: pure, aggregate-per-material accounting with no per-unit objects. Holdings cover remaining deposits, site stock, terminal staging, machine input/output buffers, belt cargo, bulk storage contents, in-flight escrow (extractor jobs hold one deposit unit; processor jobs hold their reaction input amount), and embodied construction plates. Cumulative flows record reaction inputs/outputs at batch completion, per-material exports, and discards as an explicit sink. The per-material invariant is `deposits + stock + staging + machineInput + machineOutput + belts + storage + escrow + embodied + exported + discarded + consumed = initial + produced`; mismatches report the material, delta and full category breakdown. Extraction outputs are sourced via deposits, never double-counted in `produced`. `packages/sim-core/test/ledger.test.ts` pins conservation across extraction, transit, transformation, export, blocked/in-flight states, construction reclaim, save/load round-trips and corruption diagnostics. `Simulation.load()` enforces the same reconciliation after structural validation: conservation-invalid saves and saves whose `exported` total disagrees with `flows.exported` are rejected without replacing live state.

### Physical storage and terminal staging (Issue #4)

One bulk storage building (`depot`: 3×2, capacity 40, cost 30 plates, placeable on clear ground outside factories and deposits) holds any material up to its content-defined capacity. Belts feed its input socket and withdraw from its output socket under the same authority rules as machines; a full depot deterministically blocks upstream belts. Non-empty storage refuses dismantling; empty storage refunds its exact cost. Terminal staging is a bounded tracked location (`stagingCapacity` 24): non-construction arrivals stage there and export per policy, while construction plates still land in site stock. Full staging blocks arrivals and backs belts up deterministically. `packages/sim-core/test/storage.test.ts` covers placement, intake/withdrawal, both backpressure paths, dismantle guards, round-trips and end-to-end produce→store→withdraw→export without touching global stock.

### Persistent factories (Issue #7)

Suspending a line (`setEnabled` per machine) finishes the current batch exactly once — fuel and inputs were charged at batch start — then starts nothing new while buffers, jobs-cleared state, layout, ports and topology sit untouched indefinitely. There is no decay, no spoilage and no background consumption: a disabled line is bit-stable until resumed. Rerouting shared input through belt diverters is external to factories, so a switched feed never mutates the idle line's internals. Resume (`setEnabled`) restarts batches from preserved buffers with identical identities; nothing is rebuilt. Blocked output (`output-full`) and fuel starvation (`needs-fuel`) stall deterministically with contents intact, and draining/refueling resumes without loss. `packages/sim-core/test/persistence.test.ts` proves the full suspend→wait→reroute→idle→resume cycle across two factory lines sharing one diverter-fed extractor, including save/load mid-suspension, exact ledger conservation at every stage, and the blocked/starved/resume certifications above.

### Prototype exceptions after acceptance

No generic delete/discard mechanic remains: the `discard` command was removed in Issue #5, and dismantling a buffered machine or a loaded non-construction belt is refused instead of deleting or teleporting contents. Empty structures reclaim exact build costs; construction plates on a removed belt return to the build reserve. Valueless dead stock that reaches staging (e.g. residue) stays there as real material — dead stock is a logistics problem, not a delete button. Legitimate routing/recovery outs for stranded buffers arrive with Issue #6.

Do not expand either shortcut. The target economy requires physical storage and material conservation; see [ECONOMY.md](ECONOMY.md). A later migration may intentionally break disposable prototype saves again if needed to establish that stronger invariant.

The models below describe longer-term options where they exceed this implemented contract.

## 1. Purpose

Unknown Yield can become simulation-heavy, but it should not become heavy by accident.

The project should model what creates meaningful industrial decisions while abstracting details that do not improve play. A lower-frequency deterministic simulation is preferred over attaching gameplay logic to every rendered sprite.

## 2. Fundamental rule

> The simulation owns gameplay truth. Rendering only presents it.

The economy also adopts a second invariant:

> **Nothing disappears. Every produced material remains accounted for until transformed, consumed by a defined process, stored, or exported off-map.**

This does not require one object per kilogram. Efficient batches/segments are allowed, but accounting must remain exact enough for save/load and automated conservation tests.

A belt animation, moving truck sprite, warning light, roof state, or particle effect must not silently become the source of truth for production.

## 3. Tick model

Industrial systems generally do not need a 60 Hz gameplay update.

A useful starting model is:

- render/input: frame rate;
- movement presentation: interpolated every frame;
- core industrial simulation: fixed tick, initially around 5–10 Hz;
- slow economy / company systems: event-driven or lower-frequency;
- discovery and milestones: event-driven.

The exact rates are performance/design values and should be configurable.

Fixed-step simulation makes:

- tests easier;
- replays easier;
- save/load behavior clearer;
- benchmark comparisons meaningful.

## 4. State categories

### Authoritative world state

Examples:

- machine operating state;
- inventories and buffers;
- factory state;
- transport reservations;
- production rates;
- terminal stock;
- company obligation;
- discoveries;
- milestone state.

### Presentation state

Examples:

- sprite interpolation;
- animation phase;
- particle lifetime;
- UI panel open/closed state;
- camera easing;
- hover state.

Do not serialize presentation state unless a feature explicitly needs it.

## 5. Factory abstraction

Factory-as-function first describes a player-facing contract. Closing a roof or displaying a production summary must not change simulation semantics. Aggregate simulation is a later candidate scaling strategy, not a prerequisite for this design.

The first playable uses detailed simulation whether a factory is open or closed. Before introducing aggregate mode, compare it against detailed mode for input starvation, blocked outputs, fuel exhaustion, partial batches, hazards, and save/load. Do not claim equivalent behavior or a performance benefit without measurements and tests.

A factory can have multiple simulation modes.

### Detailed mode

Used while the player is editing, troubleshooting, or inspecting internals.

The simulation may track:

- individual machines;
- internal buffers;
- routing;
- local bottlenecks;
- internal hazard state.

### Stable / abstracted mode

Once a layout has proven stable, the system may derive a factory contract:

```text
consumes:
  ore A: 12/min
  brine: 4/min

produces:
  product C: 7/min
  waste gas: 2/min

constraints:
  fuel: advanced
  max input interruption: X
  hazard: pressure
```

A stable factory can update using aggregate math instead of simulating every internal visual event forever.

Abstraction must preserve gameplay-significant constraints. It is not permission to generate free output.

### Wake-up conditions

An abstracted factory may return to detailed resolution when:

- an input becomes invalid;
- an output is blocked;
- damage occurs;
- the player edits it;
- a hazardous condition crosses a threshold;
- content changes require recomputation.

The exact mechanism should be driven by tests and profiling.

## 6. Production

Production should be expressed through rates, batches, capacities, and conditions rather than frame time.

A machine/process may depend on:

- input availability;
- output capacity;
- fuel/energy;
- machine capability;
- operation duration;
- temperature/pressure bands if relevant;
- catalyst/secondary input;
- damage / fouling;
- player-discovered or undiscovered state only for UI, not physical truth.

The process should continue to behave physically according to content even if the player does not yet understand it.

## 7. Reactions and hazards

Reaction resolution should be deterministic from authoritative conditions as much as practical.

The player should be able to understand a failure retrospectively.

Bad:

```text
5% random chance each second -> factory explodes
```

Better:

```text
unstable output accumulated
+ containment exceeded
+ high temperature
-> pressure event

randomness may vary:
- exact damage;
- debris presentation;
- which adjacent cosmetic prop breaks.
```

Hazards can include:

- heat;
- pressure;
- corrosion;
- contamination;
- volatility;
- electrical instability;
- biological growth;
- unknown exotic effects.

Only implement hazards that create distinct decisions.

## 8. Logistics simulation

Logistics is the most likely system to become expensive if implemented naively.

### Belts

Do not assume every visible item needs a full object with an update function.

Possible models, from simple to more scalable:

1. discrete slot/cell movement;
2. segment queues with item positions derived for rendering;
3. flow/batch abstraction on long hidden routes;
4. fully aggregated factory-to-factory links where detail adds no gameplay.

Start simple and benchmark before adding complexity.

### Pipes

Do not begin with fluid dynamics.

A practical first model can use:

- capacity;
- throughput;
- connectivity;
- buffer amount;
- material compatibility;
- optional pressure class.

Only add richer network solving if gameplay requires it.

### Vehicles

Pathfinding can become a hot spot.

Prefer:

- cached paths;
- route graphs;
- limited replanning;
- job batching;
- spatial partitioning.

Do not run global pathfinding for every vehicle every tick.

### Rail / advanced logistics

These are later systems. Their implementation should fit the same simulation contract rather than requiring a new engine architecture.

## 9. World partitioning

If the map grows, systems should be designed to allow chunking or activity regions.

Possible categories:

- visible active area;
- nearby simulated detail;
- distant aggregate production;
- dormant region.

Do not implement a complex streaming system until the vertical slice proves the map scale needs it.

## 10. Determinism

Strict bit-for-bit cross-platform determinism is not an initial requirement.

However, the simulation should be deterministic enough for:

- reproducible tests;
- fixed-seed scenarios;
- reliable bug reports;
- save/load consistency;
- benchmark comparison.

Random decisions should go through explicit seeded RNG owned by the simulation rather than ad-hoc `Math.random()` calls scattered through code.

## 11. Commands and events

External systems should manipulate the world through commands.

Examples:

```text
PlaceFactory
ResizeFactory
PlaceMachine
ConnectPort
StartExperiment
SetMachineMode
RequestCorporateAssistance
CreateExportManifest
```

The simulation emits domain events:

```text
MaterialDiscovered
ReactionObserved
FactoryBecameStable
FactoryFaulted
TerminalShipmentCompleted
MilestoneUnlocked
CorporateStandingChanged
```

These events feed UI, presentation, audio, and analytics.

## 12. Snapshot strategy

Do not copy the entire simulation into React every frame.

Provide fit-for-purpose views:

- selected-factory summary;
- terminal summary;
- visible-world presentation snapshot;
- knowledge summary;
- debug snapshot.

The Phaser view may use a compact world delta or shared cache owned outside React.

## 13. Benchmark ladder

Before any Rust/WASM migration, establish reproducible scenarios.

Suggested ladder:

### A. Production-only
- 1,000 machines;
- 10,000 machines;
- 100,000 logical machines.

### B. Logistics
- many belt segments with representative item density;
- many pipe nodes;
- vehicle route stress.

### C. Factory abstraction
Compare:
- all interiors detailed;
- stable factories abstracted.

### D. Snapshot/worker cost
Measure:
- simulation step time;
- serialization time;
- transfer size;
- main-thread application cost;
- memory allocation.

## 14. Performance escalation order

When a budget fails:

1. verify the profiler result;
2. remove accidental per-frame work;
3. reduce allocations;
4. improve data layout;
5. reduce update frequency;
6. aggregate stable systems;
7. move simulation to a Web Worker;
8. optimize the identified algorithm;
9. consider Rust/WASM for proven hot paths.

Do not jump directly from "this might be big" to Rust.

## 15. Rust/WASM compatibility

The TypeScript simulation should use a coarse facade so an implementation can later move.

Current conceptual API:

```ts
interface Simulation {
  command(command: GameCommand): CommandResult;
  step(deltaMs: number): SimulationEvents;
  snapshot(scope?: SnapshotScope): WorldSnapshot;
  serialize(): SerializedWorld;
}
```

A future Rust implementation should preserve equivalent semantics.

Avoid designs that require JavaScript-to-WASM calls per entity.

## 16. Save/load

The serialized world should contain gameplay truth only and include:

- save schema version;
- content version;
- RNG state if needed;
- world state;
- knowledge state;
- factory layouts/blueprints;
- company progression;
- terminal state.

Load must validate versions before mutating a live world.

## 17. Simulation success criteria

The simulation architecture is successful when:

- sim-core tests run without a browser;
- the same fixture produces reproducible outcomes;
- Phaser can be removed from a test and production math still works;
- Content Studio can run a reaction/factory preview without booting a full game scene;
- a future worker can host sim-core without redesigning the domain;
- performance work remains targeted rather than architectural panic.
