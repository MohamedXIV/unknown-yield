# Phase 16 — Save/content migration and compatibility hardening (#158)

Issue #158 hardens the production slice's persisted-state boundary without inventing a second save system.

## Supported boundary

The current save schema is **27** and the representative content fixture remains **`world-01-v14`**.

The production slice explicitly regression-tests recent supported save schemas **21–26** against current content. These versions cover the additive persistence boundaries introduced for:

- shipment manifests;
- physical off-world imports;
- market-signal history;
- company import allocations;
- underground solid/liquid routes;
- elevated solid routes.

Each migration is accepted only when the restored current save is deterministic, material-ledger exact and equivalent to the same initial site represented directly as schema 27.

Older migration rules remain covered by their historical-content tests. They are not silently reclassified as compatible with the current content fixture where later systems make exact migration impossible.

## Content compatibility

Content identity remains explicit and independent from save schema identity.

`world-01-v14` remains current because #157 added a late-gated Corporate Order without changing the meaning of an existing persisted material, reaction, machine, opportunity, route or save field.

A save whose `contentVersion` does not match the loaded content is rejected. #158 does not guess across content versions or rewrite stable IDs.

## Atomic load rule

`Simulation.load` parses, migrates, validates geometry/knowledge/containment, audits material conservation and checks export totals before replacing the live authoritative state.

A failed migration or compatibility check must therefore leave the running site byte-for-byte unchanged.

The Phase 16 compatibility regression explicitly proves this for:

- impossible future state embedded in an older schema;
- incompatible content version.

## Version reporting

The current save schema number has one authoritative constant used by new saves and load-rejection diagnostics. Error text must not drift behind the actual schema.

## Non-goals

#158 does not:

- add speculative future migrations;
- migrate incompatible content by guessing;
- weaken hidden-knowledge, containment or conservation validation;
- create cloud saves or account sync;
- redesign the production slice.

## Acceptance evidence

The exact closing head must prove:

- schemas 21–26 migrate to schema 27 under `world-01-v14`;
- migrated state equals the equivalent current save;
- the material ledger reconciles after migration;
- malformed legacy state is rejected atomically;
- incompatible content is rejected atomically;
- historical schema migration regressions remain green;
- full tests, typecheck, lint and production build pass.
