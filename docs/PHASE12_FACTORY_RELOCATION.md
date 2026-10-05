# Phase 12 intact factory relocation

Issue #127 moves a populated factory as one persistent industrial asset while preserving authoritative interior state.

## Relocation boundary

`relocateFactory` changes the factory origin and translates only entities that are already inside that factory:

- factory ports;
- processors owned by the factory;
- belts on or inside the shell;
- internal liquid pipes, pumps and tanks;
- internal gas lines, compressors and vessels.

Stable IDs, buffers, jobs, incidents, cargo, junction state, containment profiles and enabled state are unchanged. Coordinate-keyed belts/pipes/pressure lines are removed from their old keys before any translated keys are inserted, so one-cell moves cannot overwrite neighboring members of the same asset.

External logistics are not members of the relocation group. A belt or pipe immediately outside a wall remains at its original world coordinate with its cargo/contents unchanged. This deliberately leaves reconnection work instead of teleporting the district network.

## Validation

Relocation first removes the source asset from a staged copy, validates the unchanged shell dimensions at the target, translates ports, then replays the existing machine/belt/liquid/gas placement rules over translated members.

Target collisions, terminal/deposit overlap, invalid wall crossings and any loss of factory ownership reject atomically. Preview uses the same validation and never mutates truth.

The factory blueprint remains byte-identical across relocation because the shell and every internal entity keep the same relative geometry.

## Scope boundary

#127 has zero relocation cost and no authored downtime. Strategic cost, downtime and explicit external reconnection/resume requirements are #128.
