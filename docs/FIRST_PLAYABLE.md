# First Playable — accepted foundation

**Status:** accepted foundation, 2026-09-22.

This slice replaces the retired fixed-site/dashboard prototype. The game is now a full-screen spatial automation world: the player is the camera/builder, places extractors and factories, opens factory roofs to edit interiors, routes physical belts through wall ports, observes automatic production, discovers hidden outcomes, exports useful material for company fuel, and saves/restores the running site.

## What this slice proves

- **Game-first presentation:** the world is the primary surface. React panels are overlays/inspectors, not a SaaS dashboard containing the game.
- **Architecture:** `sim-core` owns gameplay truth; Phaser owns world rendering/input; React owns UI; TinyBase is authoring/content tooling.
- **Spatial construction:** player-built factories, machines, wall ports and directional belts with atomic placement/refunds.
- **Automatic industry:** machines consume physical input and fuel, run batches automatically, block on capacity, and continue independent of roof presentation.
- **Discovery boundary:** authored reactions can be hidden; results become player knowledge only after a real process occurs.
- **Economic loop proof:** one local chain creates construction material; one discovered chain exports for fuel; assistance debt is repaid before new fuel is credited.
- **Persistence:** save schema 2 restores topology, cargo, active batches, knowledge and fractional simulation time without replaying hidden truth.
- **Development tooling boundary:** the minimal Studio proof is excluded from the player production export.

## Verification recorded for the accepted head

The implementation was exercised through the UI and domain checks before documentation cleanup:

- `npm test` — 35 tests passed across content, simulation, session and interaction helpers before the final renderer-only drag-gesture adjustment;
- `npm run typecheck` — passed on the final gameplay code;
- `npm run lint` — passed on the final gameplay code;
- `npm run build` — successful final static player export with Studio leakage check;
- browser smoke — real mouse construction of both lines, discovery, export, local expansion, roof reveal, save/reload, terminal policy changes, the drag-gesture regression path and responsive resize; browser error log remained empty.

No remote CI workflow is configured on this branch; the recorded gate is local/domain + browser evidence.

See [BROWSER_SMOKE.md](BROWSER_SMOKE.md) for the observed browser path.

## What is intentionally *not* locked by this slice

The following are proof-fixture choices, not final design commitments:

- the 80×60 map and exact deposit layout;
- current material names, values and balance;
- one-slot belt cells and current turn placement UX;
- current procedural/temporary art;
- automatic export policy details;
- `localStorage` as final persistence;
- the current global `site stock` convenience;
- the explicit machine-buffer `discard` escape hatch.

The last two are particularly important: they predate the accepted material-conservation direction. They must not be expanded into the long-term economy.

## Forward contract after acceptance

> **Nothing disappears. Everything produced exists somewhere until it is transformed, consumed by a defined process, stored, or exported off-map.**

That means physical storage, tracked terminal buffers, conserved machine/belt cargo, meaningful waste/dead stock, and a material ledger. Market changes should be handled by suspending/resuming persistent factories and rerouting logistics, not by deleting factories or inventory.

See [ECONOMY.md](ECONOMY.md) and [SIMULATION.md](SIMULATION.md).

## Run

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
```
