# Phase 7 step-tail profiling and reference budget

Completed profiling milestone: [#92](https://github.com/MohamedXIV/unknown-yield/issues/92). Approved 2026-10-02: 32 factories as the reference target; 8 as comparison; i7-7700HQ reference hardware; directly measured p95 combined step + snapshot <=10ms. This is a Node simulation/snapshot budget, not browser frame or representative-device certification.

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

## Accepted measurements (2026-10-02)

Source SHA: b7f7f2b7fbf324c0b38a19aebea316e397a3cc75. [PR #93](https://github.com/MohamedXIV/unknown-yield/pull/93). Hardware: Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz, 8 logical CPUs, 31.89 GiB RAM, v24.20.0 / win32 x64. Shipping runtime/content is unchanged from parent main aae7b18851ad64098a42c5a33f4065e40f8a0d37.

Unprofiled latency run: npm run profile:world — PASS (1 selected test, exit 0). 900 paired observations per case; 300 transport and 600 non-transport. This asserts ledger correctness and reports the budget honestly; the timing assertions do not require that an optimization not yet implemented meets the budget.

| Factories | Case | Joint median / p95 (ms) | Transport p95 | Non-transport p95 | Without observed GC p95 | 10ms budget |
|---:|---|---:|---:|---:|---:|---|
| 8 | flowing | 3.3087 / 9.4856 | 10.0681 | 8.7343 | 9.4795 | PASS |
| 8 | backpressured | 2.2656 / 8.5825 | 8.831 | 8.3883 | 8.5182 | PASS |
| 32 | flowing | 15.4836 / 83.3948 | 85.2135 | 82.7563 | 77.2435 | FAIL |
| 32 | backpressured | 11.6148 / 85.3139 | 85.6278 | 82.2078 | 73.8114 | FAIL |

**Reference 32-factory budget FAILS in both cases.** The 8-factory comparison passes the joint budget in this run; its flowing transport subgroup p95 is 10.0681ms, so it has little headroom and is not a browser certification. Budget remains <=10ms; it was not changed to fit the result.

Observed overlapping GC events: flowing-32 198 events (195 minor, 3 major), 166.05ms total full-event duration; backpressured-32 99 events (96 minor, 3 major), 93.77ms. High tails persist in the groups without observed overlap. This argues against observed GC pause duration alone explaining the tail; it does not rule out allocation, instrumentation or unobserved costs.

CPU run: npm run profile:world -- --cpu — PASS (1 selected test, exit 0), separately and sequentially after timing. One sample/300 updates per case. Do not evaluate the budget from its latencies.

| Factories | Case | observe inclusive % | connectedRuntime inclusive % | transport inclusive % | factory-throughput module self % |
|---:|---|---:|---:|---:|---:|
| 8 | flowing | 47.896 | 31.99 | 4.388 | 38.725 |
| 8 | backpressured | 35.685 | 18.025 | 7.581 | 31.198 |
| 32 | flowing | 78.718 | 55.315 | 5.441 | 65.222 |
| 32 | backpressured | 65.464 | 41.209 | 7.527 | 54.692 |

### Attribution and next candidate

The sampled window identifies factory throughput observation as the dominant measured step cost, not transport alone. At flowing-32, connectedRuntime has 36.563% self / 55.315% inclusive time; observe is 78.718% inclusive. Snapshot is 13.254% inclusive; structuredClone is 11.662% self. At backpressured-32, observe remains 65.464% inclusive and transport is 7.527%.

Source inspection confirms connectedRuntime builds incoming-belt adjacency and machine/storage socket-owner indexes by scanning the whole world on each factory call. It is called while constructing factory state signatures during observation. Repeated whole-world topology work therefore has an evidence-backed optimization candidate. These profiles attribute the whole sampled interval, not each individual p95 update; removing this work is not yet proven to satisfy 10ms.

Propose a separate scoped change to share topology indexing across factory observations while preserving every dynamic cargo, T fairness, crossing scheduling, connected buffer/backlog and terminal fingerprint. Dynamic recurrence must still be checked at authoritative simulation frequency. Do not remove outside-connected state, skip certification checks, persist certificates or substitute aggregate execution. Compare before/after on the same workload/hardware and exact commits; the approved budget remains fixed. The first proposed safe implementation builds adjacency/socket-owner indexes once per observe call, queries each factory against that shared read-only index, and rebuilds on the next observation. Start without a cross-tick cache or new invalidation subsystem. Per-factory traversal and dynamic state fingerprints remain detailed. This recommendation is not an implemented optimization.

### Artifacts and limits

[Portable timing/GC result](evidence/phase7-profile-timing.json); [portable CPU summaries and raw hashes](evidence/phase7-profile-cpu.json). Four raw cpuprofiles are preserved locally under artifacts/phase7-profiling/b7f7f2b7fbf324c0b38a19aebea316e397a3cc75/. They include local source URLs and are intentionally not committed; committed summaries contain basenames only. Profile frame line numbers belong to the Vite-transformed worker source, not verified original TypeScript positions.

The benchmark is a synthetic expanded, phase-synchronized world on shared development hardware. Initial construction, warmup, loads, audit and assertions are outside timing/CPU sample loops. GC window recording still allocates harness objects, and CPU windows include inspector plumbing: 8-factory profiles show 10–16% self time in inspector post, versus much smaller relative overhead at 32. Inclusive percentages overlap across ancestors and cannot be added. Sampling and host/JIT/GC variance preclude an exact causal claim for every spike.

No browser FPS, rendering cost, target-device matrix, optimization benefit or Phase 7 completion is claimed.

## Final verification

Verified source b7f7f2b7fbf324c0b38a19aebea316e397a3cc75; all commands exit 0:

- Focused analysis: 1 file / 2 tests PASS.
- npm run profile:world: selected profiling test PASS, 7 unrelated/opt-in cases skipped; material audits PASS; 32-factory latency budget FAIL as recorded.
- npm run profile:world -- --cpu: selected profiling test PASS, 7 unrelated/opt-in cases skipped; material audits PASS.
- npm test -- --maxWorkers=4: 37 files / 249 tests PASS, 2 opt-in timing/profiling tests skipped in the ordinary suite.
- npm run typecheck, npm run lint, npm run build, static-export verification and git diff --check: PASS.

Final evidence/status commit changes docs/JSON only. Runtime packages, app code, test harness, scripts and package.json match checked source. #92 completes measurement and attribution; the approved performance target and Phase 7 exit gate remain unmet.
