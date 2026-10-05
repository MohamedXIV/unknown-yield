# Economy, Markets, and Physical Inventory

**Status:** accepted design direction, 2026-09-22.

Unknown Yield is not primarily a money game. Its economy exists to make industrial discovery matter, keep the expedition dependent on the off-world company, and reward a flexible production network rather than one permanently optimal recipe.

## 1. Three resources, three jobs

### Local materials — build the operation
Factories, logistics, storage, terminal modules and most ordinary infrastructure are built from materials produced on the planet.

### Company allocations — operate advanced industry
Exports earn company-provided fuel and other supplies that are unavailable locally, at least initially. Fuel is an operational constraint rather than abstract cash.

### Knowledge / milestones — unlock capability
Progression comes from discoveries and demonstrated capability, not generic XP grinding.

These systems may interact, but should not collapse into one universal currency.

## 2. The market has three layers

### Materials Exchange
A product can appear on the exchange only after the company knows it exists.

Compensation is driven by authored/economic state such as baseline utility, current demand, recent supply/saturation, strategic programs or shortages, and a floor for broadly useful basic materials.

Prices should move slowly enough for industrial planning. Basic products tend toward **lower ceiling / higher stability**; advanced products can have **higher ceiling / higher volatility**.

### Corporate Orders
Temporary procurement opportunities for known products. They specify a quantity, cargo/quality constraints where relevant, and a clear premium or allocation reward. They are opportunities, not mandatory quests.

### Special Directives
Differentiated requests that point back toward experimentation: research samples, prototypes, quality/stability challenges, emergency procurement, property-based industrial problems, recovery/recycling requests, or experiments whose result is not known in advance.

Rewards may include fuel, advanced fuel, imported components, catalysts, terminal modules, unique machine variants, research capability, cargo allocation or company-standing benefits.

## 3. Discovery can create a market

The company is not omniscient.

```text
discover
-> characterize
-> company learns
-> market listing / application appears
-> demand evolves
```

A material can therefore create its own future economic branch. First export may be scientific; later exports become industrial.

## 4. Demand and saturation, not arbitrary price RNG

Heavy repeated exports should increase saturation and reduce marginal compensation. Stopping supply allows demand/saturation to recover toward a baseline over time.

A market shock should have an understandable source where practical: orbital construction, propulsion research, a shortage, a new corporate application, or a player-created material class.

The market should never require tearing down working infrastructure just to follow a short spike.

## 5. Factories are persistent capital

A factory is an asset, not a disposable recipe slot. When demand changes, the intended response is to suspend one line, preserve its buffers/layout, redirect shared inputs with splitters/switches/valves, start another existing line, and later resume the old line.

Long-term progression should reward flexible routing and modular factories.

## 6. Material-conservation invariant

> **Nothing disappears. Everything produced exists somewhere until it is transformed, consumed by a defined process, stored, or exported off-map.**

Consequences:

- belt cargo does not vanish when a route is changed;
- stopped factories retain input, output and in-progress state;
- waste is real inventory;
- dead stock is a logistics/economic problem, not a delete button;
- deconstruction must empty, relocate or account for contents;
- safe disposal, if needed, is itself an authored industrial process;
- recycling/reclaim recovers value only through defined rules.

The current first playable's global `site stock` convenience for non-construction materials is a temporary proof shortcut, not an accepted final mechanic. The explicit buffer-`discard` escape hatch was removed in Issue #5: buffered machines and loaded belts refuse dismantling instead of deleting or teleporting their contents.

## 7. Storage is geography

Storage is not a magical global inventory. Warehouses, tanks, silos, sealed stores and other handling facilities occupy space and create transport decisions.

A mature site may have raw-material storage, production buffers, terminal staging, strategic reserves, and specialized hazardous/cold/pressurized storage. Keeping old product can be rational if demand may recover or a new process later gives it value.

## 8. Material ledger

The simulation should be able to reconcile material accounting:

```text
initial world amount
+ extracted / created by defined reactions
- transformed into other tracked material
- exported off-map
- explicitly consumed by a defined sink
= amount currently existing in tracked world locations
```

Useful views may break current amount into in-transit, machine inputs/outputs, in-process reservations, storage and terminal staging. Conservation should become an automated test invariant.

## 9. Terminal and export

Export is a physical end of a logistics chain. Belt cargo stages at the terminal in a bounded tracked location and ships per policy; only staged exportables convert to fuel. Once a shipment leaves the map, its tracked world records can be removed and compensation/allocation is credited. Construction plates bypass staging into site stock to keep the construction bootstrap practical.

The terminal imports only things the planet operation cannot currently provide itself: fuel, specialized catalysts/components, research-grade supplies and later advanced allocations.

Terminal modules gate handling classes such as dry cargo, liquids, pressure gas, cryogenic cargo, hazardous materials and secure high-value cargo.

## 10. Fuel classes

Fuel classes are data-driven and should differ by capability and logistics, not merely color. A possible direction is ordinary industrial fuel, advanced sealed/cartridge fuel, and exotic/research-grade cells requiring specialized storage.

Higher fuel may power deep extraction, high-pressure processing, advanced transport or exotic machinery. Exact names/counts remain content decisions.

## 11. Corporate assistance

Assistance prevents an accidental economic soft-lock without becoming free fuel. Assistance packages are authored company allocations with stable IDs, localized presentation, a fuel-depletion eligibility threshold, a bounded fuel grant, a base obligation, a repeat-intervention obligation step, a recovery-continuation obligation and a net-export recovery target.

A **new intervention** begins only with no open obligation. If operating fuel collapses again before standing resets, its obligation increases by the authored repeat-intervention step. If fuel instead collapses while that intervention's obligation is still open, the site may request a **recovery continuation** only after real export compensation has repaid at least the authored continuation-obligation amount since the previous allocation. The continuation adds exactly that same amount back to the obligation and resets the repayment-progress counter, without increasing the intervention streak. Because eligibility requires repayment at least equal to the debt it adds, a continuation cannot ratchet the obligation upward cycle-over-cycle and cannot be spammed without industrial export progress. There is deliberately no hard intervention cap or implicit Game Over in this slice: a hard cap could itself create an unrecoverable site.

Export compensation is the only repayment path. Gross legal export compensation first reduces the outstanding obligation; only the remainder becomes usable fuel. Order and Directive bonus allocations remain separate company rewards: they add their authored fuel reward but neither repay the obligation nor count toward standing recovery.

Standing returns from `recovery` to `clear` only after the obligation is zero and cumulative **net export fuel** reaches the authored recovery target. Recovery progress already earned is preserved if debt later reopens through a repeat intervention or continuation; it simply cannot advance again until debt is zero. Resetting standing clears that progress and resets the consecutive intervention streak. This makes successful industrial recovery—not merely receiving a bailout—the reset event.

Fuel allocations are not physical materials and therefore do not create or delete material ledger entries. Assistance may change only company fuel/obligation/standing state; factories, routing, storage, staged cargo and material accounting remain untouched.

## 12. Design guardrail

The economy should push the player toward **diversification and adaptable industry**, not turn the game into a stock-trading UI.

The market tells the player what became valuable. The player's response happens primarily in the world: factories, routing, storage, terminal handling and industrial choices.

## 13. Phase 5 implementation boundary

The #69 baseline makes the Materials Exchange authoritative in `sim-core`. Exchange eligibility is authored independently from material identity; runtime listing state is created only after the company can know a material. Compensation derives from authored baseline/floor demand parameters plus persisted saturation, repeated physical exports raise saturation, and saturation recovers deterministically on a slow market cadence.

The terminal remains the physical export boundary and the material ledger remains unchanged: market state changes compensation, never material accounting. React may present current compensation and saturation for known listings but does not own price truth.

Issue #70 adds one-shot authored Corporate Orders and Special Directives on the same slow company cadence. Orders appear only for company-known exchange products, count only cargo that physically ships from terminal staging, and grant one authored completion allocation. Directives request an operation + known input + setup without revealing the authored reaction/output; completion derives from confirmed experiment evidence. Offer, expiry, progress and completion state are authoritative in `sim-core` and persisted.

Issue #71 adds the evidence milestone/terminal-handling proof without inventing a cosmetic second fuel class. Issue #72 adds authored assistance packages, obligation repayment and minimal recovery standing. Opportunities remain bounded industrial prompts, not a rotating quest feed or separate dashboard economy.


## 14. Evidence milestones and terminal handling (#71)

Company progression now has a small data-driven milestone graph. Milestones consume stable authoritative evidence such as confirmed reactions, exported quantities, completed orders/directives, earlier milestones or terminal capabilities; there is no XP counter or spend-to-unlock path.

The current authored proof uses confirmed `heat-raw-sealed` trial evidence to certify one outbound terminal handling capability. The time-limited Sealed thermal study may reward that experiment, but it is not a permanent progression prerequisite. Conductive granules may be known, listed and staged before that certification, but an export policy cannot remove them from staging until the handling capability is unlocked. Locked cargo therefore remains physical inventory, consumes bounded staging capacity and can backpressure the terminal approach. Compensation, order progress and the export ledger update only after a legal physical shipment.

Content validation rejects milestone cycles and rejects a terminal capability whose unlock path depends on exporting the same material that capability blocks. The accepted fixture therefore has no circular prerequisite: the durable confirmed-trial evidence remains obtainable through experimentation even if the optional Directive expired or never appeared.

No additional fuel/allocation class is introduced in this slice. The current game still demonstrates only one operational fuel behavior; a second class would be cosmetic rather than a distinct industrial capability. #71 leaves fuel-class breadth deferred until an actual machine/logistics behavior requires it.


## 15. Assistance and recovery standing (#72)

The starter package `emergency-fuel` is eligible below its authored fuel threshold. With no open obligation it starts a new intervention and creates an obligation at least as large as the grant. A later new intervention before standing is restored uses the authored repeat step. With an obligation still open, a recovery continuation is available only after exports have repaid at least 12 fuel since the prior allocation; it grants 36 fuel, adds 12 obligation and does not increment the intervention streak. This repayment-earned bridge exists specifically so a viable saturated line cannot strand itself a few obligation units short of recovery.

The recovery path is intentionally independent from time-limited Corporate Opportunities. In particular, an expired Sealed thermal study cannot block recovery: assistance can fund the durable real sealed Heat experiment, that confirmed evidence unlocks the #71 terminal handling capability, and legal granule exports can then repay the obligation and rebuild standing. The Directive may still award its optional bonus when available, but it is not part of assistance eligibility or recovery truth.

Existing `debt` remains the authoritative outstanding obligation for compatibility. Bonus Order/Directive allocations never reduce it. Only Materials Exchange compensation from a legal physical export repays it before net fuel is credited.


## Phase 13 — physical off-world imports (#133)

The Earth/company -> planet direction is now materialized as terminal cargo rather than a global purchase result. Authored import supplies spend company fuel and arrive into a bounded `terminalImports.staging` holding. The imported units are recorded as an explicit material source in the conservation ledger, remain physically present at the terminal, and leave through a deterministic dry-cargo outlet into ordinary belts.

The first proof supply is **Orbital binder**. It is initially company-known, has no local deposit/source and is not exchange-listed, so it cannot be round-tripped directly for fuel. A Sinterer can consume the imported binder to discover Resonant matrix. This makes the import useful industrial feedstock while preserving the long-term possibility that other locally sourced materials can later replace off-world dependence.

Import request is immediate once affordable because the strategic constraint is physical handling/capacity, not a waiting timer. The terminal holding is bounded by the same authored cargo-capacity dimension introduced in #132; a blocked or missing outlet therefore produces real backpressure at the company boundary rather than teleporting supplies into site stock.


## Phase 13 — bidirectional terminal handling gates (#134)

Terminal handling modules now use the same authored handling-state + containment-capability contract in both directions. A module may represent solid, liquid or gas cargo, and more specialized classes such as cryogenic, hazardous or secure custody are expressed as ordinary all-of containment capabilities rather than a parallel taxonomy.

Off-world imports may name a required terminal module. Delivery is refused while that capability is locked, while the module is uninstalled, when another material occupies the single-material holding, or when capacity is exhausted. Accepted cargo enters the module's real persisted holding; it does not enter site stock or a second virtual import inventory. Import-only module cargo then exits through the same fixed edge port into an ordinary belt, pipe or pressure line. Incompatible downstream containment retains the cargo in the terminal module.

The fixture proves three paths: Orbital binder through the bounded dry import holding and belt outlet, Orbital propellant through the existing gas dock, and Orbital coolant through a specialized liquid dock requiring cryogenic-rated + hazard-isolated + secure-chain containment. The latter can enter only a matching `sealed-cold` liquid path.
