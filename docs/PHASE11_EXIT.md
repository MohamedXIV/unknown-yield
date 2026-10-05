# Phase 11 integrated exit gate

Issue #125 is the integration/evidence gate for hazardous industrial science and recovery. It adds no new gameplay subsystem.

## One-world proof

The dedicated `phase11-exit.test.ts` executes the accepted child contracts as one causal chain:

1. the Relief furnace is locked before hazard evidence exists;
2. a physical ferrite line feeds the Oversealed furnace;
3. the authored instability hazard occurs deterministically and strands conserved residue;
4. the incident, evidence and trapped material survive exact save/load;
5. `recoverMachineIncident` reclaims the material to the same machine output;
6. ordinary belts carry that recovered residue into terminal staging with the conservation ledger checked throughout;
7. the observed `slag-jam` evidence unlocks the Relief furnace;
8. a second physical ferrite line at the north deposit feeds the Relief furnace;
9. the same ferrite + Heat experiment produces residue without a new incident or trapped inventory;
10. the final safe state round-trips through save/load exactly.

## Browser gate

The existing real-Chromium acceptance is part of the required full CI suite. It already exercises the Phase 11 UI path introduced by #122–#124: learned hazard evidence appears only after a legitimate incident, physical recovery is executed from the machine panel, and the Relief furnace changes from locked to available only after `slag-jam` evidence exists.

## Completion rule

Phase 11 completed through #125 / PR #180. Exact head `52574cfe3157a4e67e2b9e2eba10c650a6f1b2e2` passed the repository full gate — tests including Chromium, typecheck, lint and build — before squash merge `1577f045312ac661c1453154d8bc121b6665fb3f`. Epic #102 is closed and Phase 12 / #103 is the active approved queue.
