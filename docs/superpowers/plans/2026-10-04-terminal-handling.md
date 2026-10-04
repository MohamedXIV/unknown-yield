# Physical Terminal Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User-selected execution is native in this session; no subagents, remote agents or worktree.

**Goal:** Deliver #111: physically stage and export the existing liquid and gas through installed compatible terminal modules without losing, duplicating or revealing hidden material.

**Architecture:** Two content-authored fixed terminal inlets own independent single-material holdings. Pure sim-core implements installation, receiving admission, export settlement and save/ledger validation; React and Phaser consume sanitized snapshots. Extend existing milestone and market contracts, keeping dry staging behavior intact.

**Tech Stack:** Existing TypeScript, Zod, Vitest, React/Next.js, Phaser and TinyBase; no dependencies added.

**Spec:** [Approved terminal handling design](../specs/2026-10-04-terminal-handling-design.md), written-spec approval received on 2026-10-04.

## Execution status — 2026-10-04

Tasks 1–7 completed natively: content commit d5f293f; integrated runtime/UI commit 94e5d5e. Task 8 local verification complete, scoped PR delivery pending. The detailed checklist below remains the original intended procedure; exact test grouping/names and separate per-task commits were superseded by the execution rulings in [the implementation ledger](../../PHASE9_TERMINAL_IMPLEMENTATION_LOG.md). No omitted gameplay requirement is inferred from that procedural change.

- [x] Author protected executable dock definitions and evidence unlocks.
- [x] Install/remove atomically with exact embodied costs and valid current saves.
- [x] Admit through native directed transport; refuse and back up physically.
- [x] Settle physical cargo once through existing economy/order bookkeeping.
- [x] Sanitize detached views and restore deterministic futures.
- [x] Reconcile connected factory contracts; prove normal-command fresh chain and blueprint exclusion.
- [x] Expose localized playable controls and physical inlet markers.
- [x] Run native self-review, full tests, typecheck/lint/build/static export and normal-controls browser acceptance.
- [ ] Commit final evidence, push and create/attach the scoped PR.
- [ ] Final user approval and verified merge; keep #100 open and do not start later scope.

## Global Constraints

- Work in `F:\_WIP\unknown-yield` on `codex/111-terminal-handling`, based on main `9a2f7be167f013454491d5781ee6370175b9170d`; live GitHub is canonical.
- sim-core owns admission, inventories, progression, export and conservation. Hidden recipes and undiscovered material identities remain private.
- Save schema 17 / content `world-01-v10` / browser save slot v11. Factory blueprint schema remains 5.
- Accept only schema 17 for this content version and explicitly reject older saves atomically without replacing the running world.
- No pressure/fluid physics, leaks, hazards, movable cylinders, terminal building placement, imports, new chemistry, generic transport abstraction, dependencies, workers, aggregate execution, remote agents, worktrees, Vercel changes or later-phase systems.
- Newly authored player-facing text uses locale resources. Egyptian Arabic communication, English technical terms.
- Execute native task-by-task; self-review locally. Final user approval is required before merge; do not start #112/#113 or close #100.

## Review Focus

1. A preview or repeated install/remove must not mutate plates, contents, IDs or progression (Task 2).
2. Several inlet-facing sources must not over-reserve capacity, mix identity or admit through another side (Task 3).
3. A listing or Export policy must not bypass company knowledge or ship a holding twice (Tasks 4 and 5).
4. Hidden cargo and a tampered module record must not leak through snapshots or replace the live save (Tasks 5 and 6).
5. Installing an unrelated dock must not erase an unrelated factory certificate; a changed receiving contract must invalidate the affected certificate (Task 6).

## File Map

- Content definition/validation/fixture/localization: `packages/content/src/schema.ts`, `fixture.ts`, `locale.ts`; preserve base-content roundtrip in `studio.ts` only if existing preservation needs adjustment.
- New focused domain file: `packages/sim-core/src/terminal.ts`, owning module eligibility, receiving target, views and settlement. Keep transport algorithms in `liquids.ts`, `gases.ts`, `production.ts`.
- Runtime boundaries: `types.ts`, `commands.ts`, `save.ts`, `ledger.ts`, `simulation.ts`, `factory-throughput.ts`; existing `milestones.ts`, `market.ts`, `opportunities.ts` remain the progression/economy authorities.
- Player presentation: `apps/web/components/GameClient.tsx`, `apps/web/game/world.ts`, `session.ts`; test pure presentation calculations in a small `apps/web/game/terminal-presentation.ts` if needed by both renderers.
- Focused tests: new `terminal-content`, `terminal-modules`, `terminal-transport`, `terminal-export`, `terminal-persistence`, `terminal-knowledge`, `terminal-chain` files; extend existing factory/session/i18n/Studio tests.
- Canonical docs/evidence: EXECUTION, CONTENT_MODEL, SIMULATION, DECISIONS, Phase 9 implementation log and new scoped terminal acceptance/implementation logs.

### Task 1: Author executable terminal definitions and evidence gates

**Files:** Modify content `schema.ts`, `fixture.ts`, `locale.ts`; test `packages/content/test/terminal-content.test.ts`, `studio.test.ts`, and current fixture version expectations in `content.test.ts`, `containment-content.test.ts`, `apps/web/test/phase4-exit.test.ts`.

**Interfaces:** Produce `Content["site"]["terminalModules"][number]` with `id`, `nameKey`, `handlingState`, `containmentCapabilities`, `capacity`, `cost`, `requiredTerminalCapabilityId`, `inlet: { x, y, side }`. Defaults to `[]`; values and stable IDs are exactly the spec's table. Extend `contentKeys(c)` for module localization.

Representative fixture assertions:
```ts
expect(fixture.site.terminalModules.find(d => d.id === "liquid-dock"))
  .toMatchObject({ capacity: 24, cost: 30, inlet: { x: 1, y: 3, side: 1 } });
expect(fixture.site.terminalModules.find(d => d.id === "gas-dock"))
  .toMatchObject({ capacity: 16, cost: 36, inlet: { x: 3, y: 1, side: 0 } });
```

- [ ] Write failing tests named `validates authored dock geometry and protection`, `rejects module progression soft locks`, and `roundtrips terminal base content through Studio`. Assert fixture liquid inlet `{x:1,y:3,side:1}`, capacity 24, cost 30; gas inlet `{x:3,y:1,side:0}`, capacity 16, cost 36; empty legacy module array; exact module/milestone/listing preservation after Studio import/export. Mutate duplicate IDs/states/cells, wrong edges/sides, unknown capability, missing logistics, absent corrosion protection, missing unlocker, dependency cycles and direct/transitive blocked export/order prerequisites; each must throw.
- [ ] Run `npx vitest run packages/content/test/terminal-content.test.ts packages/content/test/studio.test.ts`; confirm intended RED assertions, not environment failures.
- [ ] Implement definitions and validation using the existing capability/milestone dependency traversal. Add `liquid-outbound` from `liquefy-raw` and `gas-outbound` from `vaporize-liquid-0`, with no reward or timed prerequisite. Add liquid Exchange compensation 6/2 and gas 8/3; demand 10000, saturation 1000, recovery 250. Localize generic milestone hints without predicted output/recipe. Preserve all existing granules definitions.
- [ ] Run the focused command plus `npx vitest run packages/content/test apps/web/test/phase4-exit.test.ts`; require PASS.
- [ ] Commit scoped content and tests as `feat(content): author physical terminal docks (#111)`.

### Task 2: Native installation, exact embodiment and valid current saves

**Files:** Create `packages/sim-core/src/terminal.ts`; modify `types.ts`, `commands.ts`, `save.ts`, `ledger.ts`; create `packages/sim-core/test/terminal-modules.test.ts`, `terminal-persistence.test.ts`; update version-related assertions in existing domain tests.

**Interfaces:** Produce `TerminalModuleContents = { materialId: string | null; quantity: number }`, `Save.terminalModules: Record<string, TerminalModuleContents>`, and commands `installTerminalModule` / `removeTerminalModule` with `definitionId`. `terminalModuleDefinition(c: Content, id: string)` returns the matching definition or undefined; `terminalModuleUnlocked(c: Content, s: Pick<Save,"milestones">, id: string): boolean` consumes existing `terminalCapabilityUnlocked`. New ledger category `terminalModules` holds dock cargo; existing `embodied` includes each installed module's cost once.

For a valid unlocked simulation `sim`, installation assertions:
```ts
const before = sim.serialize();
expect(sim.preview({ type: "installTerminalModule", definitionId: "liquid-dock" }).ok).toBe(true);
expect(sim.serialize()).toEqual(before);
expect(sim.command({ type: "installTerminalModule", definitionId: "liquid-dock" }).ok).toBe(true);
expect(sim.serialize().stock.plates).toBe(before.stock.plates - 30);
expect(sim.serialize().nextId).toBe(before.nextId);
expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
```

- [ ] Write failing tests `installs and reclaims exact embodied plates without consuming entity IDs`, `preview and refused module commands are atomic`, `loads only valid current dock holdings`, and `rejects prior schema without replacing the current expedition`. Use valid confirmed evidence to unlock gates; assert install liquid debits 30, gas 36, empty removal refunds exact amounts, nextId is unchanged and auditLedger is clean. Duplicate/unknown/locked/underfunded install, missing removal and loaded removal leave serialize() identical; previews also do.
- [ ] Run `npx vitest run packages/sim-core/test/terminal-modules.test.ts packages/sim-core/test/terminal-persistence.test.ts` and confirm RED.
- [ ] Implement command validation/mutation and initial schema 17 state with empty module map. Keep new liquid/gas policies Keep, existing solid defaults intact. Validate module key/reference, capability legitimacy, integer capacity and material/null coherence, known identity, state and containment before ledger reconciliation. Schema 17 must include the map; malformed or unknown records cannot be silently stripped/repaired.
- [ ] Preserve historical migration code for non-current custom content. Add an early rejection for schema <17 against `world-01-v10` before any migration. A non-current legacy fixture may advance 16 to 17 only with an empty module map; legacy module payloads are refused. Move migration-only tests to explicitly named historical content without terminal modules, preserving their original behavior assertions. For current-fixture tests such as containment schema15 acceptance, replace the old acceptance expectation with atomic incompatibility refusal. Do not delete migration or behavioral regression coverage to pass the gate.
- [ ] Run the two focused files, then `npx vitest run packages/sim-core/test/persistence.test.ts packages/sim-core/test/ledger.test.ts packages/sim-core/test/containment-persistence.test.ts packages/sim-core/test/gas-persistence.test.ts packages/sim-core/test/liquid-persistence.test.ts`; require PASS.
- [ ] Commit as `feat(sim): persist physical terminal modules and exact construction (#111)`.

### Task 3: Real inlet admission and upstream backpressure

**Files:** Modify `terminal.ts`, `liquids.ts`, `gases.ts`, `containment.ts`; create `packages/sim-core/test/terminal-transport.test.ts`; retain liquid/gas/containment transport tests.

**Interfaces:** `terminalModuleAt(c: Content, point: Point, direction: number, state: "liquid" | "gas")` returns the matching definition or undefined, resolving relative inlet and inward direction. `terminalReceiver(c: Content, s: Save, point: Point, direction: number, state: "liquid" | "gas")` returns null or `{ id, capabilities, material, quantity, capacity, put(materialId: string, units: number): void }`, matching existing native target shapes. `terminalInletDiagnostic(...)` with the same arguments plus `materialId: string` returns `TransportDiagnostic | null`; null means no terminal encounter. Add diagnostic reasons `terminal-module-missing` and `terminal-module-locked` with optional `terminalModuleId`; keep current sanitizer.

Geometry assertions independent of seeded cargo:
```ts
expect(terminalModuleAt(fixture, { x: 39, y: 29 }, 3, "liquid")?.id).toBe("liquid-dock");
expect(terminalModuleAt(fixture, { x: 41, y: 27 }, 2, "gas")?.id).toBe("gas-dock");
expect(terminalModuleAt(fixture, { x: 39, y: 29 }, 0, "liquid")).toBeUndefined();
expect(terminalModuleAt(fixture, { x: 39, y: 29 }, 3, "gas")).toBeUndefined();
```

- [ ] Write `receives only from the authored installed compatible inlet`, `backs up independently at capacity without mixing`, and `refuses wrong-state and missing modules without source or fuel mutation`. Assert northward liquid `(39,30)` reaches 24-unit dock and westward gas `(42,27)` reaches 16-unit dock; all other sides/directions refuse. Use a validated custom unprotected module/material fixture to prove missing-containment refusal without weakening canonical content validation. Fill to capacity minus one and test final bounded arrival; incoming different material cannot replace a loaded identity; dry staging quantity is unchanged.
- [ ] Run `npx vitest run packages/sim-core/test/terminal-transport.test.ts`; confirm RED.
- [ ] Return module receiver targets from native line target resolution after existing line/tank/machine checks. Consume the normal source and destination reservation maps and commit flow; do not introduce a second transfer pass or bypass source pump/compressor rules. Report terminal-specific diagnostics before generic no-route diagnostics. Keep receiving checks before reservations/fuel/mutations.
- [ ] Run focused terminal test plus `npx vitest run packages/sim-core/test/liquid-logistics.test.ts packages/sim-core/test/gas-logistics.test.ts packages/sim-core/test/containment-transport.test.ts packages/sim-core/test/storage.test.ts`; require PASS.
- [ ] Commit as `feat(sim): admit sealed cargo through physical terminal inlets (#111)`.

### Task 4: One physical export settlement path

**Files:** Modify `terminal.ts`, `production.ts`; create `packages/sim-core/test/terminal-export.test.ts`; extend market/opportunity tests only where needed.

**Interfaces:** `settleTerminalExports(c: Content, s: Save): void` consumes dry staging and installed dock holdings, companyKnowsMaterial, exchangeDefinition, terminalCanExport, applyExportCompensation and recordOrderExport. `production.transport` invokes it once at its existing export position, after gas/liquid transfer on simulation's transport cadence. No new public economy authority.

For valid known/unlocked `state` with installed liquid dock holding 2, Export policy and debt 20 at baseline market:
```ts
settleTerminalExports(fixture, state);
expect(state.terminalModules["liquid-dock"]).toEqual({ materialId: null, quantity: 0 });
expect(state.debt).toBe(8);
expect(state.flows.exported["liquid-0"]).toBe(2);
expect(state.market["liquid-0"].saturationBps).toBe(2000);
const shipped = structuredClone(state);
settleTerminalExports(fixture, state);
expect(state).toEqual(shipped);
```

- [ ] Write `keeps dock cargo until legal policy and physical export`, `settles debt market and orders once per shipped holding`, and `dry and sealed inventories never mirror cargo`. Assert each Keep holding remains unchanged; export liquid units 2 produces gross 12 at base demand, reduces debt first, advances flows/exported by 2 and saturation by 2000, empties identity to null, then a second cadence grants no reward. A valid custom matching order progresses only from shipment; each unit belongs to at most one active order. Unknown/unlisted material, missing capability or absent/incompatible installation cannot settle.
- [ ] Run `npx vitest run packages/sim-core/test/terminal-export.test.ts`; confirm RED.
- [ ] Extract the existing dry settlement into the shared function and apply the exact same compensation/order bookkeeping to module contents. Check company knowledge explicitly before any debit. Preserve current dry arrival/staging/capability behavior and market cadence.
- [ ] Run focused test plus `npx vitest run packages/sim-core/test/market.test.ts packages/sim-core/test/milestones.test.ts packages/sim-core/test/opportunities.test.ts packages/sim-core/test/phase5-exit.test.ts`; require PASS.
- [ ] Commit as `feat(sim): settle physical dock exports through the exchange (#111)`.

### Task 5: Sanitized snapshots and deterministic restoration

**Files:** Modify `terminal.ts`, `types.ts`, `simulation.ts`, `save.ts`; create `packages/sim-core/test/terminal-knowledge.test.ts`; extend `terminal-persistence.test.ts`.

**Interfaces:** `TerminalModuleView` extends content module definition with `installed`, `unlocked`, `contents: TerminalModuleContents`, `canInstall`, `canRemove`, and `blockedReason` (null or `locked`, `installed`, `needs-stock`, `not-installed`, `loaded`). `terminalModuleViews(c: Content, s: Save): TerminalModuleView[]` feeds detached `PlayerSnapshot.terminalModules`. Known-only material/listing and existing publicTransportDiagnostic gates stay authoritative; view definition contains no reaction IDs or predicted outputs.

Fresh-world privacy assertions:
```ts
const view = new Simulation(fixture).snapshot();
expect(view.materials.some(m => ["liquid-0", "gas-0"].includes(m.id))).toBe(false);
expect(view.exchange.some(m => ["liquid-0", "gas-0"].includes(m.materialId))).toBe(false);
expect(view.terminalModules.every(m => !m.installed && !m.unlocked)).toBe(true);
```

- [ ] Write `does not expose undiscovered listings cargo or reaction outcomes`, `detaches terminal views from authoritative state`, and `resumes exact dock and upstream futures without reward replay`. Fresh snapshot has generic module information but no liquid/gas material or listing; after liquid evidence only liquid appears. Mutate returned contents and assert serialize unchanged. Save simultaneous dock holdings, line cargo, Keep/Export and open debt; restore and compare serialize after each of 60 equal steps with auditLedger green.
- [ ] Add tampering cases for quantity/null mismatch, unknown module/material, over-capacity, incompatible protection/state, illegitimate unlock, omitted current module map, and modified embodied cost reconciliation; every rejected load preserves the complete running state.
- [ ] Run `npx vitest run packages/sim-core/test/terminal-knowledge.test.ts packages/sim-core/test/terminal-persistence.test.ts`; confirm RED, implement views/validation, rerun to PASS.
- [ ] Commit as `feat(sim): expose safe terminal views and validate restoration (#111)`.

### Task 6: Contract certification and fresh-world integrated chain

**Files:** Modify `factory-throughput.ts`, `simulation.ts`; extend `packages/sim-core/test/factory-throughput.test.ts`, `factory-blueprint.test.ts`; create `packages/sim-core/test/terminal-chain.test.ts`.

**Interfaces:** Install/remove success in `Simulation.command` uses observe rather than reset, alongside existing liquid profile command handling. Extend existing connected line/topology signature traversal to collect terminal encounters reached by liquid/gas routes; include relevant module definition/installation/capability/contents and policy in that external receiving signature. Do not add modules to `FactoryMembers` or blueprints.

- [ ] Write `preserves unrelated certification and withdraws a changed terminal receiving contract`, using genuinely certified factories rather than private monitor stubs. Assert unrelated certificate remains after install/remove, while a connected dock contract change withdraws certification. Assert exported blueprint schema remains 5 and has no terminalModule payload.
- [ ] Write `discovers installs stages and exports both states from a fresh world`. Build with normal commands using existing gas-chain/liquid-chain placement patterns; start without knowledge/evidence/seeding. Observe module refusal before installation, run real liquefy and vaporize jobs, install modules after evidence, connect directed routes, Keep actual dock cargo, test loaded removal refusal, save/restore and ship both legally. Audit every step and compare exact source/holding/export changes. Bound step loops with clear failure diagnostics; use normal assistance only if fuel requires it.
- [ ] Run `npx vitest run packages/sim-core/test/factory-throughput.test.ts packages/sim-core/test/factory-blueprint.test.ts packages/sim-core/test/terminal-chain.test.ts`; confirm intended RED and implement signature/integration fixes.
- [ ] Rerun the command plus existing gas-chain/liquid-chain/phase6-exit tests; require PASS.
- [ ] Commit as `feat(sim): reconcile terminal contracts and prove native cargo exports (#111)`.

### Task 7: Playable terminal controls and inlet presentation

**Files:** Modify `apps/web/components/GameClient.tsx`, `apps/web/game/world.ts`, `session.ts`, content `locale.ts`; create `apps/web/game/terminal-presentation.ts` and `apps/web/test/terminal-presentation.test.ts` if shared calculations justify it; extend `apps/web/test/session.test.ts`, `i18n.test.ts`, `studio-workbench.test.ts`.

**Interfaces:** UI consumes `snapshot.terminalModules`, commands from Task 2 and existing per-material policies. Pure presentation helper, if needed: `terminalInletPoint(terminal: Rect, inlet: {x:number;y:number;side:number}): Point` returns absolute cell; no simulation state mutation. Preserve old save-slot fallback reads, write only `industrial-site-save-v11`; rejected older records remain unmodified.

- [ ] Write pure tests pinning inlet coordinates `(39,29)` and `(41,27)`, generic locked views without hidden material, localized module/diagnostic/result keys, current slot writes and atomic prior-schema refusal; preserve valid current save restoration through supported fallback lookup without claiming old-schema compatibility.
- [ ] Run `npx vitest run apps/web/test/session.test.ts apps/web/test/i18n.test.ts apps/web/test/terminal-presentation.test.ts` when helper exists; confirm intended RED.
- [ ] Render dock cost, capability/installation, quantities/capacity, discovered cargo, install/remove buttons with disabled reasons and absolute inlet/outside approach coordinates. Keep liquid/gas policy labels separate from dry staging totals; retain existing solid controls. Draw authored inlet markers and installed/locked/full state in Phaser from snapshots, using existing world drawing patterns; no per-frame React transform flow.
- [ ] Run the focused web tests plus Studio roundtrip test, `npm run typecheck` and `npm run lint`; require PASS before browser acceptance.
- [ ] Commit as `feat(web): expose physical terminal docks and staging controls (#111)`.

### Task 8: Browser gate, canonical evidence and scoped delivery

**Files:** Modify `docs/EXECUTION.md`, `CONTENT_MODEL.md`, `SIMULATION.md`, `DECISIONS.md`, `PHASE9_IMPLEMENTATION_LOG.md`; create `docs/PHASE9_TERMINAL_IMPLEMENTATION_LOG.md`, `PHASE9_TERMINAL_ACCEPTANCE.md` and `docs/evidence/phase9-terminal-*.jpg`.

**Interfaces:** Evidence records commands/results, exact behavioral HEAD and truthful browser observations; live #111/PR owns delivery status. No synthetic game state or manufactured pass claims.

- [ ] Self-review the whole scoped diff against the spec, including shared export double-counting, reservations, legacy-save boundary, hidden knowledge and factory signatures. Fix actionable findings and rerun affected focused checks.
- [ ] Run `npm test -- --maxWorkers=4` alone; then `npm run typecheck`, `npm run lint`, `npm run build` with static export verification, and `git diff --check`. Record exact counts/skips and any failures/retries. Do not run full tests concurrently with build or alter timeouts.
- [ ] Start a local server using existing npm scripts and operate the browser through normal UI. Discover each state, approach its authored inlet, observe missing-module refusal, install after unlock, stage Keep cargo and refuse loaded removal. Demonstrate backpressure, Save/Load retained upstream/dock quantities and installation, then Export with visible totals and economy effects. Inspect console and capture screenshots. Record explicitly when capacity proof is domain-only; stop the local helper server before the production build if it conflicts.
- [ ] Write acceptance/implementation evidence and canonical contract/version/decision updates, including #110 merged via #164 and #111 active; keep #100 open. Mark this plan checklist from actual work only. No claim of merge until live state confirms it.
- [ ] Commit evidence as `docs: record terminal handling acceptance (#111)`, push this branch, create one PR with `Closes #111` and exact checks, and attach it to this chat. Re-read live #111 and confirm exact local/remote head. Report check failures honestly; Vercel remains excluded per user instruction.
- [ ] Present the concrete verified PR for final merge approval. After approval, ordinary squash merge matching the verified head, checkout/pull main in this same folder, confirm identical tree/clean state, and update #100 checklist. Do not implement the next scope.

## Execution Handoff

Plan self-review covers all approved spec sections and each Review Focus case in its owning task. Native execution is already selected by the user's same-checkout/no-agents constraints. Written-plan approval was received; native implementation and verification are recorded above. Final merge approval is still pending.
