# Simulation Model

## Implemented spatial contract (2026-09-22)

Commands cover placeMachine, placeStorage, placeFactory, placePort, placeBelts, rotateDivert, switchDivert, dismantle, setEnabled, setOperation, setPolicy and assistance. Preview and commit share validation. Placement checks bounds, rotated footprints, occupancy, deposit/factory membership and complete material cost before changing state.

Every content-defined tick increments time, completes current batches and records observations, runs transport when due, then starts eligible batches. Starting charges fuel and inputs once and reserves output capacity. Stopping prevents new batches while the current batch finishes. Dismantling running equipment is refused; an empty factory can be reclaimed after machines, belts and ports are removed.

Each directional belt cell has one cargo slot. Transport plans against previous occupancy, resolves arrivals deterministically in row/column order, clears sources, applies arrivals, and finally emits machine outputs. Cargo moves at most one edge per transport update. Occupied cells block upstream movement even if they will vacate this update. Walls require a port with matching outgoing direction. There is no remote source/destination link. A belt cell may carry a player-set alternate exit (`rotateDivert` cycles it through non-primary directions, `switchDivert` toggles the active exit); switching redirects only future moves, in-slot cargo is untouched, and the ledger needs no new category for it. Belts occupying factory wall cells can never hold an alternate exit: walls are crossed only through a matching directional port, so diverters there are refused by commands and rejected at load.

Terminal arrivals of the construction material become site stock; all other arrivals enter bounded terminal staging. Eligible export policies exchange staged material through the authoritative Materials Exchange after repaying assistance debt. Compensation is derived from authored baseline/floor demand parameters plus persisted saturation state; successful physical exports raise saturation and periodic market updates recover it deterministically. A market listing exists only after the company can know the material from initial content or confirmed discovery. Construction stock is retained by default. Roof state is entirely presentation; factories always run their full internal simulation.

Save schema 11 records topology, identities, inventories, cargo, jobs, discovered reaction knowledge, hinted/confirmed experiment evidence, machine incident lockouts, policies, persisted market demand/saturation, company-opportunity history, evidence-milestone completion, company standing/intervention recovery state, deposits, storage buildings, terminal staging, belt diverter state, fuel/debt, tick, fractional remainder and cumulative material flow totals (`consumed`, `produced`, per-material `exported`, `discarded`). Loading validates compatibility, topology, material knowledge, market-listing legitimacy, opportunity timing/progress, milestone legitimacy, company-standing/obligation coherence, capacities (including storage and staging bounds) and active-job legality before replacing live state. Schema 4 migrates exactly through schema 5 (plain belts gain empty diverter state), schema 5 migrates to schema 6 by rebuilding confirmed evidence from discovered reactions and hinted evidence from undiscovered active processor jobs, schema 6 migrates to schema 7 with empty incident slots, schema 7 migrates to schema 8 by initializing only company-known exchange listings at their authored baseline because no prior market-memory state existed, schema 8 migrates to schema 9 with empty opportunity history, schema 9 migrates to schema 10 by deriving satisfied milestone state from preserved authoritative evidence, and schema 10 migrates to schema 11 without changing fuel or debt: an existing obligation becomes recovery standing with one intervention, while a debt-free save starts clear. Schemas 1–3 are rejected without migration alongside older content versions: their saves predate tracked staging and storage. Discovery popup locations are transient and are not replayed when loading.

### Planned junction contract (Phase 6, not implemented)

[PHASE6_JUNCTIONS.md](PHASE6_JUNCTIONS.md) defines the approved target beyond the implemented spatial contract above. #81 changes L/manual-diverter presentation only. #82 adds directed T splitter/merger fairness after successful transfers. #83 adds a one-slot crossing with persisted cargo route and simulation-timed axis windows, stopping new admissions during a requested switch until the center clears. Junction state must remain physical, conserved, deterministic and included in save validation and factory throughput fingerprints. These features are pending; current row/column belt contention is not proof of fair junction behavior.

### Corporate assistance and recovery standing (Issue #72)

`sim-core` owns assistance eligibility, company obligation and recovery standing. Authored packages define a fuel threshold, fuel grant, base obligation, repeat-intervention obligation step and net-export recovery target. The command is refused if fuel is not depleted enough or if an obligation remains open. Granting assistance mutates only fuel, debt and company standing/intervention state; no material inventory, route, machine, storage or ledger flow is created or deleted.

The existing `debt` field remains the outstanding obligation. `applyExportCompensation` calculates legal Materials Exchange compensation, repays debt from gross compensation first, credits only the remainder as fuel, then uses that net export fuel to advance recovery standing. Order/Directive reward fuel bypasses this repayment/recovery accounting deliberately: those are bonus allocations, not export compensation.

Company state is `clear` or `recovery`, with a consecutive intervention streak, net-export recovery progress, the active package, and an internal persisted counter of obligation fuel repaid since the last assistance allocation. Reaching the authored net-export target after debt is zero resets standing, progress and the streak. Net-export recovery progress is cumulative across the same recovery episode: reopening debt through a repeat intervention or continuation pauses further progress but does not erase progress already earned. A new intervention after debt repayment but before reset uses the package's authored repeat step. If fuel reaches the package threshold while debt is still open, a recovery continuation is allowed only after the persisted repayment counter reaches `continuationObligationFuel`; the continuation grants fuel, adds exactly that amount of debt, resets the counter and leaves the intervention streak unchanged. Therefore each continuation requires at least as much real export repayment as the debt it adds and cannot increase obligation cycle-over-cycle.

The end-to-end recovery proof does not depend on a live Corporate Directive. A zero-fuel site may receive assistance after the Sealed thermal study has expired, power a normal extractor + Sealed furnace experiment, confirm `heat-raw-sealed`, unlock the #71 terminal handling milestone, and then use physical exports to repay the obligation and restore standing.

### Stable factory throughput certification (Issue #46)

`FactoryThroughputMonitor` observes the existing detailed transport path rather than authored recipe capacity. A boundary unit is counted only after a successful cargo move whose source belt occupies a factory wall port and moves in that port's direction. The port geometry classifies the crossing as input or output.

The monitor keeps a transient local-state fingerprint containing internal machine semantic status/jobs/buffers and internal/wall belt cargo. Static topology/configuration is fingerprinted separately. A candidate cycle exists only when the same detailed local state returns with non-zero measured input **and** output crossings. The same cycle duration/material counts must repeat twice for the contract to become `stable`; reported units/minute are calculated from those observed counts and the actual simulation tick duration.

Successful gameplay commands invalidate all certificates conservatively. Relevant internal topology/configuration changes therefore restart measurement immediately. Disabled, incident, deposit-exhausted, incompatible-input, output-full and fuel-starved machines clear certification; prolonged loss of boundary flow also expires a previously stable contract.

Throughput certification is deliberately absent from `Save`. Load clears the transient monitor and the restored detailed state must re-earn the same certificate. This keeps schema 7 unchanged and prevents a stale aggregate summary from becoming gameplay truth. Roof/open presentation is still irrelevant to simulation accuracy.

### Read-only factory external contract (Issue #45)

Phase 3 starts with a derived `FactoryView`; detailed simulation remains the only gameplay truth. Each player snapshot derives wall-port roles from geometry: if the port belt direction crosses from the wall cell into the factory footprint it is an **input** port, otherwise it is an **output** port. The view also counts internal machines by the existing semantic `MachineStatus` codes.

The contract does not contain recipe IDs, reaction outcomes, material-rate claims or aggregate state. It is not added to `Save`, so schema 7 and content `world-01-v5` remain unchanged. Save/load simply reconstructs the same projection from persisted detailed factories/machines. Roof/open state remains React/Phaser presentation and never enters this derivation.

Issue #46 added measured stable throughput to this contract only from observed detailed boundary flow; it does not infer rates from authored recipes. Issue #49 subsequently measured the detailed runtime and rejected aggregate execution as unjustified for the current scale.

### Condition-aware reaction matching (Issue #30)

Reaction lookup uses the exact operation, input material and optional `processConditionId` on the machine definition. Reactions with no condition match only unconditioned machines; there is no fallback or first-match behavior. Content validation rejects duplicate tuples, unmatched reaction conditions and processor operations without a compatible reaction. The `raw + heat` fixture resolves to residue for `ambient` and granules for `sealed`, even before the player knows either outcome; snapshots reveal each reaction only after discovery. The condition is static authored content resolved through the already-persisted machine `definitionId`, and an active batch retains its reaction ID. No save field or save-schema bump was needed. The fixture remains `world-01-v5`; Issue #32 adds an additive condition/reaction and relies on schema 6→7 migration rather than invalidating compatible saves.

### Experiment evidence and knowledge states (Issue #31)

When a processor starts a valid authored reaction, the simulation records one deduplicated evidence tuple (operation, input, process condition) as `hinted`. Hinted evidence is gameplay truth about the player's attempted setup, not reaction truth: player snapshots expose no output ID or authored observation text for it. When that batch completes, the same evidence becomes `confirmed` and the existing discovered reaction ID makes its output/observation visible. A repeated identical experiment leaves the same record in place. Save/load preserves both states; schema-5 migration reconstructs the state exactly from discovered knowledge and active jobs. The notebook presents localized operation/material/setup wording and generic “outcome unconfirmed” copy for hints rather than raw stable IDs or localization keys.

### Demonstrated-knowledge capability gate (Issue #33)

Machine placement may be gated by one content-defined confirmed reaction ID. `machineUnlocked` checks only the authoritative save's `knowledge` array and the machine definition's stable prerequisite ID; resources, fuel, display text and UI state cannot satisfy or bypass the gate. The fixture keeps the Oversealed furnace unavailable until `heat-raw-sealed` is confirmed. Once that discovery is recorded, the capability becomes available immediately and remains available after save/load because the same confirmed knowledge is already persisted.

The player snapshot does not expose the prerequisite reaction ID. Machine definitions are projected to a presentation view carrying only `unlock: { unlocked, hintKey }` (or `null`). The localized hint explains the evidence requirement; changing catalog wording cannot affect simulation identity. No new save field or schema bump is required beyond schema 7.

### Condition-driven hazardous failure (Issue #32)

The `oversealed` Heat reaction is the single hazard proof. Its cause is entirely authored and deterministic: the same `raw + heat` experiment under ambient or sealed conditions does not create an incident, while the oversealed condition always does. The hazardous batch completes through the normal reaction path, so its consumed raw material and produced residue remain ledger-accounted. Completion then stores `chamber-blowout` on that machine, disables it, and leaves buffers/logistics intact. Player snapshots translate the occurred incident to localized name/explanation keys; they do not expose untriggered hazards. Save/load preserves the lockout exactly. An explicit enable command acknowledges/clears the incident and resumes the same machine identity. There are no hit points, repair items, random hazard rolls or generic fire/pressure systems.

### Material ledger (Issue #3)

`packages/sim-core/src/ledger.ts` exposes `collectLedger`/`auditLedger`: pure, aggregate-per-material accounting with no per-unit objects. Holdings cover remaining deposits, site stock, terminal staging, machine input/output buffers, belt cargo, bulk storage contents, in-flight escrow (extractor jobs hold one deposit unit; processor jobs hold their reaction input amount), and embodied construction plates. Cumulative flows record reaction inputs/outputs at batch completion, per-material exports, and discards as an explicit sink. The per-material invariant is `deposits + stock + staging + machineInput + machineOutput + belts + storage + escrow + embodied + exported + discarded + consumed = initial + produced`; mismatches report the material, delta and full category breakdown. Extraction outputs are sourced via deposits, never double-counted in `produced`. `packages/sim-core/test/ledger.test.ts` pins conservation across extraction, transit, transformation, export, blocked/in-flight states, construction reclaim, save/load round-trips and corruption diagnostics. `Simulation.load()` enforces the same reconciliation after structural validation: conservation-invalid saves and saves whose `exported` total disagrees with `flows.exported` are rejected without replacing live state.

### Physical storage and terminal staging (Issue #4)

One bulk storage building (`depot`: 3×2, capacity 40, cost 30 plates, placeable on clear ground outside factories and deposits) holds any material up to its content-defined capacity. Belts feed its input socket and withdraw from its output socket under the same authority rules as machines; a full depot deterministically blocks upstream belts. Non-empty storage refuses dismantling; empty storage refunds its exact cost. Terminal staging is a bounded tracked location (`stagingCapacity` 24): non-construction arrivals stage there and export per policy, while construction plates still land in site stock. Full staging blocks arrivals and backs belts up deterministically. `packages/sim-core/test/storage.test.ts` covers placement, intake/withdrawal, both backpressure paths, dismantle guards, round-trips and end-to-end produce→store→withdraw→export without touching global stock.

### Persistent factories (Issue #7)

Suspending a line (`setEnabled` per machine) lets its current batch finish exactly once — fuel and inputs were charged at batch start — and starts no later batch while disabled. Transport remains active: cargo already past a diverter continues along its existing belt route, and residual cargo may still fill the disabled machine's input or drain its output. An immediate reroute can therefore change buffers while that traffic settles. After the current batch and residual traffic settle or become blocked, and no new input reaches the line, the disabled machine stays stable until resumed. There is no decay, spoilage or background consumption. Resume (`setEnabled`) restarts batches from preserved buffers with identical identities; nothing is rebuilt. Blocked output (`output-full`) and fuel starvation (`needs-fuel`) stall deterministically with contents intact, and draining/refueling resumes without loss. `packages/sim-core/test/persistence.test.ts` proves the full suspend→wait→reroute→idle→resume cycle across two factory lines sharing one diverter-fed extractor, including immediate rerouting with residual cargo, save/load mid-suspension, exact ledger conservation, and the blocked/starved/resume certifications above.

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

Factory-as-function first describes a player-facing contract. Closing a roof or displaying a production summary must not change simulation semantics.

**Phase 3 outcome:** detailed TypeScript simulation remains the only runtime execution mode whether a factory is open or closed. Issue #49 measured the detailed path and recorded a NO-GO for aggregate execution because the current benchmark did not demonstrate a near-term performance failure large enough to justify a second authoritative executor.

The stable/abstracted material below is therefore a **future revisit contract**, not current architecture. Reopen it only when a larger representative profile demonstrates a concrete budget failure and a prototype can prove behavioral equivalence, conservation, deterministic Save/Load and useful measured improvement.

### Detailed mode

Used while the player is editing, troubleshooting, or inspecting internals.

The simulation may track:

- individual machines;
- internal buffers;
- routing;
- local bottlenecks;
- internal hazard state.

### Stable external contract / deferred aggregate hypothesis

Once a layout has proven stable, the current system derives a read-only external factory contract:

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

The current runtime **does not** use this contract to skip detailed execution. A future aggregate prototype may do so only if new profiling evidence reopens the decision.

Any future abstraction must preserve gameplay-significant constraints. It is not permission to generate free output.

### Future aggregate wake-up conditions

If aggregate execution is ever reintroduced as a measured prototype, it may return to detailed resolution when:

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


## Corporate opportunities

Issue #70 evaluates authored opportunities on the same slow cadence as the Materials Exchange. An order is eligible only after its material is company-known and has a live exchange listing. A directive is eligible only when its input is company-known, its requested operation/setup is an unlocked capability, and that exact experiment has not already been confirmed.

Offers are one-shot and deterministic: the save records offered tick, exact expiry tick, progress, completion and completion tick. Directive completion derives from confirmed experiment evidence. Order progress is recorded only by the existing physical terminal export path after staged cargo actually ships; exported units are assigned deterministically to active matching orders so one physical unit cannot satisfy multiple orders. Completion grants the authored fuel allocation once. Player snapshots expose only active sanitized opportunities; directives contain no hidden reaction or output identity.


## Evidence milestones and terminal handling

Issue #71 evaluates a small authored milestone graph against authoritative save evidence. A milestone may depend on confirmed reaction knowledge, exported quantities, completed orders/directives, earlier milestones or terminal capabilities. Satisfied milestones are persisted with their completion tick; repeated refresh is idempotent.

Exchange listings may require one authored terminal handling capability. The capability is derived from completed milestone unlocks. A policy set to export does not bypass this gate: locked cargo stays in bounded terminal staging, earns no compensation, advances no order and writes no export-ledger entry. If staging fills, the existing transport rules leave approaching belt cargo in place, producing normal physical backpressure.

The current fixture unlocks sealed outbound handling from confirmed `heat-raw-sealed` reaction knowledge. That durable evidence is written by the real experiment whether or not the time-limited Sealed thermal study was offered or completed, so Directive expiry or a pre-offer experiment cannot permanently block terminal progression. Content validation rejects cycles and same-material export/order prerequisites that would soft-lock a required handling capability.
