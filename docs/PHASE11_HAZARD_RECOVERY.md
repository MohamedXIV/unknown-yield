# Phase 11 physical hazard recovery

Issue #123 recovers the bounded `slag-jam` consequence without deleting, discarding or teleporting material.

## Recovery action

`recoverMachineIncident` is authoritative in `sim-core`.

It is available only when a stopped machine has both an incident and non-empty `incidentInventory`. Recovery is rejected if the normal output buffer cannot physically accept the trapped quantity.

On success:

1. every trapped material unit moves from `incidentInventory` into that same machine's normal output buffer;
2. the physical incident clears;
3. the machine remains disabled;
4. learned `hazardEvidence` remains permanently available;
5. no stock, staging, flow-total or market quantity is created or deleted.

The player must still use ordinary belts and terminal/storage handling to move the reclaimed output away from the machine.

## Accepted compatibility

The older `chamber-blowout` has no trapped incident inventory, so its Phase 2 acknowledge-and-re-enable flow remains unchanged.

No save-schema change is required. #121 already persisted the physical incident inventory; #123 only provides a conservative state transition over that existing truth.

## Boundary

This issue does not prevent the hazard or unlock containment. Evidence-driven prevention remains #124.
