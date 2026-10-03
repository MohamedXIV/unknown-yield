# Pressurized Gas Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. User selected native execution in the same checkout; no agents or worktrees.

**Goal:** Complete #109 with a playable conservative liquid → gas → solid path using distinct sealed storage and directed pressure transport.

**Architecture:** Pure sim-core owns explicit pressure-line, vessel and compressor records. Gas-only admission uses pre-step reservations and atomic commits at the existing logistics cadence. Existing content, save, ledger, factory and presentation boundaries extend to include gas without changing solid/liquid semantics.

**Tech Stack:** TypeScript, Zod, Vitest, TinyBase authoring, Phaser presentation, React/Next.js UI; no new dependencies.

**Spec:** [PHASE9_GAS_LOGISTICS.md](../../PHASE9_GAS_LOGISTICS.md), approved 2026-10-03.

## Global Constraints

- #109 under #100 only; no pressure physics, leaks, hazards, terminal upgrades, cylinder cargo subsystem or later-phase logistics.
- sim-core remains authoritative; authored reactions remain hidden until observed.
- Nonnegative integer quantities; one stable material ID per line/vessel; zero quantity means null identity.
- No venting, loss, implicit mixing, global gas inventory or loaded infrastructure deletion/rerouting.
- One sealed compatibility class; no numeric pressure or pressure bands.
- Save schema 14 → 15; fixture world-01-v7 → world-01-v8; backward compatibility is not a gate. Load rejection remains atomic.
- Blueprint schema 4 when gas members exist; preserve v1–v3 behavior.
- Same checkout, branch `codex/109-pressurized-gas`; no worktree, remote agent, Vercel work or new dependency.
- Native self-review and exact local/domain/browser evidence; no claim of absent remote CI.

## Review Focus

- A gas processor connected to an ordinary liquid/solid path must retain gas without spending transfer fuel (Task 2).
- Simultaneous incoming/outgoing transfers must preserve identity at empty/full boundaries and never advance a unit twice (Task 2).
- Invalid gas save data, including overlapping liquid/gas geometry and inconsistent empty identity, must leave the running world unchanged (Task 3).
- A connected external gas reservoir must affect factory recurrence; an unrelated vessel must not (Task 4).
- Toolbar/help/closed-factory UI must not reveal `gas-0` or authored reaction output before observation (Tasks 1, 5).

## File Map

- Content: `packages/content/src/schema.ts`, `fixture.ts`, `locale.ts`, `studio.ts`; new `packages/content/test/gas-content.test.ts`.
- Runtime: `packages/sim-core/src/types.ts`, `simulation.ts`, `index.ts`; new `gases.ts`.
- Construction/accounting: existing `commands.ts`, `geometry.ts`, `ledger.ts`, `production.ts` only where endpoint rejection requires changes.
- Persistence/factories: existing `save.ts`, `factory-contract.ts`, `factory-throughput.ts`, `factory-blueprint.ts`.
- Presentation: `apps/web/game/interaction.ts`, `world.ts`, `session.ts`, `apps/web/components/GameClient.tsx`, localized resources in content.
- Tests: new `gas-logistics.test.ts`, `gas-persistence.test.ts`, `gas-chain.test.ts`; extend existing blueprint/throughput/interaction/session/content tests where they own the boundary.
- Evidence/contracts: `docs/PHASE9_GAS_ACCEPTANCE.md`, `PHASE9_IMPLEMENTATION_LOG.md`, `SIMULATION.md`, `CONTENT_MODEL.md`, `DECISIONS.md`, `EXECUTION.md`, `ROADMAP.md` as required by accepted behavior.

## Task 1: Gas content and runtime interfaces

**Interfaces:** Add `gas` to material/machine handling states. Optional `Content.gasLogistics` contains `line {capacity, transfer, cost}`, `vessel {capacity, width, height, cost}`, `compressor {transfer, fuel, cost}`. Runtime `GasContents {materialId: string|null, quantity: number}`, `PressureLine` adds id/x/y/inlet/outlet, `PressureVessel` adds id/x/y/direction, `Compressor` adds id/x/y/direction/enabled. Save records: coordinate-keyed `pressureLines`, ID-keyed `pressureVessels` and `compressors`. Snapshot exposes detached arrays and `gasLogistics`.

- [ ] Add `gas-content.test.ts`: accept authored gas interfaces; reject unknown handling states, nonpositive limits and reaction/machine state mismatches; assert Studio export/import preserves the complete gas bundle.
- [ ] Run `npx vitest run packages/content/test/gas-content.test.ts --maxWorkers=4`; observe failures specifically caused by missing gas support.
- [ ] Extend schema/types/exports and Studio roundtrip. Provisional balance: line capacity 4, transfer 1, cost 3; vessel capacity 48, footprint 2×2, cost 28; compressor transfer 1, fuel 1, cost 16. Keep values in content.
- [ ] Add `gas-0` (initially hidden), `vaporizer`/`gas-collector` processors, `vaporize`/`collect-gas` operations and hidden `vaporize-liquid-0`/`collect-gas-0` reactions. Each reaction converts 1 unit to 1 unit; gas collector produces existing granules. Both processors: 2×2, capacity 12, fuel 2, duration 30 ticks, cost 32. Preserve every existing outcome. Add localized name/observation/help keys without recipe spoilers.
- [ ] Run gas content plus existing content/Studio tests. Verify the new snapshot still hides `gas-0` before observation.
- [ ] Commit this content/interface increment when its focused checks pass and the runtime still typechecks.

## Task 2: Construction and conservative pressure transport

**Interfaces:** `transportGases(content: Content, state: Save, onMove?: (event: TransportMoveEvent) => void): void`; `gasCompressorStatus(content: Content, state: Save, compressor: Compressor): "disabled"|"needs-fuel"|"needs-input"|"incompatible"|"output-full"|"ready"`. Commands: `placePressureLines {points: (Point & {inlet:number,outlet:number})[]}`, `placePressureVessel {x,y,direction}`, `placeCompressor {x,y,direction}`, `setCompressorEnabled {id,enabled}`, `configurePressureLine {id,inlet,outlet}`, existing `dismantle {id}`. Placement uses `gasPlacementError(content, state, pointWithDirectionOrEnds, kind: "line"|"vessel"|"compressor"): string|null` and `gasRects(content,state): Rect[]`.

- [ ] Write `gas-logistics.test.ts` with machine→compressor→line→vessel and vessel→compressor→line→machine routes. Assert per-step ledger delta zero, explicit quantity movement, capacity bounds and no same-step multihop.
- [ ] Test blocked/full/missing/wrong-direction outlets, identity mismatch, reverse record insertion order, disabled/unfueled compressors and successful-only fuel charge. Pin simultaneous intake/outflow at the empty/full boundary.
- [ ] Test reciprocal gas/liquid/solid endpoint rejection including belts, depots, tank/pump/pipe, incompatible machines and dry terminal; assert source quantity retained and no export/fuel change from refused transfer.
- [ ] Test atomic preview/build cost, exact empty reclaim refund, loaded edit/reclaim refusal, liquid/gas/solid overlap refusal and factory wall/port guards. Assert rejected commands preserve the entire save.
- [ ] Run `npx vitest run packages/sim-core/test/gas-logistics.test.ts --maxWorkers=4` and verify RED for absent construction/transport/accounting behavior.
- [ ] Implement gas-only source/target lookup and stable pre-step source/destination/fuel reservations in `gases.ts`. Commit transfers only after all plans are built; run at the existing transport cadence. Compressors are unbuffered adapters; disabled admission does not disable downstream drainage.
- [ ] Extend geometry occupancy checks in both directions, localized command results, loaded-structure/port/factory removal guards, ledger gas holdings and construction embodiment. No new discarded counter or generic delete path.
- [ ] Run gas logistics plus liquid logistics, ledger, storage, routing, junction and crossing tests; commit after GREEN.

## Task 3: Save validation and future equivalence

**Interfaces:** Existing `Simulation.serialize(): Save` and `Simulation.load(input: unknown): CommandResult` stay unchanged. Schema 15 initializes empty gas records. Content v8 is required for the new fixture; older incompatible combinations receive the existing readable load-error boundary. No generic content-version bypass.

- [ ] Write `gas-persistence.test.ts`: flowing and blocked worlds retain quantity, identities, compressor enabled state, machine escrow and knowledge through serialize/load. Assert future full-save equality for uninterrupted and restored runs over 60 steps.
- [ ] Add rejection cases for overcapacity/fractional/negative quantities, null identity with positive quantity, identity with zero quantity, nongas in pressure locations, gas in dry/liquid locations, duplicate IDs, key mismatch, overlap, bounds, unsupported schema/content and malformed compressor state. Assert failed load leaves the running save equal to its pre-load copy.
- [ ] Run `npx vitest run packages/sim-core/test/gas-persistence.test.ts --maxWorkers=4`; verify expected RED.
- [ ] Extend `save.ts` schema/init/semantic validation with gas records. Validate geometry against already validated solid/liquid members and gas members, with exact compatibility/capacity rules. Keep supported cheap migration paths only if they preserve existing semantics; explicitly reject unsupported old content.
- [ ] Run gas persistence, existing persistence/liquid persistence and session tests; commit after GREEN.

## Task 4: Factory contracts and blueprint schema 4

**Interfaces:** `FactoryContractView.gasInventory?: Inventory` accompanies current liquidInventory. Existing throughput observation APIs remain unchanged. Blueprint schema 4 includes existing liquid arrays plus `pressureLines {x,y,inlet,outlet}[]`, `pressureVessels {x,y,direction}[]`, `compressors {x,y,direction,enabled}[]`. Never include contents, jobs, gas IDs or copied certificates.

- [ ] Extend factory-throughput tests: internal and connected external gas backlog/settings/topology affect recurrence and withdraw a stale certificate; unrelated gas vessels do not invalidate a factory. Assert gas and liquid components do not become connected merely by adjacency.
- [ ] Extend blueprint tests: mixed liquid/gas schema-4 layout/settings roundtrip, relative coordinates, no contents, deterministic serialization, overlap/wall-port refusal and unchanged v1–v3 import/export behavior.
- [ ] Extend factory-contract tests: localized closed-factory gas inventory includes physical member holdings without canonical reaction disclosure.
- [ ] Run blueprint/throughput/contract suites and verify RED for omitted gas state.
- [ ] Extend member collection, topology graph and recurrence fingerprint for gas-only interfaces, including external connected machine/vessel state. Extend strict blueprint key/geometry validation and detached factory contracts.
- [ ] Run focused factory suites plus gas save/logistics tests; commit after GREEN.

## Task 5: Normal-controls chain and presentation

**Interfaces:** Build tools `pressure-line`, `pressure-vessel`, `compressor`, `vaporizer`, `gas-collector` map to Task 2 commands and Task 1 definitions. Existing interaction mode and world/session snapshot boundaries remain authoritative readers. Session save slot advances from v8 to v9 while preserving previous slots.

- [ ] Read the installed Next.js docs relevant to the React UI files before editing, per `apps/web/AGENTS.md`; avoid unrelated framework work.
- [ ] Add `gas-chain.test.ts` using normal commands only: extractor/solid feed→liquefier→liquid infrastructure→vaporizer→pressure infrastructure/vessel→gas collector. Assert gas hidden before observation, both new reactions discovered only by output, downstream granules produced, auditLedger true after every update, detached snapshots and future restore equality.
- [ ] Extend interaction tests for pressure-route drag/rotation/preview/selection and session tests for the new save slot. Test that toolbar/help requires no undiscovered material or reaction output name.
- [ ] Run gas chain/interaction/session tests; verify RED for missing controls or chain behavior.
- [ ] Add toolbar/icons, construction previews, distinct pressure-line markings/vessel/compressor rendering, directional sockets, quantity/capacity inspectors, empty-line reconfiguration, compressor toggle and reclaim controls. Show gas interface help and gas inventory in closed-factory inspection via localized resources.
- [ ] Run focused domain/presentation tests and typecheck; commit after GREEN.

## Task 6: Full gate, browser acceptance and scoped delivery

- [ ] Recheck live #109/#100 and open PRs before external delivery; resolve any scope conflict explicitly. Self-review changes against the approved spec and five review-focus cases.
- [ ] Run `npm test -- --maxWorkers=4`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Record exact test counts, skips, commands and any failure; repair failures with focused regressions before repeating necessary checks.
- [ ] Start the local app and use normal controls to construct the chain, discover gas, fill/block a vessel, stop admission, drain to a compatible destination, reroute empty infrastructure and resume. Show ordinary liquid/solid incompatibility without losing output. Save/reload/restore and inspect closed/reopened factory state. Capture screenshots and console diagnostics. Never inject state as acceptance evidence.
- [ ] Write `PHASE9_GAS_ACCEPTANCE.md` with domain evidence, browser checkpoints, schema/content/blueprint versions and intentional limits. Update accepted simulation/content/decision and execution docs; #100 remains open and #110 is only the next dependency, not automatically implemented.
- [ ] Review the complete diff locally; commit the final scoped change. Open one PR referencing #109 using `gh` with a body file, attach it to this chat, and record exact local checks. Do not call absent remote CI green. Merge only after the actual acceptance gate and applicable review workflow are satisfied; confirm issue/epic state after any merge.

## Plan Self-Review

All approved spec sections map to Tasks 1–6. Names and versions are fixed above; gas and liquid infrastructure remain separate records. Each review-focus case belongs to an explicit test step. No dependency, worker, pressure model, cylinder packing, terminal handling or later-phase implementation is introduced. Execution method remains native as requested.

## Execution status — 2026-10-03

Tasks 1–5 implemented and verified; Task 6 local/domain/browser gate complete, scoped GitHub delivery in progress. Detailed test evidence lives in PHASE9_IMPLEMENTATION_LOG.md and PHASE9_GAS_ACCEPTANCE.md. Original checklist above is retained as the approved plan rather than claiming that every proposed individual test assertion was authored verbatim.

Deviations: the coupled content/save/runtime/UI changes are delivered in one coherent commit after checks rather than per-task commits. Browser acceptance filled and drained a 4-unit line into a real vessel; full 48-unit vessel blockage is covered by domain tests. Final browser reroute enabled the feed but subsequent production was fuel-blocked; deterministic domain recovery/resume covers that behavior. No independent agent review was requested or performed. No blueprint stamping or new Studio editor was added because the existing APIs only export/parse layout and preserve authoring configuration.
