# Phase 10 deep extraction capability

Issue #116 makes the authored depth constraint from #115 operational.

## Capability

The normal `extractor` remains a surface machine with the schema default `maxExtractionDepth: 0`.

The `deep-extractor` is a distinct industrial capability:

- `maxExtractionDepth: 20`, enough for the currently authored depth-14 source;
- unlocked from the same confirmed sealed-Heat knowledge that already gates the probe path;
- four fuel per batch rather than one for the surface extractor;
- a higher construction cost and longer extraction cycle;
- the same physical machine output buffer and deposit accounting rules as every extractor.

Depth access is therefore qualitative: a surface extractor cannot work the deep source at any speed or fuel level.

## Knowledge and spatial boundary

A deep extractor does not reveal a hidden source. The source must first become a legitimate discovered deposit through the #115 probe contract. Machine placement then uses the normal public/discovered deposit geometry and the authored depth check.

The build toolbar exposes the capability only through the existing derived machine-unlock view; the prerequisite reaction ID is still not sent to presentation.

## Content Studio

`maxExtractionDepth` is now preserved in Content Studio machine rows and round-trips. Before #116, the schema field existed but Studio export reconstructed machines without it, which would have reset a deep extractor to the default surface depth.

## Persistence and conservation

#116 adds no save field and does not change save schema 20 or content version `world-01-v13`. The machine definition is an additive compatible content extension; placed machines already persist by stable `definitionId`.

Starting an extraction batch removes exactly one unit from the physical deposit and charges the authored fuel cost. Completion places that same unit in the machine output buffer. No material is created or silently discarded by the depth capability.

## Non-goals

#116 does not add a new resource family, atmospheric/non-surface source, manufactured exploration product loop, hazards, or advanced logistics. Those remain #117–#119.
