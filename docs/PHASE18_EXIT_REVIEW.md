# Phase 18 — Integrated desktop/mobile interaction exit (#238)

Parent epic: [#232](https://github.com/MohamedXIV/unknown-yield/issues/232).
**Status: COMPLETE — automated production-browser technical exit accepted.**

Exact-head gate: [CI #206](https://github.com/MohamedXIV/unknown-yield/actions/runs/37712884560) on `c32ea23b269d7cd9f62d5644cd57415776e6d16d`; PR #244 merged to main at `a4ab5a8cb70e63134f8398807facca20d8ff421e`.

The same evidence is recorded on [exit issue #238](https://github.com/MohamedXIV/unknown-yield/issues/238).

## Delivered interaction slices

| Child | Change | Main delivery |
| --- | --- | --- |
| #233 | Deterministic, bounded camera navigation controller, focus-preserving smooth zoom and Home/instant modes | PR #239 / `ff678e97f6cc0416218666d7b580c045f0f8fef2` |
| #234 + #235 | Discoverable Camera/Controls/Accessibility settings v2, v1 migration, live Phaser bridge and desktop pan/zoom | PR #240 / `717e4b1a785bbe95a7c37324010abb3274a9ed95` |
| #236 | One-finger tap/build and Inspect pan, two-finger anchored pinch+pan, cancellation, scoped touch-action, accessible zoom buttons | PR #241 / `06abf715d145eaae439fd4f771946a87af1885e8` |
| #237 | Selective UI transitions, System/On/Off motion override, no delayed unmount | PR #243 / `45f29061209acb14673dd7cb7050c8ed54024a49` |
| #238 | Integrated production-export proof, runtime exception recording, desktop/mobile environment and screenshot digest | PR #244 / `a4ab5a8cb70e63134f8398807facca20d8ff421e` |

No child changes sim-core, authored hidden knowledge, content discovery, factories,
world IDs or expedition save schema. Camera state remains presentation only.
Game Configuration is local preference storage, not a world save migration.

## Production browser acceptance

The existing `apps/web/test/phase10-browser-acceptance.test.ts` is exercised
**once**, against the built `apps/web/out` static export. The test requires
`X-Unknown-Yield-Export: static` and preserves Phase 10–17 factory, relocation,
knowledge, build-group, keyboard, persistence and other gameplay regression
assertions.

The Phase 18 extensions cover:

- world-bound camera Home, panning, zoom anchored on cursor, and deterministic
  interpolation tests, including reduced/instant motion and large frame deltas;
- Game Configuration discovery, bounded settings, v1 to v2 migration, save
  independence, change/reset/reload and live application;
- mobile emulation at 390×844 CSS pixels with device pixel ratio 2; single
  finger Inspect pan, double-contact midpoint pan/pinch, and no accidental
  placement/stock consumption when a second finger cancels a build;
- accessible Zoom In/Out and Reset buttons, native mobile tap of Expedition
  menu, and normal menu touch behavior (no global touch-action suppression);
- UI panel and grouped control regression, the OS reduced-motion media query
  and explicit user On/Off override, immediate panel close;
- browser runtime JS exception monitoring, screen capture success/PNG byte
  count and SHA-256, desktop/mobile UA and viewport identity, and opt-in
  `?perf=1` subsystem/frame/resource report at the end of the scenario.

The screenshot is captured in the headless browser but is **not retained as a
downloadable artifact**; the Actions log records its byte count and digest.
This proves capture occurred, not subjective visual quality. No human or
physical GPU observations are inferred from the screenshot or the VM.

## Independent accepted gates

- Camera P0 CI **#190**, exact head `85694d488c6cbf0101425a40a02892c0ee441eb4`: PASS.
- Configuration + desktop CI **#198**, exact head
  `a9d087abdebed0096d9b969db854c0d5e9e4685a`: PASS.
- Mobile #236 CI **#203**, exact head
  `d2a5ee5408d9af42dc8528dfd4f6b8586f61838f`: PASS,
  **557 tests passed / 3 skipped**, static export verified,
  1 production browser scenario PASS in 56.849 seconds.
- UI motion #237 CI **#204**, exact head
  `165ef6bad532a5b4473ae27999b91b0dd7154375`: PASS,
  including production-browser reduced-motion assertions.
- Integrated exit **#238 CI #206** / run `37712884560`, exact head
  `c32ea23b269d7cd9f62d5644cd57415776e6d16d`: **PASS**.
  `npm ci`, **114 deterministic test files PASS / 1 skipped;
  557 tests PASS / 3 skipped**, typecheck PASS, lint PASS,
  build/static-export verification PASS, and **1/1 production-browser
  acceptance PASS** (~63.5 s). The run covered touch long-press as well
  as the established desktop, mobile, build and configuration regressions.

## Measured integrated headless-browser evidence — CI #206

The production-export browser emitted
`PHASE18_INTEGRATED_BROWSER_EVIDENCE` at 2026-10-08T01:29:25Z.
It reported:

- Desktop emulation: HeadlessChrome 154 on Linux, viewport
  **1440 × 857**, DPR **1**.
- Mobile emulation: HeadlessChrome 154 on Linux, viewport
  **390 × 844**, DPR **2**. This is browser emulation, not a physical
  Android handset.
- PNG screenshot captured: **269,102 bytes**, SHA-256
  `94527ad6438f0347db29ec6b9f573f5840ee3a975de45925fd2cfbbba96c3e6a`.
  PNG bytes were **not retained**, so the hash proves that the capture
  completed, not the visual quality of the pixels.
- Uncaught JavaScript runtime exceptions: **0**.

End-of-scenario opt-in browser metrics (mobile-emulated VM, not a
comparable repeated benchmark; durations in milliseconds):

| Subsystem | Samples | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Frame interval | 159 | 16.6667 | 28.34 | 48.34 |
| Simulation step | 53 | 0 | 0.1 | 0.3 |
| Snapshot | 107 | 0.4 | 0.6 | 1 |
| World sync | 53 | 0 | 0.1 | 0.2 |
| Dynamic world draw | 159 | 0 | 0.1 | 0.9 |
| React render-to-commit | 56 | 0.7 | 1.6 | 3.1 |

Phase 16 art resources: **11**, **6,787 encoded bytes**, **10,087
transfer bytes**, load duration median **6.8 ms**, p95 **9.8 ms**, max
**9.8 ms**. Browser-reported concurrency: **4**, reported device memory:
**16 GiB**.

No conclusion about physical-device frame pacing, GPU acceleration,
scalability, or representative sustained FPS follows from this short
emulated end-of-scenario sample. This browser run tested correctness and
attribution, not a pre-agreed browser FPS threshold. Its p95 frame
interval is not directly comparable with Phase 16's different
software-rendered VM scenario.

## Performance interpretation

The browser report exposes `simulation-step`, `snapshot`,
`world-sync`, `world-dynamic-draw`, `ui-render-commit` and
`frame-interval` independently, with Phase 16 art-resource timing. These
are **diagnostic observations, not new numeric acceptance budgets**.
Phase 16's Chromium software-WebGL VM had 81.66–89.99ms p95 frame
interval across its production scenarios while isolated JavaScript p95 costs
were at or below 2.3ms (see
[Phase 16 attribution](PHASE16_BROWSER_PERFORMANCE.md)). That historical
software-renderer run is not a target FPS or a physical GPU baseline, and a
changed runner/device/scenario is not a controlled performance comparison.

The prior Phase 7 32-factory Node simulation/snapshot <=10ms combined p95
scale goal remains deferred and unmet; Phase 18 does not retroactively
declare it PASS or reopen speculative optimizations without playable
browser evidence.

## Decision and deferrals

**Phase 18 automated/technical exit criteria have been met.**
All #233–#237 are merged, and #238 passed the integrated exact-head
unit/typecheck/lint/build/static-export/production-browser suite with
zero uncaught runtime exceptions. The acceptance evidence and limits above
remain explicit; closing the issue does not certify physical-device
performance or a future visual restyling phase.

**Deferred human review:** physical Android device pan/pinch feel, actual GPU
frame pacing, subjective animation/visual taste, and broader appearance
restyling. This is deferred feedback for the user's consolidated playable
review, **not** an automated PASS, and must not block unrelated online
correctness work.
