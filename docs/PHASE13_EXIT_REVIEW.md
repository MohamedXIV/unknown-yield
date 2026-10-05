# Phase 13 #138 — End-to-end terminal and exchange exit review

## Scope

This gate adds no new gameplay subsystem. It composes the accepted Phase 13 contracts in one deterministic world and asks whether the terminal/company loop now works end to end without violating physical inventory, hidden knowledge or conservation.

The integrated regression is `packages/sim-core/test/phase13-exit.test.ts`.

## Integrated flow

The proof deliberately uses existing content and systems:

1. Start with the already-accepted sealed/specialized terminal prerequisite so Phase 13 itself can be isolated.
2. Confirm Resonant matrix, its listing, its procurement Order and its property Directive are absent before discovery.
3. Request one six-unit Orbital binder import into the physical dry terminal holding.
4. With the test shipment capacity set to six, prove a second crate is refused while the first holding is full.
5. Let ordinary belts drain that import through a real factory/Sinterer into a geographically fixed depot.
6. Request the second crate only after capacity is physically available; twelve imported binder units become six matrix units.
7. Before the company cadence, all six matrix units exist in the depot, none has exported, demand is still baseline and the demand shock/order are absent.
8. At the later company cadence, the confirmed binder route creates the matrix market signal, raises demand and offers both the procurement Order and the hidden-solution property Directive.
9. Save/load exactly with the signal and geographic stock intact.
10. Hold matrix instead of allowing legacy auto-export, construct the missing depot-to-terminal belt route, and wait for those same six stored units to reach physical terminal staging.
11. Select exactly six matrix units in the explicit shipment manifest, filling the authored shipment capacity, then dispatch through the normal Exchange/order/ledger settlement path.
12. Install the cryogenic terminal module, receive the specialized Orbital coolant import, and release one unit through a `sealed-cold` physical pipe.
13. Save/load the final world exactly and reconcile the material ledger.

## Knowledge boundary

Before matrix characterization, the player snapshot contains no matrix listing, procurement opportunity, property Directive, bulletin, or hidden reaction IDs.

After the demand signal, the property Directive is visible as a target/reward only. Its accepted `sinter-catalyst` solution and `solutionReactionIds` remain absent from the player-facing view.

## Physical and economic boundary

- Imports enter a terminal holding/module before ordinary logistics can move them.
- Shipment selection is intent, not inventory.
- Storage remains a placed world entity.
- Demand changes do not pull stock out of storage.
- A shipment cannot exceed physical terminal cargo or shipment capacity.
- Export settlement is the existing Exchange/Order path.
- Specialized coolant remains liquid cargo requiring the accepted containment capabilities.
- No global warehouse, teleporting release, parallel market, or new material-state taxonomy is introduced.

## Persistence and conservation

The gate changes no save schema. It reuses the current Phase 13 schema and verifies exact save/load both after the company signal and after specialized inbound handling.

Ledger audits are required before discovery, after stockpiling, after the demand signal, after shipment staging/dispatch and after specialized import release.

Exact-head automated evidence belongs on the Pull Request. This document does not claim unrun CI or browser evidence.
