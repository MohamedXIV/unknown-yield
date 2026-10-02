# Phase 7 step-tail profiling and reference budget

Active milestone: [#92](https://github.com/MohamedXIV/unknown-yield/issues/92). Approved 2026-10-02: 32 factories as the reference target; 8 as comparison; i7-7700HQ reference hardware; directly measured p95 combined step + snapshot <=10ms. This is a Node simulation/snapshot budget, not browser frame or representative-device certification.

## Measurement contract

Reuse #90 normal-command single-world construction, flowing/backpressured content variants and physical conservation rules. No shipping content, simulation algorithm or persisted state changes.

Run from the repository root:

- npm run profile:world — CPU sampling disabled; 3 samples of 300 updates per case, after the same 300-tick warmup and restored-sample warmup as #90. This run evaluates the budget.
- npm run profile:world -- --cpu — separate CPU sampling run; 1 sample of 300 updates per case, same warmup and interval. These timings cannot evaluate the budget. CPU artifacts are local under artifacts/phase7-profiling; summaries omit absolute source paths.

Each measured interval calls step(100ms) then snapshot once. Three timestamps measure step, snapshot and their joint duration directly. Transport classification follows the authoritative tick and authored transportEveryTicks; there is no extra snapshot/serialize inside timing. Report all updates, transport and non-transport updates separately.

A PerformanceObserver records observed GC event intervals, delivered between synchronous samples. Report events overlapping measured intervals, event kind, total event duration, and update distributions with/without observed overlap. Event duration may extend outside an update; overlapping total duration is not exclusive time inside updates. Absence of an observed overlap is not proof that allocation or GC had no cost. Recording the harness windows can itself create allocation/GC overhead.

CPU sampling uses the current benchmark worker's V8 inspector with a 1ms requested sample interval, started after warmup and stopped before ledger auditing. Self-time uses time-delta-weighted leaf samples; inclusive time includes descendants and cannot be summed across ancestors. Reports are statistical attribution, not exact phase timers. Short inspector start/stop plumbing may appear in sampled frames. Preserve raw cpuprofiles locally; commit portable summaries with source basenames and line numbers.

## Correctness and acceptance

- Paired percentile and GC-overlap analysis have deterministic tests, including a case where sum of individual p95 differs from the actual joint p95.
- CPU weighting and inclusive/self distinction have a deterministic test; portable summaries must not contain absolute local paths.
- Each sample reconciles its material ledger outside timing. Existing single-world cases compare uninterrupted and restored continuation and physical destinations.
- Timing and CPU runs are sequential to avoid competing profiler workloads.
- Record exact source SHA, runtime, CPU/memory, samples, commands, budget results, CPU attribution and limitations.
- Run focused checks, then one full regression/typecheck/lint/build gate.
- #92 may close when it truthfully reports a failed budget. Phase 7 cannot close merely because a measurement milestone completes; optimization requires a separate evidence-backed design.

## Guardrails

No optimization, traffic framework, worker/aggregate execution, packed-data rewrite, Rust/WASM or browser instrumentation is part of this issue. Do not infer a bottleneck solely from a high latency percentile or GC correlation. Browser/render/UI costs and representative hardware remain separate gates.
