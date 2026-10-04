# #112 — contained pump failure and physical recovery

Status: conversational approach approved 2026-10-04; written spec awaiting review. Same checkout, branch `codex/112-recoverable-handling`, based on main `d8578d622e63d7695b2442c3936218d77867cb98`. #111 is CLOSED through PR #165; live #112 and #100 are OPEN, with no competing open PR. No product implementation is claimed.

## Intent and acceptance

Make one understandable containment mismatch cause a bounded, deterministic physical consequence that the player can diagnose and recover from through normal industry. Preserve every unit in a tracked location across failure, blockage, cleanup, suspension, Save/Load and export. Keep sim-core authoritative, hidden recipe truth private and this slice narrower than Phase 11.

The approved approach is a contained failure in the existing source pump, not a spreading ground spill. A Standard pump exposed to the existing corrosion-requiring liquid traps one unit in its own service chamber, stops feeding and remains failed until the charge is drained and the pump is repaired or reclaimed empty. No material is destroyed or transformed by the incident.

Alternatives: retaining ordinary refusal adds no physical failure and does not meet #112. A ground-spill system would require new world locations, pickup equipment and wider hazard interactions. Both are excluded from this delivery.

## Scope and authored rule

Add one optional `liquidLogistics.pump.containmentFailure` definition, not an extensible hazard engine. Fields: stable `id`, localized `nameKey` and `descriptionKey`, `exposedProfileId`, `missingCapabilityId` and positive integer `trappedCapacity`.

Fixture content `world-01-v11` authors rule `pump-corrosion`, exposed profile `standard`, capability `corrosion-resistant`, trapped capacity **1**. The existing material `liquid-0` and chemistry remain unchanged. Stable references drive behavior; names, material IDs and the word corrosion are not hard-coded transport predicates.

Validation requires an existing liquid profile and containment capability, an exposed pump profile that lacks the referenced capability, at least one executable liquid source whose material requires it, and at least one pump profile and pipe/tank path capable of protecting that material. Localized keys are validated. Rule absence preserves ordinary refusal for historical/custom content. Other missing requirements, wrong state, wrong route, identity mismatch, capacity blockage and gas/solid equipment retain their accepted refusal behavior.

The new rule intentionally changes #110's no-withdrawal guarantee for this one authored pump exposure. All other containment refusals remain unchanged. Update canonical docs and accepted decisions explicitly; do not silently weaken the shared containment predicate.

## Trigger and atomic transport ordering

Failure occurs only during an actual enabled normal-feed attempt on the existing liquid transport cadence. The pump must have no incident, match the exposed profile, have sufficient normal operating fuel, and face a correctly directed downstream pipe. A real liquid source must have unreserved cargo requiring the authored capability, which the pump lacks. The downstream receiver must otherwise protect that liquid, have compatible identity and at least one available unit of capacity after existing reservations. Merely placing/selecting a pump or inspecting a material never triggers failure.

The pump's missing-capability set must be exactly the authored capability; another missing requirement retains ordinary refusal. Use the existing deterministic source reservation map and stable pump ordering. Reserve `min(trappedCapacity, remaining source quantity, normal pump transfer limit, currently available downstream capacity)` for the pump's incident chamber. Commit source withdrawal and incident creation atomically, force `enabled=false`, and retain all other source units. Do not reserve or mutate downstream contents, emit a successful downstream delivery event, spend successful-transfer fuel, alter material identity, write transformation/export counters or invent discovery evidence.

An ineligible attempt remains an ordinary refusal: no incident, source change or fuel debit. Multiple pumps sharing a source cannot overdraw it; repeated steps cannot retrigger a failed pump. Newly trapped charge cannot drain in the same transport cadence: recovery reads only pre-step incident state. Each unit still crosses at most one physical edge per step.

## Persisted pump incident and conservation

Extend Pump with required `incident: null | { definitionId, materialId, quantity, startedAt, drainEnabled }`. `materialId` identifies the observed failed charge and remains after quantity reaches zero so diagnosis and repair protection can still be validated. Unlike ordinary empty pipe/tank contents, an empty incident retains this history until recovery acknowledgement; this distinction is explicit.

The chamber is an exceptional incident holding, not a safe ordinary Standard inventory. Quantity is bounded by the authored trapped capacity, integer and nonnegative. Failed pumps cannot admit fresh source cargo. A positive trapped charge always has valid liquid identity requiring the rule's missing capability. Add ledger category `pumpIncidents`; move source holding to that category without modifying consumed/produced/discarded counters. Pump construction embodiment remains its current authored profile cost, with no damage loss or hidden repair sink.

Factory views count this physical liquid separately from machine buffers. Internal and connected pump incident state participates in recurrence, preventing stable certification while a relevant failure/recovery is present; unrelated factories retain certification. No aggregate execution is introduced.

## Physical cleanup and repair

Add command `setPumpRecoveryDrain` with pump ID and enabled boolean. It requires an existing incident and a disabled normal feed; enabling this service outlet does not repair or restart the pump. On liquid cadence, the retained charge drains from the pump through its existing outlet into a correctly directed, compatible protected pipe using ordinary source/destination reservations, identity and capacity checks. Use the existing pump transfer limit; service drainage spends **0 fuel**, admits no new upstream cargo and has no teleport/manual inventory transfer. Missing/incompatible/full downstream routes retain the charge and explain the blockage.

The service outlet deliberately bypasses the damaged pump's normal source-containment check only for its already trapped incident charge. Every destination still passes the shared containment predicate. It cannot become an ordinary unprotected source-feed mode. The player builds or upgrades an empty downstream pipe and connects it to a real Lined tank, processor or compatible terminal route. Continued normal pipe transport preserves the existing one-edge rules.

While charge is positive: profile changes, rotation/reclaim and repair refuse atomically. Normal-feed enable also refuses whenever an incident exists. Stop-feed remains legal/idempotent. With an empty chamber and feed disabled, existing profile upgrade/downgrade retains exact plate delta and embodied costs, but does not clear the incident.

Add `repairPump` command requiring an empty chamber, normal feed disabled, and current pump capabilities compatible with the incident material. The player upgrades Standard to Lined through the existing profile control, then acknowledges repair. Repair clears the incident and leaves feed disabled; normal enable is a separate deliberate action. It grants no material/fuel reward and consumes no material. The existing upgrade cost is the physical protection investment, so no additional repair economy is invented.

An empty failed pump may instead be reclaimed normally for its exact current embodied plates; loaded reclaim remains forbidden. This provides recovery even if the player chooses to rebuild elsewhere. At zero fuel the charge can still drain through a compatible route. Recovery never depends on timed company opportunities, predicted reaction outputs or an assistance grant.

## Save and blueprint boundary

Save schema **18**, fixture **world-01-v11**, browser slot **v12**. Current content rejects schemas below 18 atomically; pre-release backward compatibility is not required. Historical custom content without the new rule may migrate schema 17 with incident=null while retaining previous non-current migration coverage. Unknown/forged incident fields cannot be silently stripped or repaired.

Current Pump records require incident=null or a strict incident object. Validate rule/profile/material relationships, integer bounded charge, startedAt within the elapsed save, disabled normal feed, boolean drain setting, known material identity, and legitimate protected repaired-profile cases. Positive charge cannot coexist with a changed exposed profile; empty charge may retain a protective upgraded profile while awaiting repair. Other inventories still require ordinary containment. Reconcile every physical holding and embodied cost before replacing the world; rejected loads leave the complete running save unchanged.

An incident need not retain its original source after the material has moved: source reclaim/reroute must not orphan legitimate charge. Validate incident legitimacy from authored rule, current profile, known material and conserved quantities, without inventing an immutable source reference or claiming full historical proof from a save.

Factory blueprints remain conditional schemas 1–5 and export no incident, charge, incident tick or service-drain state. A failed pump exports its normal-feed setting as disabled, plus its normal layout/profile, so the blueprint never encodes active recovery. No blueprint stamping subsystem is added.

## Knowledge and presentation

Detached PlayerSnapshot pump views expose incident state, physical quantity and current recovery diagnostic. Equipment service controls and generic failure labels are localized. Material identity and requirements appear only through current discovered knowledge; diagnostic sanitation cannot reveal undiscovered material or authored reaction outputs. Failure itself creates no reaction knowledge or evidence.

React inspector shows the failed pump, trapped quantity/capacity, stopped feed, drain toggle, current downstream refusal or progress, exact profile-upgrade cost and repair/reclaim eligibility. Incident diagnosis takes priority over ordinary Disabled/Needs fuel, including at zero fuel; service-drain blockage remains independently explainable. Explain the action sequence: stop source feed, connect protected recovery route, drain, upgrade protection, repair, then enable. No generic Delete/Discard action.

Phaser renders a distinct failed-pump marker from snapshots and a recovery-drain state, without owning inventory, timing or admission. Closed/open factory views retain truthful incident holdings and blocked diagnosis; do not stream frame transforms through React.

## Verification gate

Focused deterministic domain/content tests precede the full gate:

1. Validate authored rule, references, localization, exposed protection and recoverable protected path; Studio base-content roundtrip preserves it.
2. Real valid exposure traps the bounded charge exactly once, disables feed and preserves all source/destination/ledger/fuel invariants. Disabled/unfueled/full/missing/wrong-direction/wrong-state/protected/unrelated mismatch cases do not create a failure.
3. Multiple source consumers share reservations deterministically and cannot duplicate cargo. Same-cadence drain cannot move newly trapped charge twice.
4. Recovery drains only to the directed protected receiver; full/identity/protection refusal retains charge. Zero-fuel recovery, capacity resume, idempotent toggles and fresh-source exclusion are covered.
5. Loaded edits/reclaim/repair/feed-enable refuse atomically; empty profile upgrade/repair/reclaim preserve exact embodied costs and no rewards. Protected resumed feed no longer triggers the incident.
6. Save/Load during loaded blockage, drainage and empty awaiting repair restores identical complete futures; invalid incident/state/protection/quantity records and old current content reject atomically. Ledger audit stays green after each tick/command.
7. Snapshot mutation cannot alter truth; undiscovered identities/outcomes stay hidden. Factory certification includes relevant incident contracts and excludes unrelated failures. Blueprint payload excludes recovery state.
8. Normal fresh-world commands discover the existing liquid, trigger the authored failure, retain upstream material, create a physical protected recovery route, drain at zero fuel if applicable, repair and resume to compatible terminal export. No state injection in the integration/browser chain.

Then run the full suite alone (`npm test -- --maxWorkers=4`), typecheck, lint, production build/static export verifier and diff check. Browser acceptance uses normal controls and documents any scenarios proved only in domain tests: diagnosed trigger, loaded guards, Save/Load, downstream recovery, empty upgrade/repair and resumed production/export. Capture screenshots and console logs; record exact behavioral commit and honest limits.

## Delivery and exclusions

Update EXECUTION to reconcile #111's confirmed merge and current #112 scope; update CONTENT_MODEL, SIMULATION, DECISIONS and scoped acceptance/implementation evidence. One PR closes #112; final merge requires user approval of the concrete verified PR. #100 remains OPEN and #113 integrated exit review is not started.

No spreading spill, ground pollution, leaks, pressure/temperature physics, RNG, explosions, machine destruction, new chemistry/materials, gas failures, generic hazard framework, repair consumables, new dependencies, workers, Vercel work, remote agents or worktrees. Native same-folder execution remains the selected method.

## Spec self-review

The trigger is limited to a feasible authored feed attempt; ordinary refusal remains intact elsewhere. The incident creates a real bounded holding and interrupted production, with no missing unit or imaginary downstream delivery. Recovery uses an explicit service mode and real directed protected receiving locations; zero-fuel drainage prevents an incident-only fuel soft-lock. Current save validation distinguishes loaded exposed profile from empty upgraded repair state. Blueprint exports exclude live recovery. No placeholders, unresolved gameplay choices or later-phase dependencies remain in this proposed spec; written approval is still required before planning/product implementation.
