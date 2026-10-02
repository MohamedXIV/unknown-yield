# Phase 7 single-world baseline

Completed baseline milestone: [#90](https://github.com/MohamedXIV/unknown-yield/issues/90). User-approved scope: measure one world at increasing factory/entity scales before selecting optimization. This is a baseline, not a target-hardware performance certification.

## Workload contract

One Simulation contains 1, 8 or 32 repeated physical factory cells, each with ferrite extraction, crusher, internal directed T splitter/merger, and a shared crossing between processed plates and a distinct raw stream. East plates and south raw outputs enter separate physical depots. Builds use normal commands; no cargo/save injection supplies material.

Validated benchmark-only content expands map/deposits, start stock and fuel. Flowing cases give depots ample capacity; backpressured cases retain authored depot capacity. Machine recipes, tick timing, transport windows and scheduling are unchanged. The shipping fixture, world size and player economy are untouched. This synthetic regular layout is not a claim that players already build worlds this large.

## Measurements

Correctness runs in the normal suite. Explicit timing runs require SINGLE_WORLD_BENCHMARK=1 and are kept separate from ordinary test latency. Use the dedicated evaluate:world command.

- 300 ticks of initial warmup; each restored sample receives another 300 ticks outside timing because throughput monitors reset on load.
- 3 samples, each 300 updates, with step(100ms) and snapshot() measured separately.
- Report nearest-rank median/p95 from 900 observations per operation/case, actual entity/cargo counts, Node/runtime, CPU model/core count and memory.
- Construction, validation, loads, conservation audits and assertions are excluded from timed regions.
- No wall-time assertions or performance pass claim before budgets and representative hardware are agreed.
- Every scale/case must produce plates, retain separate material destinations, reconcile the ledger and resume deterministically after save/load.

## Scope and follow-up

Rendering, React/Phaser snapshot consumption, browser frame pacing, GC/allocation profiling and target-device runs require subsequent measurement. Node step/snapshot numbers cannot certify browser FPS. Idle or backpressured workloads must not be mislabeled as sustained production.

The earlier FACTORY_ABSTRACTION_EVALUATION is a multi-instance CPU envelope and its aggregate-execution NO-GO remains unchanged. No pooling, chunking, worker, aggregate executor, packed-data or Rust/WASM changes are part of #90. Use this baseline to propose budgets and select a measured profiling question before any optimization.

## Recorded baseline (2026-10-02)

Measured commit: 6b7c530ab4c0862f345de54a2a6671c9f12f2f2d, [PR #91](https://github.com/MohamedXIV/unknown-yield/pull/91). npm run evaluate:world: 1 file / 7 tests PASS, exit 0. Six correctness cases compare uninterrupted execution with restored continuation on every one of 30 further updates, with ledger reconciliation. Timings have no latency threshold assertions.

Hardware: Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz; 8 logical CPUs; 31.89 GiB RAM; v24.20.0 / win32 x64. Three samples produce 900 observations per operation/case; each update advances 100ms.

| Factories | Case | Step median / p95 (ms) | Snapshot median / p95 (ms) | Belts / junctions / machines |
|---:|---|---:|---:|---|
| 1 | flowing | 0.1294 / 0.3651 | 0.2538 / 0.5257 | 27 / 3 / 3 |
| 1 | backpressured | 0.0619 / 0.2983 | 0.2343 / 0.4797 | 27 / 3 / 3 |
| 8 | flowing | 1.6831 / 9.0598 | 1.7571 / 3.0794 | 216 / 24 / 24 |
| 8 | backpressured | 0.5675 / 4.6914 | 1.0939 / 2.1822 | 216 / 24 / 24 |
| 32 | flowing | 7.78 / 60.8002 | 3.8318 / 6.7843 | 864 / 96 / 96 |
| 32 | backpressured | 3.9457 / 56.786 | 3.8594 / 6.7448 | 864 / 96 / 96 |

[Machine-readable result](evidence/phase7-single-world-baseline.json) records all counts, occupied cargo and sampling parameters. Timed samples all start from the same warmed save and repeat the same interval; samples share a process. Measurements were taken on the shared development machine, not an isolated lab or representative device matrix.

Initial attempt printed preliminary results but failed harness timeouts (combined correctness >60s and timing >120s). Correctness now has separate cases, each with a 60s timeout; explicit timing has a 300s execution limit. These guard against a stuck harness, not enforce an unagreed performance budget. Only the subsequent exit-0 run above is accepted. Preliminary flowing-32 p95 step was 76.05ms versus 60.80ms on the accepted run; host/JIT/GC noise and synchronized layout phases must be considered before treating any small change as an improvement.

### Decision

Keep the current detailed simulation. This expanded single world establishes a profiling question: at 32 factories, step tail latency is substantially larger than its median and larger than snapshot latency. Profile step phases and allocations/GC at this exact workload before attributing the cost to transport, throughput monitoring or another subsystem. A high p95 is evidence to investigate, not proof of a specific bottleneck.

No browser FPS, renderer cost, UI notification cost, target-scale pass or Phase 7 completion is claimed. Agree budgets and representative hardware, profile the measured step tails and browser path, then propose a scoped optimization only if it earns its complexity. No follow-up implementation issue is preselected by this baseline.

## Final acceptance gate

On 6b7c530ab4c0862f345de54a2a6671c9f12f2f2d, all exit 0:

- npm run evaluate:world: 1 file / 7 tests PASS.
- npm test -- --maxWorkers=4: 36 files / 247 tests PASS, 1 opt-in timing test skipped (already run above).
- npm run typecheck, npm run lint, npm run build and static-export verification: PASS.
- git diff --check: PASS.

Final evidence/status commit changes docs/JSON only; apps, packages, scripts and package.json match the checked source. Shipping runtime/content is unchanged from the parent main. No new browser performance acceptance is claimed or required for this Node-only baseline; browser measurements are a follow-up gate.
