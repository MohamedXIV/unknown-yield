# Phase 13 #132 — Cargo manifests and shipment capacity

## Accepted design target

This slice deepens the existing Phase 5/9 terminal rather than adding a second inventory or a timer-based shipping minigame.

- Physical terminal holdings remain authoritative: dry cargo lives in `staging`; liquid/gas cargo lives in installed terminal docks.
- `shipmentManifest` is persisted **intent only**. Selecting five units does not move, reserve or duplicate five material units.
- `site.terminalShipmentCapacity` bounds one explicit dispatch and the legacy continuous auto-export sweep.
- A pending explicit manifest pauses auto-export so automation cannot consume cargo the player has deliberately selected.
- Dispatch is immediate once valid; capacity creates cargo-choice pressure without a waiting-game countdown.
- Existing Materials Exchange eligibility, discovery knowledge, milestone handling gates, compensation, obligation repayment, Corporate Order progress and material-ledger accounting remain the only settlement path.
- Phase 13 #132 reuses the current solid/liquid/gas handling classes. Cryogenic, hazardous and secure terminal classes remain #134 scope.

## Authoritative flow

```text
factory / storage / pipe / pressure line
        -> physical terminal staging or dock
        -> player manifest quantity (intent only)
        -> validate knowledge + listing + handling + physical quantity + cargo capacity
        -> dispatch
        -> remove exactly those physical units
        -> Exchange compensation / debt repayment / order progress
        -> material export ledger
```

Legacy `Keep / Auto-export` remains available for continuous production lines. Auto-export is now bounded by the same cargo capacity. Exact manifests provide the strategic one-off choice required by Phase 13 without invalidating accepted Phase 5 automation behavior.

## Persistence

Save schema 22 adds `shipmentManifest`. Schema 21 migrates exactly to an empty manifest because earlier saves had no pending shipment-selection state. Current-schema saves must contain the field. Save validation rejects manifests that exceed authored capacity, reference unknown/unlisted/handling-locked cargo, or select more material than physically exists at the terminal.

## Regression coverage

`packages/sim-core/test/shipment-manifest.test.ts` covers:

1. multi-dock manifest selection with a hard shared cargo-capacity refusal;
2. no auto-export race while an explicit manifest is pending;
3. dispatch of exactly the selected physical units with material-ledger reconciliation;
4. save/load preservation of manifest intent without moving or duplicating dock cargo;
5. legacy auto-export using the same shipment-capacity bound.

Exact-head CI/browser evidence is recorded on the Pull Request; this document does not claim unrun verification.
