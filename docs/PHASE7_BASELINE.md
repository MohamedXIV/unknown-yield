# Phase 7 single-world baseline

Active milestone: [#90](https://github.com/MohamedXIV/unknown-yield/issues/90). User-approved scope: measure one world at increasing factory/entity scales before selecting optimization. This is a baseline, not a target-hardware performance certification.

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
