# Unknown Yield

**Unknown Yield** is a working-title 2D industrial discovery game about learning the behavior of unknown off-world materials, turning risky experiments into reliable production, and exporting useful output through a company-operated terminal.

The game is not intended to be a Factorio clone, a colony sim, or a combat game. Its current identity is built around three connected ideas:

1. **Alien material science** — the player does not start with a recipe book. Materials have discoverable behaviors and operations can produce useful products, useless results, unstable compounds, hazards, or accidents.
2. **Factory as function** — factories are player-sized buildings with editable interiors. Once stabilized, a factory can be treated as a readable black box with explicit inputs, outputs, throughput, and hazards.
3. **Company dependency** — production has an economic purpose. Exports earn fuel allocation and unlock corporate capability, while the terminal remains the operational link to off-world infrastructure.

## Core loop

```text
Discover
  -> Extract
  -> Experiment
  -> Learn
  -> Industrialize
  -> Export / Use
  -> Gain fuel + capability
  -> Reach stranger materials
```

The most important gameplay space is the transition from **Experiment** to **Industrialize**: a process begins as something uncertain, inefficient, or dangerous, then becomes a repeatable production function the player understands and scales.

## Current technical direction

- **Rendering / world:** Phaser 4
- **Application shell / UI / tools:** Next.js + React
- **Simulation:** pure TypeScript package with no Phaser, React, DOM, or Canvas dependency
- **Content database / studio:** TinyBase
- **Content validation:** Zod
- **Persistence:** versioned save format; IndexedDB is a likely local persistence layer
- **Performance path:** Web Worker first when justified; Rust/WASM only after profiling proves a real need
- **Art:** 2D fixed-view game assets, with simple 3D blockouts/renders used as structural guides for consistent AI-assisted asset generation

## Documentation

Start with [docs/README.md](docs/README.md).

Key documents:

- [Game Design](docs/GAME_DESIGN.md)
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Content Model](docs/CONTENT_MODEL.md)
- [Simulation Model](docs/SIMULATION.md)
- [Art Pipeline](docs/ART_PIPELINE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decision Log](docs/DECISIONS.md)
- [Agent Rules](AGENTS.md)

## Project status

The repository is at foundation stage. The immediate goal is a **small playable vertical slice** that proves the core loop and architecture before content scale, native packaging, Rust, large-world optimization, or visual polish are allowed to expand scope.

The working title may change. The design principles above are more important than the title.
