# Phase 10 sensing observation contract

Issue #114 establishes the industrial sensing boundary used by later Phase 10 work.

## Authority

Authored survey signals are simulation/content truth. They are never part of the player snapshot.

The player receives only persisted sensing observations produced by an unlocked authored sensing capability.

`sim-core` remains authoritative. Phaser and React may present the public observations later but do not derive or own sensing truth.

## Authored hidden truth

A survey signal contains:

- a stable internal signal ID;
- a world position;
- authored signal strength;
- authored depth.

Those fields are deliberately absent from `PlayerSnapshot`. The public map also omits both `surveySignals` and raw sensing-capability unlock requirements.

Phase 10 #115 may connect this hidden survey layer to authored hidden deposits. #114 does not create or reveal those deposits.

## Public observations

A sensing command is deterministic for:

- content version;
- capability ID;
- target coordinate;
- current milestone/capability state.

The persisted observation contains only:

- capability ID and sensing mode;
- target coordinate;
- observation tick;
- quantized signal band: `none | weak | moderate | strong`;
- quantized depth band: `unknown | shallow | intermediate | deep`.

A scan never exposes depth. A probe may expose only the depth band, never authored depth or source identity.

Repeated sensing at the same coordinate with the same capability replaces that coordinate's observation instead of accumulating duplicate hidden provenance.

## Capability gate

Sensing capabilities are authored content. A capability may require a completed milestone. The simulation rejects sensing while that capability is locked.

The fixture currently includes:

- `survey-scanner`: broad scan contract;
- `core-probe`: local probe gated by `sealed-study-certified`.

These are contract fixtures, not final balance or final player-facing Phase 10 progression.

## Persistence

Issue #114 introduces:

- save schema 19;
- content `world-01-v12`;
- browser slot `industrial-site-save-v13`.

Schema 18 has no sensing knowledge, so its exact structural migration is an empty sensing-observation record. Content-version compatibility remains authoritative; no hidden observations are invented during migration.

On load, persisted observations are revalidated against the same authored content and capability state. A save cannot inject stronger bands, different depth evidence, invalid coordinates, or locked-capability observations.

## Non-goals

#114 intentionally does not add:

- hidden deposit definitions;
- deep extraction;
- a scanner/probe world UI;
- material/resource identity in observations;
- recipe/reaction output hints;
- Phase 11 hazards;
- new logistics modes.

Those remain in their roadmap issues.
