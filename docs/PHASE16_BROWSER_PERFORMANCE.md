# Phase 16 — Browser and representative-device performance acceptance (#159)

Parent epic: #107.

## Status

The browser measurement boundary is implemented on the canonical #159 branch. **Representative-device acceptance is not yet a PASS.**

The existing Phase 7 `<=10ms` p95 budget applies to the approved Node simulation + snapshot workload only. It is not silently reused as a browser frame budget. #159 must record the production slice on the agreed representative device before closing.

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

## Acceptance rule

Do not convert a GitHub-hosted runner, Node benchmark, development build or cloud browser into “representative-device PASS”.

Before #159 closes, the evidence must state:

- exact Git commit tested;
- production build;
- representative device/browser;
- production-slice world/scenario;
- capture duration/repetitions;
- separate subsystem summaries plus frame pacing and asset timings;
- any agreed browser/device budgets and the result against them;
- visible/runtime errors honestly;
- whether measured evidence justifies reopening deferred Phase 7 optimization.

If a budget fails, profile the measured category before changing architecture. Rust/WASM, workers, aggregate simulation, render rewrites or new caching frameworks remain evidence-gated.

## Repository verification

The diagnostics themselves remain covered by deterministic unit tests, typecheck, lint and production build. Those checks prove the instrumentation is safe to ship; they do **not** replace representative-device measurement.
