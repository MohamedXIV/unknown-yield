# Phase 10 non-surface atmospheric source

Issue #117 adds a resource origin that is not a ground deposit.

## Authored truth and discovery

`site.atmosphericSources` is canonical hidden content. The current source is a finite atmospheric trace plume linked to a private survey signal and the existing probe capability.

Scanner observations remain partial evidence only. An exact qualifying probe materializes the source's remaining inventory into save state. Before that event, the source ID, geometry, material and quantity are absent from player snapshots and raw saves.

A saved probe observation alone is not retroactively promoted into source identity during schema migration; the source is identified only by the gameplay discovery event.

## Acquisition shape

The `atmospheric-intake` is an extractor-class machine with `sourceKind: "atmosphere"`, but it does not use deposit identity or depth:

- it must fit inside a discovered atmospheric source region;
- it unlocks only after the existing gas-producing Vaporize result is confirmed;
- it removes one unit from the finite atmospheric reservoir when a batch starts;
- captured gas remains in the machine output buffer until a compressor admits it into a pressure line;
- the existing Gas collector can then transform that gas into conductive granules.

This creates a different spatial/logistics shape from ore extraction without inventing a second gas transport system.

## Conservation and persistence

Save schema 21 adds `atmosphericSources`, keyed only by legitimately discovered source IDs. Schema 20 migrates exactly to an empty record.

The material ledger counts all authored atmospheric units as initial physical source inventory. Before discovery the untouched authored amount remains in the hidden reservoir; after discovery the persisted remaining amount becomes authoritative. An in-progress intake batch is escrowed exactly like an in-progress deposit extraction batch.

No captured material disappears: source -> intake job escrow -> intake output -> compressor/pressure line -> processor input/output or later terminal handling.

The content version remains `world-01-v13`: this is an additive hidden source and machine capability; existing saves gain no source identity during migration.

## Non-goals

#117 does not add the manufactured capability/new-resource/new-product loop owned by #118, new hazards, long-distance logistics, or Phase 11 systems.
