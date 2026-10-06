# Phase 15 — Pacing, diversification and dominant-strategy balance (#150)

Issue #150 is a **content/economy tuning pass**, not a new progression system.

The accepted goal is to keep discovery and persistent-line reconfiguration economically useful while avoiding:

- bulk-export grind milestones;
- one permanently dominant product;
- advanced chains that finance themselves forever at saturated demand;
- company premiums so large that ordinary Materials Exchange values stop mattering;
- teardown/rebuild churn as the expected response to changing value.

## Balance method

The authoritative regression uses the existing Materials Exchange and Order functions directly. No spreadsheet-only formula or UI approximation owns the result.

The representative comparison is two full 12-unit terminal cargo windows (24 total exported units) with no market recovery between them.

### Single-product strategies

With the current authored saturation and bounded one-shot Order premium:

| Strategy | 24-unit total company fuel |
| --- | ---: |
| Conductive granules only | 216 |
| Magnetic ceramic only | 216 |
| Catalyst powder only | 208 |

The first shipment receives fresh-market value; the second pays the cost of having saturated the same listing.

### Diversified strategy

Each 12-unit window is:

- 4 Conductive granules;
- 2 Magnetic ceramic;
- 6 Catalyst powder.

Across two windows the authoritative total is **284 fuel**.

That is more than **31% above** the best single-product result and clears the executable acceptance floor of **25%**. The advantage comes from spreading saturation and completing small company premiums, not from a hidden diversification multiplier.

## Bounded company premiums

#150 adds two one-shot Orders to branches that previously lacked a company premium:

- **Magnetic ceramic qualification lot** — 2 units, +12 fuel;
- **Catalyst powder reserve** — 4 units, +16 fuel.

Existing Granules and Matrix Orders remain unchanged.

Guardrails enforced by test:

- every authored Order target is at most 4 units;
- reward fuel per requested unit is no larger than that material's baseline exchange compensation;
- export-count milestone requirements, if authored later, must stay at most 4 units in this compact fixture.

The result is a reason to keep alternate factories available, not a quest grind.

## Stable recovery versus advanced bursts

The low end of the economy must remain recoverable.

At saturated market floors:

- Granules floor compensation remains above one Crusher batch's ordinary fuel;
- Catalyst powder floor remains above one Crusher batch's ordinary fuel;
- Magnetic ceramic floor remains above one Furnace batch's ordinary fuel.

These are weak but viable recovery outlets.

Advanced products intentionally behave differently.

### Matrix

One local Catalyst -> Matrix batch consumes one research-coolant unit. At current import terms that physical coolant represents 9 company fuel per unit.

- Matrix base compensation: 16;
- Matrix floor: 6.

Fresh demand can justify the branch; saturated demand cannot finance the same special-fuel loop indefinitely.

### Phase ceramic

One native Phase ceramic unit requires:

- one deep-extraction batch using Advanced propellant: 8 company-fuel equivalent;
- one Phase quench using Research coolant: 9;
- one Phase stabilization using Research coolant: 9.

Representative operating allocation: **26**.

- Phase ceramic base compensation: 28;
- Phase ceramic floor: 9.

It is therefore a profitable high-value burst at fresh demand but strongly loss-making as a saturated one-product backbone. This preserves the point of switching back to other persistent lines.

These comparisons deliberately ignore local material scarcity and construction capital, so they are conservative against advanced-loop dominance.

## Reconfiguration, not churn

The balance model assumes factories remain persistent capital as defined in the economy design:

- high-saturation lines can stop with buffers intact;
- alternate lines can resume;
- shared logistics can be redirected;
- stored product can wait for demand recovery;
- nothing needs to be destroyed merely because another product is temporarily more valuable.

#150 therefore changes company incentives, not dismantling rules.

## Explicit non-goals

This issue does not add:

- a diversification XP bonus;
- random market prices;
- recurring quest generation;
- universal money;
- new factory relocation mechanics;
- new transport or hazard systems;
- final campaign pacing claims beyond this compact fixture.

Fresh-expedition integration remains the #152 exit gate.

## Acceptance evidence

The closing exact-head gate requires:

- the executable 24-unit strategy comparison;
- bounded Order quantities and premiums;
- ordinary-floor recovery viability;
- advanced-floor non-self-funding proof;
- existing market/order/directive tests unchanged in meaning;
- full repository tests, typecheck, lint and build.
