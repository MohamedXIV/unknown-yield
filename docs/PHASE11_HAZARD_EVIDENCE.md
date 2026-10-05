# Phase 11 hazard observations and knowledge gain

Issue #122 turns a hazardous outcome into persisted, player-usable physical evidence without exposing future authored truth.

## Knowledge contract

A hazard is learned only when its deterministic authored incident actually occurs. The save stores the stable incident ID in `hazardEvidence`; older saves default to an empty list because no historical save could have recorded this new knowledge channel.

The player snapshot resolves only learned incident IDs into:

- the observed hazard and hazard-class names;
- a physical evidence sentence owned by the hazard class;
- the operation, known input and setup that produced the incident;
- a bounded safer-next-test hint owned by the observed incident.

The hazard catalog itself is never exposed wholesale. Unobserved hazard IDs, class evidence and safer hints remain absent from snapshots and saves.

## Playable inference

The existing pressure-expansion incident teaches that excess confinement caused the pressure release and points back to the Sealed furnace as the comparison setup.

The new instability / slag-jam incident records the physical fact that the charge changed phase unevenly and jammed under excessive confinement. It recommends repeating the same ferrite + Heat experiment in the Sealed furnace. A non-hazardous authored `heat-ferrite-sealed` comparison reaction exists so the recommendation is executable rather than flavor text.

This does not unlock safety equipment or prevention capability; #124 owns that progression. It does not recover trapped material; #123 owns recovery.

## Persistence

Hazard evidence survives save/load independently from the current machine lockout. This matters because later recovery may clear the physical incident while the learned evidence must remain in the field notebook.
