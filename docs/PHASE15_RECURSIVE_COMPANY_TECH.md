# Phase 15 — Recursive company technology (#148)

Issue #148 proves one recursive company-learning loop without introducing XP, a research currency, or a parallel technology tree.

## Accepted chain

The canonical proof is:

1. The expedition discovers a **local resonant-matrix route** with catalytic stone.
2. Because Matrix is now company-known, the company offers **Orbital matrix application study** without revealing its hidden recipe.
3. The expedition confirms the existing orbital-binder matrix application.
4. Completing that company R&D opportunity unlocks a previously unavailable physical import: **Orbital resonance seed**.
5. The seed is delivered through the normal bounded dry import staging and becomes company-known only because the R&D opportunity completed.
6. Local sintering of that imported seed produces **Phase lattice**.
7. Confirming Phase lattice completes the **Phase-lattice field calibration** milestone.
8. That milestone unlocks the **Phase probe**.
9. The Phase probe reveals a depth-18 native **Phase lattice seam** that was absent from player-facing world state before the probe.
10. The existing Deep extractor can establish local extraction because its authored depth capability reaches that seam.

The recursion is therefore:

`player discovery -> company R&D -> off-world capability -> local experiment -> deeper local resource access`

## Authority and persistence

No new persisted R&D currency or unlock list exists.

Company R&D availability is derived from existing persisted opportunity state:

- an import may declare `requiredOpportunityId`;
- before that opportunity is completed, the supply is omitted from player-facing import views and direct requests are rejected as unavailable;
- after completion, the company may know the imported material even though it was unknown at expedition start.

Reaction evidence, milestones, sensing observations and discovered deposits keep their existing authoritative persistence rules.

## Spoiler boundary

The company opportunity may promise **new off-world capability** but the UI must not reveal the hidden import name before the opportunity completes.

The import, its material identity and the Phase-lattice process become visible only when the authoritative prerequisite is satisfied.

## Physical/conservation rules

The unlocked resonance seed is still a normal physical import:

- it occupies terminal import staging;
- moving it into a machine is physical inventory transfer;
- sintering consumes the seed through the normal reaction ledger;
- Phase lattice is produced through the normal reaction ledger;
- the native seam is an authored finite deposit;
- Deep extraction subtracts from that deposit and creates ordinary machine output.

Nothing is granted as a magical technology token.

## Explicit non-goals

#148 does not add:

- generic research points;
- a spendable tech tree;
- arbitrary company omniscience;
- automatic recipes;
- a second import inventory;
- a new extractor class;
- late-game hazard breadth (#149);
- pacing/balance pass (#150);
- generic Studio tooling (#151).

## Acceptance evidence

The merge gate requires:

- content validation for the opportunity/import/reaction/milestone/probe/deposit chain;
- a deterministic sim regression that proves the hidden import is unavailable before R&D completion;
- completion granting one physical import allocation;
- imported seed processing into Phase lattice;
- milestone/probe unlock;
- hidden seam discovery;
- successful Deep extractor use on the seam;
- material-ledger reconciliation;
- deterministic save/load after the recursive loop;
- full repository tests, typecheck, lint and build on the exact PR head.
