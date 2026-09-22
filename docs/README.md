# Unknown Yield Documentation

This directory is the project design and engineering source of truth. Documents should describe **current decisions**, distinguish them from experiments, and avoid turning provisional examples into hard-coded rules.

## Reading order

1. [GAME_DESIGN.md](GAME_DESIGN.md) — what the game is, what the player does, and what is intentionally out of scope.
2. [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — boundaries between Next/React, Phaser, simulation, TinyBase, persistence, workers, and possible Rust/WASM.
3. [CONTENT_MODEL.md](CONTENT_MODEL.md) — how materials, operations, reactions, machines, milestones, contracts, and terminal capabilities are represented as data.
4. [SIMULATION.md](SIMULATION.md) — simulation time, factory abstraction, logistics, determinism, scale, and performance rules.
5. [ART_PIPELINE.md](ART_PIPELINE.md) — 2D presentation and the 3D-blockout-to-2D AI-assisted asset workflow.
6. [ROADMAP.md](ROADMAP.md) — implementation phases and acceptance gates.
7. [DECISIONS.md](DECISIONS.md) — decisions that should not be casually reopened without new evidence.
8. [../AGENTS.md](../AGENTS.md) — implementation rules for humans and coding agents.

## Documentation principles

### Describe systems, not sacred examples

Names such as `Keralith`, example map directions, sample recipes, exact fuel values, exact bailout counts, or machine names may be useful to explain a system. Unless a document explicitly marks one as locked content, examples are **not canonical content**.

### Data before hard-coding

If a value, relationship, unlock condition, material property, process, hazard, contract, or balance number is likely to change through design work, it belongs in content data rather than in renderer or UI code.

### Gameplay truth is not renderer truth

A sprite existing on screen does not make it authoritative simulation state. The simulation owns gameplay truth. Phaser presents it. React presents application UI. TinyBase owns editable content definitions, not per-frame world state.

### Scope is a feature

The project should prefer a small complete loop over a wide collection of half-built systems. New infrastructure must justify itself against the current vertical slice.
