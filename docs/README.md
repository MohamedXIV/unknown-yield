# Unknown Yield Documentation

This directory is the project design and engineering source of truth. Documents describe **current decisions**, distinguish implementation proof from target design, and avoid turning provisional fixture values into sacred content.

## Reading order

1. [GAME_DESIGN.md](GAME_DESIGN.md) — player fantasy, pillars, core loop, progression and scope.
2. [ECONOMY.md](ECONOMY.md) — company economy, Materials Exchange, orders/directives, fuel, physical inventory, storage and conservation.
3. [FIRST_PLAYABLE.md](FIRST_PLAYABLE.md) — what the accepted playable foundation proves, its verification evidence, and its explicit temporary shortcuts.
4. [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — Next/React, Phaser, simulation, TinyBase, persistence, workers and possible Rust/WASM.
5. [CONTENT_MODEL.md](CONTENT_MODEL.md) — materials, operations, reactions, machines, market definitions, milestones and contracts as data.
6. [SIMULATION.md](SIMULATION.md) — simulation time, logistics, determinism, conservation, factory abstraction and performance rules.
7. [FACTORY_ABSTRACTION_EVALUATION.md](FACTORY_ABSTRACTION_EVALUATION.md) — Phase 3 #49 benchmark/equivalence harness and GO/NO-GO evidence rule.
8. [PHASE3_EXIT_REVIEW.md](PHASE3_EXIT_REVIEW.md) — accepted Phase 3 factory-as-function contract and evidence.
9. [PHASE4_EXIT_REVIEW.md](PHASE4_EXIT_REVIEW.md) — accepted Content Studio v1 authoring/preview contract and Phase 4 evidence.
10. [PHASE5_EXIT_REVIEW.md](PHASE5_EXIT_REVIEW.md) — accepted integrated Materials Exchange/company-progression exit gate and Phase 5 evidence.
11. [PHASE6_EXIT_REVIEW.md](PHASE6_EXIT_REVIEW.md) — accepted readable-belt and controlled-junction Phase 6 gate.
12. [PHASE7_PROFILING.md](PHASE7_PROFILING.md) — measured scale/performance evidence and the intentionally deferred budget gap.
13. [PHASE9_EXIT_REVIEW.md](PHASE9_EXIT_REVIEW.md) — accepted material-state logistics, containment and terminal-handling Phase 9 gate.
14. [ART_PIPELINE.md](ART_PIPELINE.md) — 2D presentation and the 3D-blockout-to-2D AI-assisted asset workflow.
15. [ROADMAP.md](ROADMAP.md) — proof-driven implementation phases and acceptance gates.
16. [EXECUTION.md](EXECUTION.md) — live issue order and execution workflow for humans/agents.
17. [DECISIONS.md](DECISIONS.md) — accepted decisions that should not be casually reopened.
18. [../AGENTS.md](../AGENTS.md) — implementation rules for humans and coding agents.

## Documentation principles

Phase 6 is complete through #84 / PR #89; [PHASE6_JUNCTIONS.md](PHASE6_JUNCTIONS.md) and [PHASE6_EXIT_REVIEW.md](PHASE6_EXIT_REVIEW.md) record its accepted routing contract and evidence. Phase 9 is complete through #113 / PR #167; [PHASE9_EXIT_REVIEW.md](PHASE9_EXIT_REVIEW.md) is the current integrated material-state logistics acceptance record. Issue #2 is archived execution history, not live direction.

### Current design beats implementation accidents

The first playable contains deliberate shortcuts. A shortcut is not a design decision merely because code exists for it. `FIRST_PLAYABLE.md` identifies those exceptions; `DECISIONS.md` and the domain docs define the forward contract.

### Describe systems, not sacred examples

Names such as sample materials, map dimensions, exact fuel values, bailout counts, or machine names may explain a system. Unless explicitly locked, they are **not canonical final content**.

### Data before hard-coding

If a value, relationship, unlock condition, material property, process, hazard, market rule, contract, or balance number is likely to change, it belongs in content data rather than renderer/UI code.

### Gameplay truth is not renderer truth

The simulation owns gameplay truth. Phaser presents the world. React presents game UI and tools. TinyBase owns editable content definitions, not high-frequency world state.

### Scope is a feature

Prefer a small complete loop over broad half-built systems. New infrastructure must justify itself against the current proof target.


- [PHASE13_SHIPMENT_MANIFESTS.md](PHASE13_SHIPMENT_MANIFESTS.md) — Phase 13 #132 cargo manifests and shipment-capacity contract.

- [PHASE13_IMPORTS.md](PHASE13_IMPORTS.md) — Phase 13 #133 physical off-world import staging and dry outlet contract.

- [PHASE13_TERMINAL_HANDLING.md](PHASE13_TERMINAL_HANDLING.md) — Phase 13 #134 bidirectional terminal handling gates and specialized containment.

- [PHASE13_MARKET_MEMORY.md](PHASE13_MARKET_MEMORY.md) — Phase 13 #135 discovery-created demand shocks and persistent market memory.

- [PHASE13_PROPERTY_DIRECTIVES.md](PHASE13_PROPERTY_DIRECTIVES.md) — Phase 13 #136 hidden-solution property directives and physical import-allocation rewards.

- [PHASE13_STRATEGIC_STOCKPILES.md](PHASE13_STRATEGIC_STOCKPILES.md) — Phase 13 #137 physical stockpile and delayed demand-response proof.

- [PHASE13_EXIT_REVIEW.md](PHASE13_EXIT_REVIEW.md) — Phase 13 #138 integrated terminal/off-world exchange acceptance gate.

- [PHASE14_UNDERGROUND.md](PHASE14_UNDERGROUND.md) — Phase 14 #139 explicit underground solid/liquid route contract.

- [PHASE14_ELEVATED.md](PHASE14_ELEVATED.md) — Phase 14 #140 support-constrained elevated solid gantry contract.

- [PHASE14_EXIT_REVIEW.md](PHASE14_EXIT_REVIEW.md) — Phase 14 #144 integrated layered-logistics gate and #141–#143 evidence decisions.

- [PHASE15_MATERIAL_FAMILIES.md](PHASE15_MATERIAL_FAMILIES.md) — Phase 15 #145 representative differentiated material-family contract.

- [PHASE15_KNOWLEDGE_GRAPH.md](PHASE15_KNOWLEDGE_GRAPH.md) — Phase 15 #146 evidence-gated partial knowledge graph without recipe spoilers.

- [PHASE15_FUEL_PROGRESSION.md](PHASE15_FUEL_PROGRESSION.md) — Phase 15 #147 physical advanced/research operating fuel classes.

- [PHASE15_RECURSIVE_COMPANY_TECH.md](PHASE15_RECURSIVE_COMPANY_TECH.md) — Phase 15 #148 player discovery → company R&D → imported capability → deeper local industry.

- [PHASE15_LATE_GAME_INTEGRATION.md](PHASE15_LATE_GAME_INTEGRATION.md) — Phase 15 #149 advanced hazard, containment and layered-logistics content integration.

- [PHASE15_PACING_BALANCE.md](PHASE15_PACING_BALANCE.md) — Phase 15 #150 measured diversification, pacing and fuel-loop balance gate.

- [PHASE15_STUDIO_AUDIT.md](PHASE15_STUDIO_AUDIT.md) — Phase 15 #151 evidence-gated targeted economy authoring for Content Studio.

- [PHASE15_EXIT_REVIEW.md](PHASE15_EXIT_REVIEW.md) — Phase 15 #152 fresh-expedition integrated exit gate.


- [PHASE16_ART_VALIDATION.md](PHASE16_ART_VALIDATION.md) — Phase 16 #153 representative final-direction art asset contract.

- [PHASE16_FEEDBACK.md](PHASE16_FEEDBACK.md) — Phase 16 #154 authoritative machine/logistics/discovery/warning/hazard audio and FX contract.

- [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md) — Phase 16 #155 contextual observation/experimentation/automation onboarding contract.
