# Phase 15 — Late-game hazard, handling and logistics integration (#149)

Issue #149 integrates already-proven Phase 9, Phase 11 and Phase 14 systems into advanced Phase 15 content. It does not introduce a new generic logistics, containment or hazard framework.

## Advanced phase chain

The canonical proof begins after the accepted #148 recursive company-technology loop has made **Phase lattice** available.

Two authored process choices now diverge:

### Unsafe thermal branch

Putting Phase lattice through the existing **Oversealed furnace** resolves the authored `heat-phase-lattice-oversealed` reaction.

- the result is deterministic;
- the incident is `phase-shear-lock`;
- it is classified by the existing **instability** hazard class;
- one unit of residue is stranded in machine incident inventory;
- the machine locks out and disables;
- existing `recoverMachineIncident` moves the conserved residue back into the normal machine output;
- hazard evidence remains learned after recovery.

No new hazard consequence type is added.

### Protected production branch

The useful route is:

`Phase lattice -> Phase suspension -> Stabilized phase ceramic`

- **Phase quencher** performs `phase-quench`;
- **Phase stabilizer** performs `phase-stabilize`;
- both are ordinary authored processor definitions using existing research-grade coolant fuel;
- Phase suspension is a liquid requiring **cryogenic-rated + hazard-isolated + secure-chain** containment;
- Standard and Lined liquid profiles are therefore insufficient;
- the accepted **sealed-cold** profile is sufficient;
- Stabilized phase ceramic returns to dry solid handling and has a company exchange listing.

## Phase 9 reuse

Phase suspension uses the existing authoritative liquid model:

- machine liquid output buffer;
- protected pump;
- directed protected route;
- backpressure;
- exact containment diagnostics;
- ordinary machine liquid input;
- exact material ledger accounting.

No new fluid rules, global inventory or per-particle simulation is introduced.

## Phase 11 reuse

The unsafe Phase-lattice thermal experiment uses the existing deterministic hazard framework:

- authored reaction + explicit process condition;
- existing `instability` class;
- existing lockout consequence;
- existing incident inventory;
- existing physical recovery command;
- persistent hazard evidence.

The safe route is a different physical process rather than a probability modifier.

## Phase 14 reuse

The integrated regression routes Phase suspension through an existing **underground liquid** span.

- only entry/exit portals occupy the surface;
- a normal surface belt can cross the buried middle span;
- the Standard buried route rejects the protected suspension without loss;
- an empty Standard route can be reclaimed and replaced with a sealed-cold route;
- the sealed-cold profile persists while cargo is in transit;
- save/load remains exact mid-transit.

This does not make underground transport mandatory for every late-game factory. It demonstrates that accepted layered logistics remains valid for the new protected material when the layout benefits from reclaiming surface space.

## Conservation and knowledge

Every unit remains physically accounted for:

- historical Phase lattice entering the #149 regression is represented as prior reaction production and simultaneously held in machine input;
- unsafe output becomes incident inventory and then normal machine output after recovery;
- safe output remains in the quencher until a compatible route exists;
- underground transit is persisted;
- the stabilizer consumes Phase suspension through the normal reaction ledger;
- Phase ceramic appears only after its reaction is confirmed.

No hidden recipe definitions are projected to the player.

## Non-goals

#149 does not add:

- new transport modes;
- a second liquid system;
- new hazard consequence mechanics;
- generic safety tech;
- random accidents;
- global advanced-material inventory;
- Phase 16 endgame systems.

## Acceptance gate

The closing exact-head gate requires:

- content/schema and locale validation;
- proof that Standard/Lined containment cannot carry Phase suspension while sealed-cold can;
- deterministic `phase-shear-lock` evidence and physical recovery;
- successful protected underground-liquid transit;
- a surface route crossing the buried middle span;
- mid-transit save/load equivalence;
- successful stabilization into Phase ceramic;
- material-ledger reconciliation throughout;
- final deterministic save/load;
- full repository tests, typecheck, lint and build.
