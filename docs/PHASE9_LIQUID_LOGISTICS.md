# Phase 9 / #108 — liquid logistics design draft

Status: APPROVED by user on 2026-10-02. Implementation plan is pending review. Implements #108 under #100; not the whole Phase 9 exit gate. Existing phases, authoritative simulation, material conservation, hidden knowledge and persistent factory routing remain the baseline.

## Intent

A player discovers a liquid output, builds a physical pumped route into a tank and a compatible processor, blocks it, stops new feed, reroutes empty infrastructure and resumes without losing liquid. Existing solid chains remain usable. No fluid dynamics, pressure solver, global liquid inventory or per-particle simulation.

## Approach and alternatives

Recommended: directed quantity-buffer pipe cells with explicit source pumps and fixed authored throughput. This builds on existing integer material accounting while providing distinct storage/transport behavior. A connected pressure/equalization network would introduce gas/pressure scope early; repurposing belts as liquid transport would hide the required distinction. Neither alternative is selected.

## Physical contract

Materials gain an authored handling state with existing materials defaulting to solid for compatibility. #108 introduces liquid only; gas and special containment await #109/#110. Ordinary belts/storage reject liquids. Tanks and pipes reject solids. Each pipe cell/tank holds one material identity at a time and an integer quantity within authored capacity; incompatible mixing blocks without conversion or loss.

Pipes have an explicit inlet behind and outlet ahead, including readable directed bends as needed for the playable route. Connectivity requires matching endpoints; no arbitrary junctions, implicit cross-connections or hidden transport. No T/+ pipe machinery in this slice. Tanks have explicit directional input/output sockets.

A source pump admits material from a compatible machine output or tank output into the directed pipe route. Its footprint, capacity, transfer limit and fuel cost are content-defined. Disabled/no-fuel/blocked pumps stop new feed; liquid already admitted into pipes can drain downstream. Pumps expend fuel only for successful defined transfers. A tank output requires its own pump for a new route; no magical siphoning. These are abstract conveyor-like transfer rules for quantity accounting, not claims of fluid physics.

Transport resolves deterministically from pre-step quantities, reserves destination capacity and commits successful transfers atomically. A unit advances at most one transport edge per step; blocked outlets retain all upstream quantity. Iteration/insertion ordering must not create extra throughput or overfill. There is no deletion or silent spill/reclaim fallback.

Machine liquid outputs/inputs use their existing physical buffers and defined reactions. Add the smallest authored solid-to-liquid-to-solid demonstration with provisional localized wording; do not change existing recipe outcomes or reveal new outputs before observation. Numbers are content balance, not sacred design constants.

## Construction and interaction

Player tools place/rotate/preview/dismantle directed pipes, pumps and tanks through sim-core commands. Preserve atomic cost/refund and placement validation, factory wall/port boundaries, world obstruction and roof behavior. Initially each cell is occupied by one ground logistics form: no implied underground/parallel layer. Loaded structures cannot be deleted or rerouted; stop feed and drain them before removing/changing connections. Tank/pump inspectors show quantity, direction and truthful blocked/disabled/no-fuel states through localization resources.

Phaser renders snapshots and handles interaction; React owns tools/inspectors. Neither decides quantity or connectivity. The existing factory contract/throughput and blueprint boundaries must account for the added internal/connected liquid state; do not certify throughput while liquid backlog is changing or omit liquid members from an exported blueprint silently.

## Terminal boundary

Provide compatible endpoint checks at existing physical terminal staging. Do not make the current dry terminal accept liquid by default. Incompatible staging leaves liquid physically blocked and explains the gate without recipe spoilers. Full liquid/gas/special staging capability and export acceptance are #111; #108 is accepted by the machine/tank demonstration and truthful terminal refusal, not a premature Phase 9 export claim.

## Save, content and ledger

Version new persisted pipes/pumps/tanks, migrate supported old saves with empty new structures and existing solid material defaults, and reject malformed locations/quantities/compatibility atomically. Use stable IDs and localized presentation. Update content version independently when the demonstration content changes; explicitly document older-content compatibility.

Extend the ledger to reconcile liquid locations and embodied construction costs alongside buffers, jobs, solid cargo, storage and staging. Pump fuel is defined fuel expenditure; it must not disappear material. Snapshot views remain detached from mutable authoritative objects and do not leak hidden reactions. Loading must resume the same future transfers, blockage and discovery.

## Acceptance and implementation sequence

1. Content/validation, persisted runtime types and migration; focused compatibility and invalid-save tests.
2. Pure deterministic liquid transport, pump admission, tank/machine endpoints, commands and ledger; tests for occupancy, capacity, contention, blocked/disabled/no-fuel conditions and drain/reroute.
3. Integrate liquid state into factory contracts/blueprint/save boundaries without changing solid semantics.
4. Authored demonstration, localized build tools/inspectors and readable Phaser paths.
5. Focused regressions, then one substantial full test/typecheck/lint/build gate and real normal-controls browser acceptance. Demonstrate discovery, physical flow into tank/processor, blockage, stopping feed, draining/rerouting/resuming and save/restore; conservation at every checkpoint.

No new dependencies, workers, snapshot optimization, gas/pressure implementation, hazardous leaks, terminal module expansion or later-phase systems. Record any conflict with existing contracts before adjusting this draft.
