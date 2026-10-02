# Phase 7: shared observation topology (#94)

Approved scope: build incoming-belt adjacency and machine/storage socket-owner indexes at most once per synchronous FactoryThroughputMonitor.observe call. Share read-only maps between factories and discard them when the call returns. Rebuild on the next observation, including changes to manual routing, geometry and socket placement. Build lazily when a factory actually needs a signature.

Keep connected traversal and dynamic fingerprint construction per factory: cargo, jobs, buffers, storage, terminal staging, T cursor and all crossing state remain authoritative. Certification frequency/policy, content, save schema and public API are unchanged. No cross-tick cache or invalidation subsystem.

Compare against measured source b7f7f2b7fbf324c0b38a19aebea316e397a3cc75 using the unchanged profile:world harness on the same reference machine. The 32-factory joint step+snapshot p95 budget remains <=10ms; incremental improvement does not close Phase 7. Measured source: 6e9fa0fe40f14d26cbdd5982b2d6bb3418386331. The test harness, content and scenario are unchanged from the baseline.

## Measurement

Reference: Intel i7-7700HQ, 8 logical CPUs, 31.89 GiB, Node v24.20.0, win32 x64. Each timing case: 3 samples of 300 updates after 300-tick warmup. CPU sampling runs separately, 1 sample per case. Both commands exit 0; material audits pass. Latency is the measured joint step+snapshot duration, not the sum of separate percentiles.

| Factories | Case | Before median ms | After median ms | Before p95 ms | After p95 ms | 10ms p95 budget |
|---:|---|---:|---:|---:|---:|---|
| 8 | flowing | 3.3087 | 3.0065 | 9.4856 | 6.2214 | PASS |
| 8 | backpressured | 2.2656 | 2.0371 | 8.5825 | 4.4133 | PASS |
| 32 | flowing | 15.4836 | 15.924 | 83.3948 | 31.0466 | FAIL |
| 32 | backpressured | 11.6148 | 10.5364 | 85.3139 | 24.4467 | FAIL |

32-factory p95 falls by 62.77% flowing and 71.35% backpressured in this comparison. Flowing median increases 2.84%; this is not an across-the-board latency improvement. The fixed target remains unmet in both 32-factory cases. GC events fall from 198 to 48 flowing and 99 to 36 backpressured; after-change p95 without observed GC remains 30.6413 / 23.749ms. GC event durations are whole events, not exclusive time inside updates. Host/JIT/GC variation and one before/after comparison preclude attributing every tail change solely to the refactor.

## CPU attribution and remaining work

At flowing-32, old connectedRuntime included index building: 55.315% inclusive. After extraction, connectedRuntime is 8.585% inclusive and connectedTopology is 3.363% inclusive; observe falls from 78.718% to 52.49% inclusive. At backpressured-32, connectedRuntime falls from 41.209% to 4.884% inclusive and observe from 65.464% to 41.657%. Sample percentages are relative to each complete profile window and overlap across ancestors; they are not individual p95-update attribution.

Remaining sampled costs include topologySignature (24.783% / 17.236% inclusive at flowing/backpressured-32), stateSignature (22.851% / 11.283%) and snapshot (31.342% / 40.639%), with structuredClone self 27.909% / 35.716%. A possible next bounded candidate is reducing repeated whole-world filtering for topologySignature while preserving its complete topology identity and reset behavior. That requires a separate approved scope; no cross-tick cache, certification-frequency reduction, fingerprint omissions or snapshot redesign is included here.

[Portable timing result](evidence/phase7-topology-timing.json); [portable CPU result and raw hashes](evidence/phase7-topology-cpu.json). Raw profiles and summaries are preserved locally under artifacts/phase7-profiling/6e9fa0fe40f14d26cbdd5982b2d6bb3418386331/. Transformed profile line numbers are not verified original source positions. Node-only synthetic synchronized world: no browser FPS or rendering budget claim.

## Correctness and verification

The new regression changes external feeder routing between observations while two factories share the index, proves the unrelated factory remains independently certified, and verifies the reconnected feeder cargo affects recurrence immediately. Existing domain tests cover T cursor, crossing phase/countdown/pending state, physical conservation, blueprint/save behavior and uninterrupted-versus-restored multi-factory worlds. Index lifetime is one synchronous observe call; there is no persisted state or save/content/API migration.

Focused 5 files / 40 tests PASS (2 opt-in skipped), then throughput regression suite 9 tests PASS. Full gate at measured source: npm test -- --maxWorkers=4: 37 files / 250 tests PASS, 2 opt-in tests skipped; npm run typecheck, npm run lint, npm run build and static-export verification PASS. git diff --check PASS. A temporary stale cross-call index mutation makes the new routing test fail at tick 2 (false stable); restoring the exact measured source makes it pass. The mutation is not committed. Final evidence/status changes are docs/JSON only; runtime, tests and benchmark remain identical to measured source. #94 closes through PR #95 as a measured incremental improvement; Phase 7 remains open.
