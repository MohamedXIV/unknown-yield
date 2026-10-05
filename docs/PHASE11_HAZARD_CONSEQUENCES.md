# Phase 11 persisted physical hazard consequences

Issue #121 extends the deterministic hazard-class framework with one bounded physical consequence while preserving the existing Phase 2 chamber-blowout behavior.

## Implemented slice

Hazard classes may author a non-negative `strandedOutputUnits` count. Most classes leave it at zero. The fixture's `instability` class strands one completed output unit.

A new `heat-ferrite-oversealed` experiment uses the already unlocked Oversealed furnace and produces `slag-jam`. When it completes:

1. the reaction consumes ferrite and records vitrified residue through the normal transformation ledger;
2. one residue unit moves from the ordinary output buffer into the machine's persisted `incidentInventory`;
3. the incident disables the machine;
4. the trapped material remains at the same machine and is counted by the conservation ledger;
5. restart is refused while physical incident inventory remains.

Nothing is discarded, teleported to stock, or converted into an untracked damage counter.

## Compatibility

The existing `chamber-blowout` remains a pressure-expansion lockout with zero stranded output, so its accepted Phase 2 acknowledge/re-enable behavior is unchanged. `incidentInventory` defaults to empty when reading older saves; no previous hazard could have authored the new `slag-jam` identity, so this additive default is exact and does not require a save-schema bump.

## Boundary to later Phase 11 work

#121 intentionally does not add cleanup, repair, reclaim, disposal, safety equipment, prevention or richer causal notebook text. The stranded material is a persisted blocked state for later recovery work in #123. #122 owns the broader hazard observation/knowledge layer.
