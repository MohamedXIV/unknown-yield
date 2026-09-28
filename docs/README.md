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
8. [ART_PIPELINE.md](ART_PIPELINE.md) — 2D presentation and the 3D-blockout-to-2D AI-assisted asset workflow.
9. [ROADMAP.md](ROADMAP.md) — proof-driven implementation phases and acceptance gates.
10. [EXECUTION.md](EXECUTION.md) — live issue order and execution workflow for humans/agents.
11. [DECISIONS.md](DECISIONS.md) — accepted decisions that should not be casually reopened.
12. [../AGENTS.md](../AGENTS.md) — implementation rules for humans and coding agents.

## Documentation principles

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
