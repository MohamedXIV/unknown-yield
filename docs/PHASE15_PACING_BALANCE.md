# Phase 15 — Pacing, diversification and dominant-strategy balance (#150)

Issue #150 is a balance/evidence pass over the already accepted Phase 15 systems. It does not add a new economy layer, progression currency or logistics foundation.

## Balance questions

The phase needs evidence for three failure modes:

1. **One-product dominance:** a single high-value export should not remain the best sustained strategy once market saturation is applied.
2. **Grind progression:** durable capability milestones should come from evidence/capability rather than large repeated export counts.
3. **Trivial fuel recursion:** late physical fuel imports must not create an indefinitely self-funding export loop.

Persistent factories and storage should make switching or delaying production rational instead of encouraging teardown.

## Diversification metric

The acceptance regression compares two twelve-unit plans using the same authored market rules:

- **spam:** three four-unit lots of the current highest-base-compensation listing;
- **diversified:** one four-unit lot from each of the three highest-base-compensation listings.

The comparison uses authoritative `applyExportCompensation` behavior, including persisted saturation between lots.

Acceptance requires the diversified plan to return more gross company fuel than repeated spam.

The test deliberately ranks current listings from content instead of hard-coding a sacred final economy. The current top listing is expected to be Phase ceramic, whose high ceiling is paired with a much lower floor and aggressive saturation.

## Corporate opportunity pacing

Current authored Corporate Orders remain bounded:

- they target distinct materials;
- each requested quantity fits within one terminal shipment capacity;
- each offers a positive one-shot fuel bonus;
- offer duration is materially longer than one market cadence.

Special property directives are not repeatable fuel faucets: the current Phase 15 directives use physical import allocations rather than recurring fuel rewards.

## Durable progression pacing

Milestones stay evidence-led.

Any future `material-exported` milestone is constrained by this acceptance contract to at most one terminal shipment capacity. The current milestone graph is driven primarily by confirmed reactions and earlier capabilities, so the expedition does not progress by exporting hundreds of filler units.

## Late fuel-loop metric

The accepted late Phase chain requires:

- Advanced propellant for Deep extraction;
- Research-grade coolant for Phase quenching;
- Research-grade coolant again for Phase stabilization.

For a given number of Phase ceramic units, the acceptance regression derives required import purchases from:

- authored machine fuel consumption;
- authored import quantities;
- authored import fuel costs.

It then compares those costs with authoritative Phase ceramic export compensation across repeated four-unit lots.

A first specialty batch may be profitable. That is intentional: discovery should create an exciting opportunity.

Acceptance requires the **repeated** loop to stop funding itself after market saturation. The player therefore needs a broader industrial base rather than converting one late material into an infinite fuel engine.

## Reconfiguration rather than churn

Phase 13 already supplies the physical proof in `strategic-stockpile.test.ts`:

- real production is stockpiled before an opportunity appears;
- production is suspended without deleting the factory;
- existing geographic inventory is later routed to the terminal;
- save/load preserves the stockpile;
- conservation remains exact.

#150 treats that accepted persistent-capital behavior as the intended response to changing market signals. Balance changes must not require deleting solved factories merely to follow price movement.

## Acceptance boundary

#150 is complete when the exact PR head proves:

- bounded/diverse Corporate Orders;
- no grind-sized durable export gate;
- diversified exports beat sustained top-product spam;
- the late Phase ceramic chain is not a sustained self-funding fuel loop;
- existing stockpile/reconfiguration regression remains green;
- full repository tests, typecheck, lint and build pass.

If the existing authored values already satisfy these measurements, no numerical rebalance is required. Evidence is preferred over changing numbers for its own sake.
