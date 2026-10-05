# Phase 12 factory shell reshape

Issue #126 adds post-build footprint expansion and trimming while preserving the detailed factory interior.

## Contract

`reshapeFactory` changes only the shell rectangle. It never translates machines, belts, buffers, cargo, liquid/gas structures or ports.

A reshape is accepted only when:

- the new shell overlaps the current footprint, so the command is not factory relocation;
- normal site bounds, factory min/max size and world-collision rules pass;
- every existing processor still fits strictly inside the new walls and keeps the same `factoryId`;
- every belt and liquid/gas structure that was inside the factory remains inside and still obeys wall/port crossing rules;
- every existing port remains a valid directional port on the new wall;
- expansion does not silently swallow external logistics or another world object.

Expansion pays the authored per-cell factory cost. Trimming refunds exactly the reclaimed shell area. No material is created by a grow/shrink round trip.

## Runtime preservation

The command mutates only `x`, `y`, `width` and `height` on the existing factory ID. Internal entity IDs and all runtime state are unchanged. Save/load validation and the existing structural renderer fingerprint therefore continue to use the same authoritative objects.

Factory blueprint serialization naturally reflects the new shell dimensions and recomputes relative interior coordinates from the unchanged world-space entities.

## Scope boundary

This is wall reshaping around fixed contents. #127 owns intact factory relocation, including translating the shell and interior together. External logistics reconnection and broader district routing remain later Phase 12 children.
