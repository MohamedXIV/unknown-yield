# Liquid logistics (#108) Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task. Execution is native in this session, same checkout; no subagents or worktrees unless the user later requests them.

**Goal:** Deliver a playable conservative solid → liquid → solid chain with directed pipes, source pumps and tanks.
**Architecture:** Pure sim-core stores quantities and resolves synchronous transport. Content defines handling and limits; Phaser/React render detached snapshots and submit commands. Extend existing save, ledger and factory boundaries.
**Tech Stack:** Existing TypeScript, Zod, Vitest, Phaser and React; no new dependencies.
**Spec:** docs/PHASE9_LIQUID_LOGISTICS.md, approved by user; this plan awaits review.

## Global constraints
- #108 under #100 only; gas/pressure #109, specialized containment #110 and full terminal handling #111 remain later scope.
- Integer quantity, one material identity per liquid location; no loss, mixing, implicit crossings, global inventory or fluid dynamics.
- Pumps stop new admission when disabled, no-fuel or blocked; already admitted pipe contents may drain.
- One edge per transport update, deterministic capacity reservation, fuel only on successful pump transfer.
- Hidden reaction outputs never appear before observation. Loaded infrastructure refuses removal/rerouting.
- Preserve existing solid behavior, authored limits, factory boundaries and localization.
- Same folder, focused checks first, one full gate; normal-controls browser acceptance before merge.

## Review focus
- Two sources competing for capacity must not duplicate quantity or depend on record insertion order (Task 2).
- Loaded tank/pipe removal or reconfiguration must refuse atomically (Task 2).
- New liquids must not sneak into ordinary belts/storage or dry terminal staging (Tasks 1–2).
- Old saves/blueprints must retain original cargo/knowledge and import no phantom liquid (Tasks 1, 3).
- Closed factory throughput and snapshots must retain connected liquid backlog and ownership without spoilers (Tasks 3–4).

## File map
- Content schema/fixture/locale: packages/content/src/schema.ts, fixture.ts, locale.ts; content validation tests.
- Runtime models/migration: packages/sim-core/src/types.ts, save.ts, simulation.ts, index.ts.
- New focused domain module: packages/sim-core/src/liquids.ts; command/geometry/production/ledger integration in existing modules.
- Factory persistence/contracts: factory-blueprint.ts, factory-throughput.ts, factory-contract.ts.
- Presentation: apps/web/game/world.ts, interaction.ts, session.ts; existing components located during task 4 inspection, plus a focused liquid-presentation.ts helper if needed.
- Tests: new liquid-content.test.ts (content package), liquid-logistics.test.ts and liquid-persistence.test.ts (sim-core); existing ledger/blueprint/throughput/interaction suites.
- Evidence: docs/PHASE9_LIQUID_ACCEPTANCE.md.

### Task 1: Content and persisted liquid locations
**Files:** schema.ts, fixture.ts, locale.ts; types.ts, save.ts, simulation.ts; new content and persistence tests.
**Interfaces:** Material handlingState: solid | liquid, default solid. New content liquidLogistics definitions contain pipe capacity/transfer/cost; tank capacity/footprint/cost; pump footprint/transfer/fuel/cost. Machine definitions expose accepted input/output handling states, default solid. Runtime Pipe has id/x/y, inlet/outlet directions, materialId: string|null, quantity: number; Tank has id/definitionId/x/y/direction/materialId/quantity; Pump has id/definitionId/x/y/direction/enabled. Save adds keyed pipes and ID-keyed tanks/pumps, schema 14; snapshots expose detached player-visible views.
- [ ] Write content tests: old fixture defaults to solid; invalid capacity/state/ref rejected; liquid material with ordinary solid machine interface rejected when used by an authored reaction.
- [ ] Write migration tests: schema 13 adds empty liquid records and preserves cargo/jobs/knowledge; malformed keys, mixed/over-capacity contents and impossible placement are rejected without replacing current save.
- [ ] Run targeted Vitest files and confirm specific assertion/schema failures before implementation.
- [ ] Implement validated types/defaults and extend existing migration chain. Fixture becomes world-01-v7; explicitly support adding v7 content to v6 saves without changing existing IDs/rules. Preserve prior supported migration policy; no generic content-version bypass.
- [ ] Initial provisional balance: pipe capacity 4/transfer 1, tank capacity 64, source pump transfer 1/fuel 1 per successful transfer; footprint/cost in content. Tune only with playable evidence and record changes.
- [ ] Run content/persistence checks, then commit the self-contained schema/migration change.

### Task 2: Conservative transport and construction
**Files:** new liquids.ts and liquid-logistics.test.ts; commands.ts, geometry.ts, production.ts, ledger.ts, simulation.ts.
**Interfaces:** transportLiquids(content: Content, state: Save): void; liquidPumpStatus(content: Content, state: Save, pump: Pump): disabled | needs-fuel | needs-input | incompatible | output-full | ready. Commands: placePipes(points with explicit inlet/outlet), placeTank(definitionId,x,y,direction), placePump(definitionId,x,y,direction), setPumpEnabled(id,enabled), configurePipe(id,inlet,outlet), removePipe/removeTank/removePump(id).
- [ ] Add deterministic tests for machine→pump→pipe→tank and tank→pump→pipe→processor; ledger delta zero before/after every update.
- [ ] Add tests for source/destination capacity, identity mismatch, disabled/no-fuel pump, fuel charged only on success, and old admitted liquid draining after pump disable.
- [ ] Add tests for contention with reversed record insertion order, loops, full outlets and no same-update multihop; compare entire resulting material state.
- [ ] Add command tests for atomic cost/refund, occupied cells, factory wall/port direction, invalid edits, and loaded edit/removal refusal with unchanged save.
- [ ] Add tests proving solid belt/storage and dry terminal rejection retains liquid at source.
- [ ] Run targeted tests RED; implement pre-step transfer planning with deterministic source ordering, shared source/fuel/destination reservations and atomic commit. Include pumps in the same one-edge accounting rather than running a second cascading transfer pass.
- [ ] Integrate transport at existing transport cadence. Source pumps read adjacent compatible machine/tank output sockets; pipes discharge only to matching pipes, tank/processor input sockets or a terminal endpoint that passes current handling checks.
- [ ] Extend collectLedger with pipes/tanks and new embodied costs; no new discarded flows. Preserve normal solid transport.
- [ ] Run liquid, ledger, storage, routing and junction focused checks; commit.

### Task 3: Factory and restore contracts
**Files:** factory-blueprint.ts, factory-throughput.ts, factory-contract.ts, save.ts; blueprint/throughput/liquid-persistence tests.
**Interfaces:** Blueprint schema 3 adds relative pipes/tanks/pumps definitions; v1/v2 import as empty liquid infrastructure. Blueprint carries layout/settings, not copied inventory/jobs/certificates. Existing serialize/load/command boundaries remain unchanged.
- [ ] Add tests for blueprint roundtrip, atomic stamp rejection/cost, legacy layouts, and supported occupied-state restrictions.
- [ ] Add tests for connected tank/pipe backlog, enabled pump state and routes affecting recurrence; unrelated liquid line cannot invalidate another factory.
- [ ] Add uninterrupted-versus-restored equality over future transport/processing updates, with ledger checks and exact blocked/disabled states.
- [ ] Run RED; integrate internal/connected liquid fingerprints and matching geometry/ports. Keep detailed authoritative certification at existing frequency; no cross-tick optimization.
- [ ] Run blueprint, throughput, persistence and liquid tests; commit.

### Task 4: Playable authored chain and presentation
**Files:** fixture.ts, locale.ts; apps/web/game/world.ts, interaction.ts, session.ts and existing HUD/inspector components inspected before editing; liquid-presentation.ts if required; interaction/domain tests and acceptance doc.
**Interfaces:** Existing command/snapshot/session boundaries; new tool modes pipe/tank/pump. Endpoint preview uses authoritative validation, not independent UI compatibility truth.
- [ ] Add domain test for a fresh normal-command expedition discovering liquid-0 through a dedicated processor operation, storing it and processing it into a solid output. Existing reaction outcomes remain unchanged; observation is required before output knowledge is shown.
- [ ] Add presentation/interaction checks for directed bends, port mismatch, build preview, rotation and quantity/status display; avoid tests mirroring cosmetic implementation.
- [ ] Add snapshot mutation/no-spoiler checks for new liquid views.
- [ ] Run RED; author localized provisional material/process/machine text and costs, then implement build/inspect/toggle tools and world visuals. Pipes/tanks remain readable with roofs closed/open; liquid tank buffer and capacity must be visible.
- [ ] Demonstrate terminal refusal honestly; do not claim #111 export acceptance.
- [ ] Run focused relevant suites, then one npm test -- --maxWorkers=4, npm run typecheck, npm run lint, npm run build and git diff --check gate.
- [ ] Use browser normal controls for discover/build/fill/block/disable/drain/reconfigure/resume/save/restore; preserve a saved acceptance world, record screenshots/state and console findings. Fix scoped gate defects and rerun only affected checks.
- [ ] Record exact source SHA, tests and limitations; scoped PR references #108, attach it, merge only after acceptance; update #100 checkboxes and EXECUTION/ROADMAP. #109 remains next, and #100 remains open until #113.

## Self-review
All spec boundaries map to tasks, including terminal refusal, pump drain semantics, hidden knowledge, ledger, save/blueprint and factory recurrence. Existing subsystem APIs are preserved except explicitly versioned content/save/blueprint additions. New interfaces are planned definitions, not claims they already exist. No placeholder subsystem, gas/pressure or later-phase scope is included. Execute natively after user review; do not dispatch independent agents.
