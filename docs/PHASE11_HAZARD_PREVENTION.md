# Phase 11 evidence-driven safety capability

Issue #124 turns learned hazard evidence into a deterministic prevention capability.

## Unlock identity

Machine unlocks may now reference either confirmed reaction knowledge or an observed hazard incident ID. The Relief furnace uses the latter:

- unlock evidence: `slag-jam`;
- localized hint: observed Vitrified slag jam evidence from excessive confinement;
- no XP, currency, arbitrary flag or display-text comparison participates in the unlock.

The player-facing machine definition exposes only whether the requirement is satisfied and its hint text. It does not expose unobserved hazard catalog entries.

## Prevention proof

The Relief furnace has the authored `relieved` process condition. Ferrite + Heat in this setup resolves to `heat-ferrite-relieved`, producing the same conserved residue material without a hazard or trapped incident inventory.

Before `slag-jam` is observed the machine cannot be placed. After the incident is learned, placement becomes available deterministically. Repeating the ferrite heat experiment in the Relief furnace completes without adding another hazard incident.

This is prevention through a changed physical setup learned from evidence, not a probability modifier.
