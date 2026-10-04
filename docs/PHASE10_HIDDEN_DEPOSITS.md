# Phase 10 hidden deposits and depth constraints

Issue #115 connects the private sensing layer from #114 to authored resource sources without exposing those sources before discovery.

## Hidden source authority

`site.hiddenDeposits` is content/simulation truth. A hidden source has normal physical deposit geometry and units plus private links to:

- the authored survey signal that represents it;
- the probe capability required to identify it.

The hidden definition is omitted from `PlayerSnapshot.map`. Before discovery its ID is also absent from the serialized save and from the public deposit list.

## Discovery

A broad scan remains partial evidence only. It never identifies a source.

A qualifying probe identifies a hidden source only when it uses the source's authored probe capability at the linked survey-signal coordinate. The resulting source ID is added to persisted `discoveredDeposits`, and only then is its remaining inventory materialized into the save.

This keeps source identity/location as earned knowledge rather than an authored-truth leak.

## Depth constraint

Survey-signal depth is also the source's authored extraction depth. Machine definitions expose `maxExtractionDepth` (default 0).

Once a source is discovered, placement may recognize its geometry. An extractor whose depth capability is insufficient is rejected with:

`Extraction capability insufficient for deposit depth`

Issue #116 owns the actual deep-extraction machine or operating mode that satisfies this constraint.

## Persistence

#115 introduces save schema 20, content `world-01-v13`, and browser slot `industrial-site-save-v14`.

Schema 19 migrates with no discovered sources. A discovered source is valid only when the save also contains the qualifying deterministic probe observation. Hidden source IDs are never synthesized into older saves.

## Non-goals

#115 does not add the deep extractor, a new non-surface material family, processing chains, hazards, or later logistics.
