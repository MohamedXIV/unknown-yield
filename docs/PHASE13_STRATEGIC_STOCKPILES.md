# Phase 13 #137 — Strategic physical stockpiles

## Decision

#137 does **not** add a stockpile inventory, market warehouse or instant release command.

The accepted primitive is the existing placed Storage entity:

```text
production
  -> ordinary belts
  -> placed depot inventory
  -> (no output route = retained geographically)
  -> later company Order / demand signal
  -> player constructs ordinary output route
  -> belts
  -> physical terminal staging
  -> export settlement
```

Every unit stays in one authoritative physical location throughout.

## Integrated proof

`packages/sim-core/test/strategic-stockpile.test.ts` builds a real extractor + Crusher factory and routes Conductive granules into a real depot.

The test content changes only `marketEveryTicks` to 600 so the sequence is observable:

1. Before tick 600, the test waits for real production to place at least four granule units in the depot, with a strict pre-cadence bound.
2. The Corporate Order has not yet been evaluated/offered.
3. No granule has been exported and global site stock still contains construction plates only.
4. Production is disabled so later changes cannot be mistaken for fresh output.
5. At tick 600, the existing `granules-procurement` Order is offered.
6. The world save/loads exactly with the same geographic depot inventory.
7. Only then is a physical belt route built from the depot output socket to terminal staging.
8. Stored units travel normally, export normally and complete the four-unit Order.
9. Depot inventory falls, export ledger rises, fuel rises from ordinary settlement/reward, and conservation still audits cleanly.

## Product law

“Keep material for later” is therefore a **world-layout decision**, not a menu allocation. A blocked/missing depot outlet is real retention. Releasing stock requires logistics capacity and terminal handling exactly like fresh production.

This proof uses an Order as the later economic signal. The same physical storage behavior already composes with Phase 13 demand shocks because both influence the existing Exchange rather than bypassing logistics.

No browser PASS is claimed by this document. Exact-head automated evidence belongs on the PR.
