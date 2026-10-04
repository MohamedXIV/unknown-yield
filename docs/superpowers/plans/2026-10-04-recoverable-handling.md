# Contained Pump Failure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user selected native execution in this session, same checkout, no subagents, remote agents or worktree.

**Goal:** Deliver #112: one authored pump failure traps conserved cargo, then recovers through a physical protected route, empty upgrade/repair and resumed industry.

**Architecture:** Extend existing Pump records with a bounded incident chamber. Native `liquids.ts` retains sole transport/reservation authority; focused pure `pump-recovery.ts` owns rule eligibility, validation, repair eligibility and safe views. Existing ledger/save/factory/presentation boundaries consume this state.

**Tech Stack:** Existing TypeScript, Zod, Vitest, React/Next.js, Phaser and TinyBase; no dependencies.

**Spec:** [Approved contained pump failure design](../specs/2026-10-04-recoverable-handling-design.md), written-spec approval received 2026-10-04.

## Global Constraints

- Same folder `F:\_WIP\unknown-yield`, branch `codex/112-recoverable-handling`, base main `d8578d622e63d7695b2442c3936218d77867cb98`. Live GitHub overrides stale docs. #111 merged through #165; #112 active; #100 OPEN.
- Save **18**, fixture **world-01-v11**, browser slot **v12**. Blueprints remain conditional schemas **1–5**, excluding recovery state.
- Rule `pump-corrosion`: exposed profile `standard`, missing capability `corrosion-resistant`, trapped capacity **1**. Existing chemistry/materials unchanged.
- sim-core owns all authoritative state; newly authored visible text uses localization resources; hidden outcomes stay private.
- Failed feed spends no successful-transfer fuel; service drainage spends **0 fuel** and admits no fresh source cargo. Upgrade uses existing exact profile cost; repair grants/consumes no material or fuel.
- No spreading spill, pollution, leaks, pressure/temperature physics, RNG, explosions, destruction, gas failures, generic hazard framework, repair consumables, dependencies, workers, aggregate execution, Vercel work, agents or worktrees.
- Do not start #113 or close #100. Concrete verified PR merge requires final user approval.

## Review Focus

1. Shared-source pumps cannot trap duplicate cargo or depend on insertion order (Task 3).
2. Service toggles at zero fuel cannot admit fresh cargo or drain newly trapped charge twice in a cadence (Task 3).
3. Loaded profile/reclaim/feed-enable/repair commands and previews refuse without changing the complete save (Task 2).
4. Source reclaim and empty protective upgrade preserve a legitimate incident, while forged loaded upgraded state rejects atomically (Task 4).
5. Incident diagnosis stays visible when disabled/unfueled; unrelated failures do not erase unrelated certification (Tasks 5–6).

## File Map

- Content: `packages/content/src/schema.ts`, `fixture.ts`, `locale.ts`; new `packages/content/test/pump-failure-content.test.ts`; existing Studio tests.
- Domain: new `packages/sim-core/src/pump-recovery.ts`; modify `types.ts`, `commands.ts`, `liquids.ts`, `ledger.ts`, `save.ts`, `simulation.ts`.
- Factories: `factory-contract.ts`, `factory-throughput.ts`; `factory-blueprint.ts` only if explicit export exclusion needs adjustment.
- Domain tests: new `pump-recovery-helpers.ts`, `pump-failure.test.ts`, `pump-recovery.test.ts`, `pump-recovery-commands.test.ts`, `pump-recovery-persistence.test.ts`, `pump-recovery-knowledge.test.ts`, `pump-recovery-chain.test.ts`; extend existing factory/blueprint tests and `historical-content.ts`.
- Player: `apps/web/components/GameClient.tsx`, `apps/web/game/world.ts`, `session.ts`; existing session/i18n/interaction tests.
- Docs: EXECUTION, CONTENT_MODEL, SIMULATION, DECISIONS, PHASE9_IMPLEMENTATION_LOG; new PHASE9_RECOVERY_IMPLEMENTATION_LOG, PHASE9_RECOVERY_ACCEPTANCE and `docs/evidence/phase9-recovery-*.png`.

### Task 1: Executable authored rule and recoverability validation

**Interfaces:** Optional `liquidLogistics.pump.containmentFailure = {id,nameKey,descriptionKey,exposedProfileId,missingCapabilityId,trappedCapacity}`. Locale keys `handling.failure.pump-corrosion.name` / `.description` enter `contentKeys`; no hidden material IDs in equipment copy.

- [ ] Write `authors one bounded rule and preserves it through Studio`: assert exact IDs/capacity, version and base-content roundtrip. Write `rejects invalid exposure or unrecoverable rule`: unknown references, missing locale, exposed profile providing protection, no affected executable liquid source, no protective pump profile, pipe or tank. Rule absence remains valid.
- [ ] Run `npx vitest run packages/content/test/pump-failure-content.test.ts packages/content/test/studio.test.ts`; confirm intended RED.
- [ ] Add optional schema, fixture rule/version and localized resources. Validate effective base-plus-profile capabilities with the existing all-of predicate, compatible executable liquid source and protective pump/pipe/tank options. Preserve unrelated content.
- [ ] Run `npx vitest run packages/content/test apps/web/test/phase4-exit.test.ts`; require PASS; update relevant fixture-version expectations only.
- [ ] Commit `feat(content): author recoverable pump containment failure (#112)`.

### Task 2: Incident state, conserved holdings and guarded commands

**Interfaces:** `PumpIncident = {definitionId:string,materialId:string,quantity:number,startedAt:number,drainEnabled:boolean}`; required `Pump.incident:PumpIncident|null`, placement null. In `pump-recovery.ts`: `pumpFailureDefinition(c:Content)` returns optional rule; `pumpExposureEligible(c:Content,p:Pump,materialId:string):boolean` checks exposed profile and exactly one authored missing capability; `pumpRepairEligible(c:Content,p:Pump):boolean` requires incident, zero charge, disabled feed and compatible protection. Commands `{type:"setPumpRecoveryDrain",id:string,enabled:boolean}` / `{type:"repairPump",id:string}`.

- [ ] Create `pump-recovery-helpers.ts`: `recoveryRig(content=fixture)` returns `{sim,pumpId,sourceMachineId,firstPipeId}`. Use normal construction then a valid known-liquid unit fixture with seeded machine output/produced counts reconciled by load. Task 5 fresh chain must not seed state.
- [ ] Write `loaded incident commands and previews are atomic`, `repairs only empty protected disabled pumps without rewards`, `reclaims only empty charge for exact embodiment`. Rejected enable/profile/dismantle/repair and previews preserve serialize; stop-feed/service toggles idempotent. Empty Standard→Lined upgrade costs **4**, Lined reclaim refunds **16**. Repair clears incident, stays disabled, changes no fuel/material/flows/IDs.
- [ ] Run `npx vitest run packages/sim-core/test/pump-recovery-commands.test.ts`; confirm RED.
- [ ] Implement helpers, command schema/dispatch and extended loaded guards; profile changes never clear incident. Add ledger category `pumpIncidents`, counted once in held totals; embodiment remains current profile cost. Adapt Pump parsing for valid incident unit fixtures; Task 4 owns final versions/migrations/tamper validation. Add incident=null to explicit existing Pump literals without weakening assertions. Current API has no pump rotation; do not add one.
- [ ] Rerun focused command tests plus `containment-construction.test.ts` and `liquid-logistics.test.ts`; require PASS.
- [ ] Commit `feat(sim): track pump incidents and recovery commands (#112)`.

### Task 3: Atomic exposure and physical zero-fuel service drainage

**Interfaces:** Keep `transportLiquids(c,s,onMove?)` sole transport pass. Extend `LiquidPumpStatus` with `incident`. Add `pumpRecoveryDiagnostic(c:Content,s:Save,p:Pump):TransportDiagnostic|null` in `liquids.ts`: no incident=null; closed service=disabled; empty charge=needs-input; loaded open service uses normal receiver diagnostics.

- [ ] Write `traps one feasible charge once without fuel or downstream delivery`: source minus **1**, chamber=1, feed=false, target/fuel/counters unchanged, no successful delivery callback; repeat traps nothing. Write `ordinary refusals stay unchanged`: disabled/unfueled/missing/full/wrong direction/state/identity, extra missing requirement, protected pump or absent rule causes no incident.
- [ ] Write `shared source reservation is insertion-order independent`: multiple consumers cannot overdraw/duplicate charge. Use a valid custom shared-source placement if geometry permits; otherwise explicitly document a transport-only pre-step fixture rather than weakening placement validation.
- [ ] Write `drains only pre-step charge into protected capacity at zero fuel`, `service never admits fresh source`, `blocked service resumes after capacity frees`. Source stays unchanged; charge enters next pipe, not distant tank; route/protection/identity/full refusal retains charge/fuel. Newly created charge cannot drain in its creation cadence; ledger audits after each step.
- [ ] Run `npx vitest run packages/sim-core/test/pump-failure.test.ts packages/sim-core/test/pump-recovery.test.ts`; confirm RED.
- [ ] Integrate authored exposure after source/fuel/receiver eligibility using existing stable ordering/source reservations. Bound charge by capacity, unreserved source, transfer limit and available receiver capacity; reserve no downstream quantity. Commit withdrawal/incident/disable atomically. Process pre-step service charge through shared destination reservations at zero cost; normal fresh-source admission is excluded. Incident status outranks disabled/fuel; do not broaden the shared containment predicate.
- [ ] Run focused tests plus `liquid-logistics.test.ts`, `containment-transport.test.ts`, `terminal-transport.test.ts`, `gas-logistics.test.ts`; require PASS. Update only prior tests explicitly affected by the new authored exposure, preserving all other refusal assertions.
- [ ] Commit `feat(sim): fail and drain bounded pump charges physically (#112)`.

### Task 4: Strict schema 18 and deterministic restoration

**Interfaces:** `validatePumpIncident(c:Content,p:Pump,tick:number,known:ReadonlySet<string>):void` in `pump-recovery.ts`. Schema 18 Pump fields are required/strict. Current fixture or rule-bearing content rejects schema <18 before world replacement. Historical no-rule content migrates older pumps with incident=null; legacy non-null incidents reject.

- [ ] Write `restores loaded blocked draining and empty upgraded incidents`: compare complete futures for **60 steps**, auditing ledger, preserving source/receiver/dock/debt/policy/fuel. Include source reclaimed after capture; no immutable origin reference is required.
- [ ] Write `rejects forged incidents and old current saves atomically`: unknown rule/material, omitted/extra fields, negative/fractional/over-capacity charge, future tick, enabled failed pump, material lacking required capability, loaded changed profile, invalid drain boolean and corrected-ledger incompatible holdings. Empty Lined incident awaiting repair loads. Matching historical schema 17 adds null without inventing cargo/economic state.
- [ ] Run `npx vitest run packages/sim-core/test/pump-recovery-persistence.test.ts`; confirm RED.
- [ ] Bump initial/save schema/error label to 18; early reject incompatible versions, strictly validate incidents separately from ordinary protected inventories, then reconcile ledger. Explicitly omit the new rule in `historical-content.ts`; preserve previous migration paths/assertions, never strip forged incident data.
- [ ] Run focused persistence plus containment/liquid/gas/terminal persistence and `simulation.test.ts`; require PASS.
- [ ] Commit `feat(sim): validate and restore physical pump recovery (#112)`.

### Task 5: Safe views, factory contracts and fresh integrated recovery

**Interfaces:** `PumpIncidentView = Omit<PumpIncident,"materialId"> & {materialId:string|null}`; `pumpIncidentView(c:Content,s:Save,p:Pump):PumpIncidentView|null` sanitizes identity. PlayerSnapshot uses explicit pump view, `canRepair:boolean` and sanitized `recoveryDiagnostic`, with existing structuredClone detachment. `factory-contract.ts` counts charge in physical liquid inventory; relevant recurrence includes incident/service state and cannot certify a failure. Recovery/profile commands observe affected contracts rather than resetting unrelated certificates.

- [ ] Write `sanitizes identity and detaches incident snapshots`, `failure creates no reaction evidence`: generic fresh views omit fluid identities/outcomes, known charge/status remains visible, returned mutation cannot alter truth. Direct helper unknown-identity test sanitizes even though save validation rejects unknown holdings.
- [ ] Extend factory tests: real unrelated certified line survives another factory's recovery toggles/repair; relevant connected incident withdraws certification. Closed/open factory inventory counts charge once. Blueprint keeps conditional schema/layout/profile and failed normal-feed=false; no incident/charge/tick/service state is exported.
- [ ] Write `discovers fails drains repairs and resumes export from fresh commands`: no seeded knowledge/material/market. Build normal liquid chain with Standard pump and Lined first pipe, observe real discovery/capture/upstream remainder, drain into a real protected tank, upgrade empty pump, repair, explicitly enable and resume toward installed compatible liquid dock/export. Save/load mid-incident, compare **60 steps**, audit each tick/command. Ordinary assistance allowed only if fuel depletes; isolated zero-fuel drainage is Task 3.
- [ ] Run new knowledge/chain plus `factory-throughput.test.ts` / `factory-blueprint.test.ts`; confirm intended RED; implement scoped snapshot/accounting/signature/export changes.
- [ ] Rerun plus existing liquid/gas/terminal chains and Phase 6 exit tests; require PASS.
- [ ] Commit `feat(sim): expose safe recovery and reconcile factories (#112)`.

### Task 6: Localized playable recovery controls

**Interfaces:** Inspector consumes incident/canRepair/recoveryDiagnostic and Task 2 commands. Profile selection guards positive charge/enabled feed. Phaser drawing/cache signature includes incident/quantity/service state. Session writes `industrial-site-save-v12`, keeping old read fallbacks and rejected records unchanged.

- [ ] Extend session/i18n tests: v12 writes/fallback current restore, old-schema atomic refusal, locale coverage for failure/service/repair reasons and no authored outcome copy. Run `npx vitest run apps/web/test/session.test.ts apps/web/test/i18n.test.ts`; confirm RED.
- [ ] Add incident quantity/capacity, discovered material, service toggle, repair eligibility/explanation and recovery sequence in pump inspector. Incident diagnosis remains visible disabled/zero-fuel, separate from service blockage. Disable loaded profile/reclaim and incident feed-enable; stop-feed stays legal. Phaser renders failed/service-active state from snapshots. No presentation framework or new rotation command.
- [ ] Run focused session/i18n/interaction, content/Studio preservation, `npm run typecheck` and `npm run lint`; require PASS.
- [ ] Commit `feat(web): present physical pump recovery controls (#112)`.

### Task 7: Acceptance, canonical docs and scoped PR

- [ ] Native whole-diff self-review against spec/Review Focus; fix findings with focused regressions. Use committed `PHASE9_RECOVERY_IMPLEMENTATION_LOG.md` for execution rulings and any necessary combined-interface commit; no agent review or scratch-shell infrastructure.
- [ ] Run full suite alone (`npm test -- --maxWorkers=4`), then typecheck, lint, build/static export verifier and diff check. Record exact counts/skips and failures/retries. Do not increase timeouts or run build concurrently with full tests.
- [ ] Browser normal controls: real discovery, Standard pump exposure with valid Lined outlet, incident/upstream quantities, loaded guards, Save/Load, service drainage through real protected storage, empty upgrade/repair and resumed terminal export. No state injection. Record visible screenshots/console/exact behavioral commit and label domain-only zero-fuel/capacity/future-equivalence scenarios honestly. Stop helper server before conflicting build work.
- [ ] Update canonical docs: #111 confirmed merged/#112 active, explicit exception to #110 refusal, content/save/slot versions, incident conservation/recovery/knowledge/factory/blueprint boundaries and a new accepted decision. Write recovery acceptance/implementation evidence. Keep #100 OPEN; #113 untouched.
- [ ] Commit evidence, push, create one PR with `Closes #112` and exact gate/compatibility limits; attach it to this chat and verify live issue/PR/local/remote head. Do not operate Vercel or claim unobserved remote checks.
- [ ] Present verified PR for final merge approval. Only after approval: ordinary squash merge verified head, update main in this folder, compare trees/clean state and update #100 checklist; do not implement #113.

## Self-review and execution handoff

Spec coverage: rule (1), state/accounting/commands (2), exposure/reservations/service (3), persistence (4), knowledge/factory/blueprint/fresh chain (5), UI/render/session (6), evidence/delivery (7). Every Review Focus has owning tests. Helper names/fields match across tasks. No additional gameplay choice or speculative subsystem is deferred to implementation; pump direction remains immutable.

Native same-checkout/no-agent execution is already selected. Please review this written plan; approval permits invoking executing-plans and beginning product implementation. Final PR merge approval remains separate.
