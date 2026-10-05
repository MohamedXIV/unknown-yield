# Phase 11 deterministic hazard-class framework

Issue #120 generalizes the existing Phase 2 chamber-blowout proof into an authored hazard taxonomy without adding later recovery/damage scope.

## Authored contract

`hazardClasses` is a stable content catalog. A class owns:

- a stable class ID;
- a localized class name;
- the deterministic machine consequence currently supported by the framework.

The initial catalog names thermal runaway, pressure expansion, corrosion, instability and contamination. #120 intentionally gives them the existing `lockout` machine effect only. Physical damage, cleanup, containment and safety progression remain later Phase 11 work.

A hazardous reaction references a class by stable `classId`. The reaction still owns its specific incident ID and physical observation text. This separates “what happened in this experiment” from the broader industrial hazard class.

## Determinism

Hazards do not roll probability. When a completed authored reaction contains a hazard, `applyReactionHazard` resolves its class and applies the class consequence directly. Identical authoritative state and commands therefore produce identical incidents.

The current consequence is the already-proven automatic machine lockout:

1. the completed reaction remains physically conserved and observed;
2. the incident stable ID is persisted on the machine;
3. the machine is disabled;
4. save/load validates the incident against the same reaction and class.

## Knowledge boundary

The class catalog is simulation/content truth and is not exposed wholesale in `PlayerSnapshot`. Before a hazard occurs, the player snapshot contains neither the incident ID nor its class ID/name.

After the persisted incident exists, the machine view may expose only the observed incident plus its class classification:

- `classId`;
- `classNameKey`;
- incident `nameKey`;
- physical observation `textKey`.

This does not reveal other hazard classes or future hazardous outcomes.

## Persistence

No save-schema bump is required. Machines continue to persist the stable incident ID introduced by Phase 2. The class is resolved from versioned content, so existing physical incident state stays compact and deterministic.

## Non-goals

#120 does not add equipment damage, leaks/waste, cleanup commands, repair resources, safety equipment or prevention capability. Those belong to #121–#125.
