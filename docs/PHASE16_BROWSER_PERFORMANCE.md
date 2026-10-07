# Phase 16 — Browser and representative-device performance acceptance (#159)

Parent epic: #107.

## Status

The browser measurement boundary is merged on `main`, and the Phase 16 **online engineering gate is accepted** from a production-export Codex VM capture at `c0dacf95ad5f220a9e8e08a5cfee9564c48638d8`.

The capture used Chromium 151 headless with software WebGL and a four-core CPU quota, so it does **not** establish physical-device/GPU performance. Project execution now treats representative physical-device validation as deferred, non-blocking release evidence rather than a Phase 16 dependency.

The existing Phase 7 `<=10ms` p95 budget applies only to its approved Node simulation + snapshot workload. It is not silently reused as a browser frame budget.

## Measurement boundary

Browser diagnostics are opt-in with `?perf=1`; ordinary play does not collect samples or expose a diagnostics panel.

The report keeps these costs separate:

- `simulation-step` — authoritative `Simulation.step` CPU time from the real browser session;
- `snapshot` — player-facing simulation snapshot/projection CPU time;
- `world-sync` — Phaser bridge work after a new snapshot, including feedback derivation, structure-key comparison and coarse refresh;
- `world-dynamic-draw` — JavaScript time spent updating Phaser's dynamic world presentation for a frame, including build-preview work when active;
- `ui-render-commit` — approximate React game-UI render-to-layout-commit duration;
- `frame-interval` — Phaser's observed frame delta, used as the end-to-end pacing signal rather than pretending CPU sub-timers equal FPS;
- Phase 16 art resource timings — count, encoded/transfer bytes and load-duration percentiles for `/art/phase16/`.

The report also records browser user agent, logical concurrency, coarse device-memory information when exposed, viewport and device-pixel ratio.

These metrics intentionally do not claim GPU time. `world-dynamic-draw` measures JavaScript presentation work; `frame-interval` is the truthful browser-level pacing signal that also reflects work outside that sub-timer.

## Capture protocol

Use the production export, not a development build:

1. `npm run build`.
2. Serve `apps/web/out` locally with a static HTTP server.
3. Open the game with `?perf=1` on the representative browser/device.
4. Reach or load through the normal UI a player-created production-slice site at representative scale. Do not inject simulation/save truth through DevTools.
5. Let the world settle, then run `window.__UNKNOWN_YIELD_PERF__.reset()` in DevTools.
6. Play normally for a fixed capture window, including active production, logistics motion and ordinary UI inspection. Capture a second window with a representative factory open for diagnosis so the expensive presentation state is not hidden.
7. Run `window.__UNKNOWN_YIELD_PERF__.report()` and preserve the complete returned object with exact code head, browser/device identity and scenario notes.
8. Repeat enough times to distinguish a stable result from one-off startup/JIT/GC noise.

Resource timings are intentionally retained across metric resets so the report still describes the production art payload loaded by that page.

## Accepted VM evidence

Three 18-second production-export captures were recorded at exact head `c0dacf95ad5f220a9e8e08a5cfee9564c48638d8`, which was independently verified as live `main` through the GitHub connector before acceptance.

| View | Frame interval p95 | Simulation step p95 | Snapshot p95 | World sync p95 | Dynamic draw p95 | UI commit p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Production running | 81.66 ms | 0.6 ms | 0.6 ms | 0.5 ms | 0.1 ms | 1.1 ms |
| Factory roof open | 86.66 ms | 0.7 ms | 0.6 ms | 0.5 ms | 0.1 ms | 1.3 ms |
| Terminal panel open | 89.99 ms | 0.6 ms | 0.6 ms | 0.5 ms | 0.1 ms | 2.3 ms |

The run loaded 11 Phase 16 art resources: 6,787 encoded bytes / 10,087 transfer bytes, 13 ms median load duration and 20.7 ms p95. No JavaScript runtime exception was captured. Chromium logged software-rendering/GPU-stall warnings and a missing local `/favicon.ico`.

The production slice was assembled through normal game UI as two extractor/factory/crusher lines with cargo visible on both belt paths. Factory inspection reported one waiting machine.

The 81.66–89.99 ms frame-interval p95 is **not** accepted as a physical-device result: this headless VM used software WebGL with GPU acceleration disabled. The important attribution result is that all measured JavaScript subsystem p95 values remained at or below 2.3 ms. This evidence does not justify reopening deferred Phase 7 optimization.

The durable measured summary is [`docs/evidence/phase16-159-vm-summary.json`](evidence/phase16-159-vm-summary.json). The capture session also reported raw VM artifacts under `/workspace/unknown-yield/artifacts/phase16-159/`; those VM-local files were not available to this repository update.

## Acceptance rule

For Phase 16, a reproducible production-export cloud-browser capture is sufficient for the **online engineering gate** when it preserves exact-head provenance, representative production-slice interaction, subsystem attribution, asset timings and runtime errors. It must not be relabeled as physical-device/GPU validation.

Representative physical-device validation is deferred, non-blocking release evidence. No browser frame budget has been invented after the fact.

If future evidence shows a real measured budget failure, profile the failing category before changing architecture. Rust/WASM, workers, aggregate simulation, render rewrites or new caching frameworks remain evidence-gated.

## Repository verification

The diagnostics themselves remain covered by deterministic unit tests, typecheck, lint and production build. Those checks prove the instrumentation is safe to ship; the accepted VM capture adds browser attribution evidence, while physical-device/GPU validation remains explicitly deferred.
