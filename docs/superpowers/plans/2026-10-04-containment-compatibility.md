# Authored Containment Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax. User selected native execution in the same checkout; no agents or worktrees.

**Goal:** Complete #110 with authored, inspectable containment admission and a playable corrosion-resistant liquid route that preserves exact conservation and hidden knowledge.

**Architecture:** A small pure content predicate combines existing handling states with all required capability IDs. Existing transport engines retain their geometry/reservation algorithms. Liquid profiles add persisted protection settings and embodied construction cost; sanitized sim-core diagnostics drive player explanations.

**Tech Stack:** TypeScript, Zod, Vitest, TinyBase authoring, Phaser presentation, React/Next.js UI; no new dependencies.

**Spec:** [Approved containment design](../specs/2026-10-04-containment-compatibility-design.md), written-spec approval 2026-10-04.

## Global Constraints

- #110 under open #100 only; #109 merged through PR #163. Base main `dd67f42f5e391c425cbbc2188618a4366b4e6821`.
- Native execution in `F:\_WIP\unknown-yield` on `codex/110-containment-compatibility`. No agents/worktrees/Vercel/new dependency.
- sim-core authoritative; requirements visible only for known materials; no hidden reaction/output lookup in diagnostics.
- All requirements are conjunctive; capability sets are unions, not tiers. Refusal never removes material, spends transfer fuel or emits move/export events.
- Fixture `world-01-v9`; save schema 16; session slot v10; profiled liquid blueprint schema 5. Old fixture content may be rejected atomically.
- `standard` profile: empty capabilities and zero added costs. `lined`: `corrosion-resistant`, additional pipe/tank/pump costs 2/10/4 plates. Base costs 2/24/12 remain content-authored.
- Change pipe/tank profile only while empty; change pump profile only while disabled. Pay/refund exact embodied cost difference.
- No damage/leaks/incidents/pressure/temperature physics, new terminal modules, new demo chains or blueprint stamping.
- Merge requires explicit approval on the final PR; keep #100 open and do not implement #111.

## Review Focus

1. A material requires two capabilities and equipment supplies only one: deny with no partial transfer/fuel expenditure (Tasks 1/3).
2. Profile downgrade or same-profile command: exact refund/idempotence; loaded pipes/tanks and enabled pumps cannot bypass guards (Task 2).
3. A held material is not known in the save: diagnostics omit its identity and requirements; equipment labels remain public (Task 4).
4. A legacy/forged save assigns a standard profile to corrosive holdings: reject without replacing the live world; escrow/output buffers remain protected (Task 4).
5. Empty connected external infrastructure changes profile: withdraw certification; unrelated infrastructure does not; blueprint cannot copy contents (Task 5).

## File Responsibilities

- `packages/content/src/containment.ts` (new): pure material-state/capability predicate shared by content validation and simulation. Export through `src/index.ts`.
- Content `schema.ts`, `fixture.ts`, `locale.ts`, `studio.ts`: authored definitions/defaults/reference/semantic/locale validation and JSON-array Studio cells.
- `packages/sim-core/src/containment.ts` (new): liquid profile capability/cost lookup and public diagnostic types/sanitizer. No movement engine.
- Simulation `types.ts`, `commands.ts`, `ledger.ts`, `save.ts`: profiled physical records, command guards/costs, schema 16 and atomic validation.
- `production.ts`, `liquids.ts`, `gases.ts`: use common predicate at every receiving location and pump/compressor admission; generate current-route diagnostic reasons using the same checks.
- `simulation.ts`: detached known-material metadata and sanitized transport diagnostics; never reveal next recipe output.
- `factory-blueprint.ts`, `factory-throughput.ts`: profile layout/settings and certification fingerprints.
- Web `interaction.ts`, `world.ts`, `GameClient.tsx`, `session.ts`, `i18n.ts`: build selection, lining markers, profile controls/diagnostics and v10 save slot.
- New focused tests below; extend existing tests only for touched behavior/version assertions.

## Task 1 — Authored content and pure compatibility

**Interfaces:** `HandlingState = Content['materials'][number]['handlingState']`; `ContainmentResult = {ok:true} | {ok:false; reason:'unknown-material'|'handling-state'|'missing-containment'; missing:string[]}`. Export `checkContainment(content: Content, materialId: string, states: readonly HandlingState[], capabilities: readonly string[]): ContainmentResult` from the content package. Missing IDs are stable/sorted; success ignores capability ordering/duplicates after content validation.

- [ ] Add `packages/content/test/containment-content.test.ts`: `all requirements are needed` checks a material requiring IDs `corrosion-resistant` and `heat-resistant`; one capability returns missing `heat-resistant`, both return `{ok:true}`, wrong handling state fails independently. `invalid authoring rejects` covers unknown/duplicate catalogue IDs/references, missing locale, negative profile costs and malformed/missing/nonzero baseline.
- [ ] Add `machine buffers must contain executable batches`: remove Liquefier output protection or Vaporizer input protection and expect semantic validation to throw; test an extractor output requirement against its definition capability. Default no-requirement content remains valid.
- [ ] Add `Studio retains containment`: export/import material requirements, machine input/output arrays and base capability/profile configuration, then compare validated content exactly. Invalid draft references cannot export/preview.
- [ ] Run `npx vitest run packages/content/test/containment-content.test.ts --maxWorkers=4`; record expected RED for missing predicate/fields.
- [ ] Implement spec's catalogue, material/machine/storage/site/gas/liquid capability fields and liquid profiles in schema with defaults. Add predicate in `src/containment.ts`; validate every matching processor's reaction input/output and extractor output, stable-ID references and profile baseline/costs. Extend locale key coverage.
- [ ] Advance fixture to world-01-v9, add one `corrosion-resistant` capability, attach it only to liquid-0 requirements and the three specified machine interfaces. Author standard/lined profiles with costs above. Add localized profile/capability labels. Studio material/machine cells use JSON strings for arrays rather than illegal TinyBase array cell values; preserve infrastructure as base content.
- [ ] Run new content suite plus `content.test.ts`, `studio.test.ts`, `liquid-content.test.ts`, `gas-content.test.ts`; inspect each result and commit after GREEN.

## Task 2 — Physical profiles, construction and exact cost accounting

**Interfaces:** `Pipe`, `Tank`, `Pump` gain `containmentProfileId: string`. Existing `placePipes`, `placeTank`, `placePump` accept optional `containmentProfileId` (default standard). Add `GameCommand {type:'setLiquidContainmentProfile'; id:string; containmentProfileId:string}`. In sim-core `containment.ts`, define `LiquidKind = 'pipe'|'tank'|'pump'`, `liquidContainment(content:Content, kind:LiquidKind, profileId:string): string[]`, `liquidConstructionCost(content:Content, kind:LiquidKind, profileId:string): number`; unknown profile throws internally and command boundary returns a readable refusal.

- [ ] Add `packages/sim-core/test/containment-construction.test.ts`: a lined pipe costs 4, tank 34, pump 16; preview leaves full save unchanged; an unaffordable path places nothing. `profile cost delta is embodied` upgrades standard pipe for 2, same-profile command changes nothing, downgrade refunds 2, empty dismantle refunds exactly current total cost. Audit ledger after each command.
- [ ] Add `guard loaded or enabled infrastructure`: loaded line/tank profile edits fail unchanged; enabled pump edit fails; disabled empty pump changes profile for exact delta; invalid entity/profile and insufficient stock fail unchanged.
- [ ] Run construction suite and record RED before adding records/commands/costs.
- [ ] Implement fields, command parsing/defaults and profile lookup. Use current construction geometry unchanged. Replace base-only payment/refund and embodied ledger calculations with `liquidConstructionCost`; profile change validates entity, guards and affordability before mutation.
- [ ] Extend save structural schema/init to version 16 and matching-content legacy standard defaults so this task's world can serialize/load. Do not claim full semantic admission validation until Task 4. Advance existing expected schema assertions only where genuinely needed.
- [ ] Run construction, ledger, liquid logistics/persistence and command tests; update synthetic liquid fixtures explicitly where the new fixture's corrosion requirement would otherwise invalidate their setup. Commit after GREEN.

## Task 3 — Conservative admission in all existing transport paths

**Interfaces:** Use Task 1 predicate and Task 2 effective liquid capabilities. Transport function signatures and `TransportMoveEvent` remain unchanged. Existing local `Target` objects carry their receiving handling states/capabilities or equivalent predicate results; never infer protection from color/name/profile array index.

- [ ] Add `packages/sim-core/test/containment-transport.test.ts`: standard source pump, standard receiving pipe, standard tank and unprotected machine input each reject corrosive liquid separately, preserving source/fuel/full state; an entirely lined path admits it. A two-requirement material missing one capability rejects despite partial match.
- [ ] Test synthetic solid requirements at machine→belt, belt→belt/junction, belt→depot, belt→machine and belt→stock/staging. Test both storage emission paths, including the ordinary non-junction path. Compatible definitions transfer; absent protection retains source and produces no move/export event.
- [ ] Test synthetic gas requirement at machine/vessel→compressor→pressure line, line→line/vessel/machine. Unprotected compressor or destination rejects without fuel use. Fixtures provide necessary machine buffer protection to pass content validation; no new demo material is needed.
- [ ] Run transport suite, record RED. Implement checks in solid `targetFor` plus any separate storage-emission path; liquid/gas target admission and source pump/compressor checks precede reservations and fuel deduction. Retain pre-step quantities, one-edge movement, junction fairness and stable ordering.
- [ ] Run transport plus existing liquid/gas logistics, storage/routing/junction/crossing and ledger tests. Check no same-step multihop, identity/capacity and disabled-feed drainage regressions. Commit after GREEN.

## Task 4 — Save validation, hidden knowledge and route diagnostics

**Interfaces:** In sim-core `containment.ts`, `TransportDiagnostic = {reason:'ready'|'disabled'|'needs-fuel'|'needs-input'|'handling-state'|'missing-containment'|'identity-mismatch'|'capacity'|'route'|'incompatible'; materialId?:string; missingContainment?:string[]; containmentProfileId?:string}`. `publicTransportDiagnostic(diagnostic:TransportDiagnostic, known:ReadonlySet<string>): TransportDiagnostic` removes unknown material identity/requirements and collapses their compatibility failure to `incompatible`. Add `PlayerSnapshot.transportDiagnostics: Record<string,TransportDiagnostic>` keyed by current physical entity ID, plus public capability catalogue. Known-material list remains the existing authoritative discovery set.

- [ ] Add `packages/sim-core/test/containment-persistence.test.ts`: reject unknown profiles and protected material in an unprotected line/tank, machine input/output/job escrow, belt/depot/stock/staging/gas location; failed load leaves current save equal to pre-load state. Exact quantity and embodied-cost audit cannot be bypassed by forged profiles. Schema-15 matching-content migration defaults standard; world-01-v8 rejection is atomic.
- [ ] Add `packages/sim-core/test/containment-knowledge.test.ts`: liquid-0 requirement absent before discovery; profile/equipment capability labels visible without any material/reaction association. Unknown held material diagnostic omits ID/missing IDs; known material missing containment identifies only current requirement/profile. A hinted active reaction never discloses its output or required output containment.
- [ ] Run these suites RED. Extend parseSave's existing per-location loops and active-job checks with the common containment predicate; validate actual input escrow and reserved output capacity/protection without exposing them through the snapshot.
- [ ] Add current-route diagnostic generation next to each transport engine's existing admission checks, reusing the same target/source checks. Diagnose current cargo/buffer contents only. Snapshot combines entity diagnostics and applies `publicTransportDiagnostic` with its existing known set; existing pump/compressor statuses map missing protection to incompatibility. No separate UI admission logic.
- [ ] Add `packages/sim-core/test/containment-chain.test.ts`: normal commands build lined liquid→gas→solid chain, discover outcomes, audit ledger every tick. Serialize a flowing and blocked state; restored versus uninterrupted full-save equality for 60 steps; snapshot mutation cannot alter live profile/diagnostics. Stop feed, drain into a real compatible destination, change empty profile/route and resume.
- [ ] Run new suites plus existing simulation/persistence, liquid/gas chain and knowledge suites; commit after GREEN.

## Task 5 — Factory persistence and playable profile controls

**Interfaces:** Blueprint union expands to 1–5. Version 5 liquid rows carry `containmentProfileId`; v5 contains liquid and gas arrays, including empty arrays. Versions 1–4 retain original strict serialized fields and interpret legacy liquid rows as standard during validation/use. `WorldMode` gains `containmentProfileId:string`, initialized standard; `buildCommand` passes it for liquid construction. `Session` uses save-v10 with v9 and older fallbacks.

- [ ] Extend `factory-blueprint.test.ts`: relative profiled liquid/gas layout roundtrip, deterministic profile IDs/cost-independent layout, no contents/jobs/knowledge/certificates, invalid profile rejected; v1–v4 continue strict parse without leaking v5 fields. Export v5 when liquid members exist and v4 for gas-only layout.
- [ ] Extend `factory-throughput.test.ts`: changing empty internal or connected external profile withdraws a certificate; unrelated infrastructure profile does not. Include profiles in local topology and connected recurrence settings rather than global invalidation.
- [ ] Extend interaction/session tests: lined drag passes one profile across the atomic path, pipe/tank/pump tools retain chosen profile through rotate/cancel appropriately, reload uses v10/v9 fallback. Add localized diagnostic/profile coverage to `i18n.test.ts`.
- [ ] Run these tests RED; implement profiled blueprint/settings and recurrence fields without introducing blueprint stamping or aggregate execution.
- [ ] Before React edits, read `apps/web/AGENTS.md` and the installed Next.js `use-client.md` documentation. Add profile selector to liquid tool help/cost display and inspectors; empty/disabled guards match sim-core command results. Show known-material requirements and sanitized reasons, plus profile/capabilities/cost. Render a lining marker from snapshot fields in Phaser. Never compute compatibility or route transfers in React/Phaser.
- [ ] Update session slot/fallback and test expected fixture version. Run focused factory/interaction/session/i18n plus containment domain suites and typecheck; commit after GREEN.

## Task 6 — Acceptance, documentation and scoped PR

- [ ] Recheck live #110/#100 and open PRs; review the complete branch locally against spec, all five review-focus cases and every transport entry path. Do not claim independent agent review.
- [ ] Run `npm test -- --maxWorkers=4`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`; inspect complete results, count passes/skips and record failures. Repair with focused regressions and repeat the checks affected by repairs.
- [ ] Use local app and normal player controls only: discover liquid, inspect standard route refusal, disable/change empty pump/pipe/tank to lined or build lined replacements, transfer to storage/processor, block/drain/recover, then save/reload/restore and inspect closed/reopened factory. Capture screenshots in `docs/evidence/phase9-containment-*.png`, console diagnostics and truthful fuel limitations. Do not inject simulation state or use Vercel.
- [ ] Write `docs/PHASE9_CONTAINMENT_ACCEPTANCE.md`; update `docs/CONTENT_MODEL.md`, `docs/SIMULATION.md`, `docs/DECISIONS.md`, `docs/EXECUTION.md` and `docs/PHASE9_IMPLEMENTATION_LOG.md` to verified outcomes, versions and exact evidence. Keep historical #108/#109 evidence distinct.
- [ ] Commit final scoped evidence, push branch and create one PR referencing #110 with `gh --body-file`; attach PR to this chat. Verify live PR head matches local verified content and working tree is clean. No absent remote CI or excluded deployment is claimed green. Ask explicit approval before merge; #100 remains open.

## Plan Self-Review

Every spec section is owned by Tasks 1–6. Shared predicate/types/profile helper names are defined before consumers. Defaults, all-of matching, all physical admission paths, protected machine escrow/output, knowledge gating, cost/refund accounting, legacy interpretation and connected settings are explicit. Review-focus cases each map to named tests. Execution method is already native; no agent review/worktree is introduced. Written-spec approval permits this plan; product implementation awaits plan review.
