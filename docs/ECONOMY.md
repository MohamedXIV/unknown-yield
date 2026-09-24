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

The current first playable's `discard` command and global `site stock` are temporary proof shortcuts, not accepted final mechanics.

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

Assistance prevents an accidental economic soft-lock. It creates an obligation repaid by future exports. Repeated unresolved interventions can threaten the operation, while successful recovery should restore standing over time. Exact intervention count and reset rules are balance data.

## 12. Design guardrail

The economy should push the player toward **diversification and adaptable industry**, not turn the game into a stock-trading UI.

The market tells the player what became valuable. The player's response happens primarily in the world: factories, routing, storage, terminal handling and industrial choices.
