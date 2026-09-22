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
- **Persistence:** save schema 2 in localStorage; content version is independent
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

## Run and play

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. The world is the primary play surface. There are no characters or robots. Start with the ferrite deposit, build an extractor and factory, place a crusher inside, and route belts through oriented wall ports to the company terminal. Structural plates arriving there fund expansion. Try the same crusher on veined ore to discover an export line. Furnaces enable a different experiment.

- WASD / arrows or middle/right drag: pan. Wheel: zoom. Home: center site.
- 1–6: extractor, factory, crusher, furnace, belts, wall port. R: rotate. Esc: cancel/close.
- Drag factories and belt paths; one belt occupies one grid cell. For a turn, finish the path before the corner and place the corner with the desired outgoing direction.
- Select a factory and press F (or use its panel) to reveal/close its roof.
- X: dismantle with refunds. Disable a running machine and wait for its batch to finish first.
- Knowledge, terminal policies and save/load are available from the compact top-right controls.
- Saves are manual and local to this browser. Schema 1 prototype saves are intentionally incompatible. A rejected load leaves the running world unchanged.

`npm run dev:studio` opens the separate development content editor. It is excluded from player production exports. No Studio expansion is part of this change.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Project status

The ongoing game foundation is the spatial construction and automation implementation described in [World building](docs/WORLD_BUILDING.md). The earlier fixed-site dashboard is superseded. Art remains temporary; balance and playtest enjoyment are not yet validated. Future content and visual development should build on this implementation.

The working title may change. Package naming remains independent of it.
