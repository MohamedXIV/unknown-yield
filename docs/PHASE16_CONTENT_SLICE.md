# Phase 16 — Representative content and balance slice (#157)

Issue #157 selects the production vertical slice from already-proven systems. It deliberately does not maximize material, recipe or contract count.

## Slice identity

The production slice should let a player explain this arc:

`Discover -> Experiment -> Industrialize -> Export`

through qualitatively different industrial problems rather than a long catalog.

## Representative beats

### 1. Structural discovery and opportunistic export

**Ferrite rubble** is both construction feedstock and experimental material.

Representative branch:

`Ferrite rubble -> Ambient Heat -> Magnetic ceramic`

This establishes the hidden-process premise while immediately creating a tradeoff between site capital and a specialty export whose market saturates quickly.

### 2. Reactive multi-state industry

**Veined ore** is the handling-state showcase:

`Veined ore -> corrosive liquid -> process vapor -> Conductive granules`

The slice uses:

- corrosion-resistant liquid handling;
- sealed gas handling;
- physical routing/backpressure;
- the bounded **Orbital conductor allocation** order.

This is the representative proof that material state changes factory layout rather than merely yield.

### 3. Resonant company learning

The resonance chain demonstrates exploration, higher operating fuel and company learning:

- resonance sensing reveals Catalytic stone;
- Deep extraction consumes physical Advanced propellant;
- local catalyst sintering discovers Resonant matrix;
- company property directives ask for applications rather than recipes;
- Orbital binder and the company-engineered Resonance seed remain physical imports;
- the imported seed leads to local Phase lattice and the deeper Phase probe.

The company therefore learns with the expedition instead of arriving omniscient.

### 4. Advanced unsafe-versus-protected choice

**Phase lattice** is the representative late material.

The unsafe branch:

`Phase lattice -> Oversealed Heat -> phase-shear lock`

uses the accepted deterministic instability-hazard/recovery model.

The production branch:

`Phase lattice -> Phase suspension -> Stabilized phase ceramic`

requires:

- Phase quencher;
- Phase stabilizer;
- Research-grade coolant;
- cryogenic-rated + hazard-isolated + secure-chain liquid containment.

This is the slice's compact demonstration of advanced fuel, hazard knowledge, protected logistics and physical intermediate state.

## Advanced objective

The final explicit production objective is the one-shot Corporate Order:

**Stabilized phase material demonstration**

- material: `phase-ceramic`;
- quantity: **4**;
- duration: **12000 ticks**;
- one-shot reward: **36 fuel**.

The order is not visible until Stabilized phase ceramic is company-known.

Four units are:

- one bounded industrial lot;
- below the 12-unit terminal shipment capacity;
- large enough to require repeated late processing rather than a single proof unit;
- still subject to the volatile Phase-ceramic Materials Exchange.

The cargo remains physical in terminal staging until the player selects a manifest and dispatches it.

## Market and pacing selection

#157 keeps the accepted #150 market/machine values rather than retuning by taste.

In particular, Phase ceramic remains:

- base compensation 28;
- floor compensation 9;
- saturation 1800 bps per unit;
- recovery 150 bps per market tick.

Existing evidence already proves:

- diversified exports outperform repeated top-product spam;
- repeated Phase-ceramic production stops funding its own imported operating fuel;
- durable progression is evidence/capability driven rather than export grind.

The new capstone reward is one-shot company work. It does not alter repeated market compensation.

## Company work used by the slice

The representative company beats are:

- `sealed-thermal-study`;
- `granules-procurement`;
- `matrix-local-route`;
- `matrix-orbital-application`;
- `phase-ceramic-demonstration`.

Other accepted content may remain available, but production acceptance should not require consuming every authored branch.

## Content compatibility

The fixture remains **`world-01-v14`**.

The new order is additive and late-gated:

- no existing material/reaction/machine/opportunity ID changes meaning;
- no save field changes;
- the order cannot appear before Phase ceramic becomes company-known;
- an existing compatible save may simply become eligible for this new one-shot opportunity on a later market refresh.

#158 owns the explicit supported-save/migration hardening pass and may tighten this policy based on fixture evidence.

## Acceptance gate

The exact closing head must prove:

- the selected representative reactions/material states/hazards exist and remain semantically distinct;
- the advanced order is bounded and hidden before Phase-ceramic knowledge;
- four physical Phase-ceramic units can be selected in a manifest and dispatched;
- dispatch completes the one-shot objective and reconciles the material ledger;
- save/load after completion remains exact;
- #150 diversification and late-fuel-loop regressions remain green;
- full repository tests, typecheck, lint and build pass.
