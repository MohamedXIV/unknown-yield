# Phase 7: fresh factory membership (#96)

Approved scope: group machines once per synchronous observe call. Read internal belts through canonical integer cell keys within each factory rectangle and sort local membership once. Reuse these fresh members for topology signature, dynamic signature and status checks; recordMove builds fresh membership for its matched factory. No cache survives a call.

Preserve all existing signature fields and ordering, topology reset timing, detailed dynamic recurrence, connected external logistics and hidden/material boundaries. No change to content/save/public API, certification frequency, snapshots or transport. Membership uses the existing validated integer-grid/key invariant; factory maximum dimensions remain authored content.

Before: measured source 6e9fa0fe40f14d26cbdd5982b2d6bb3418386331 (#94). Same profile:world timing/CPU harness and i7-7700HQ / Node v24.20.0 reference machine. Fixed 32-factory joint p95 <=10ms target remains in force. Measured source: 5296eebd9dd9b1fec338d78e13092f599f46da2d. Fresh unchanged parent control: d830600d5f557219d8cb164e62da012b8340c9f9. Runtime/test harness unchanged after measurement.

## Timing comparison

Reference Intel i7-7700HQ, 8 logical CPUs, 31.89 GiB, Node v24.20.0, win32 x64. Unchanged scenario: 8/32 physical factories, flowing/backpressured; 3 samples of 300 updates after 300-tick warmups, 900 direct joint step+snapshot observations per case. CPU sampling is separate, 1 sample per case. Both modes and the fresh parent control exit 0 with conservation audits. Execution order: new-source timing, new-source CPU, then fresh unchanged parent timing in the same checkout; raw archives preserve source provenance. No concurrent test/build workload during measurement.

| Factories | Case | Recorded #94 p95 ms | Fresh parent p95 ms | New p95 ms | Fresh parent median ms | New median ms | 10ms p95 budget |
|---:|---|---:|---:|---:|---:|---:|---|
| 8 | flowing | 6.2214 | 7.3597 | 5.0023 | 3.3912 | 2.7578 | PASS |
| 8 | backpressured | 4.4133 | 6.1487 | 5.2663 | 2.8431 | 2.5717 | PASS |
| 32 | flowing | 31.0466 | 33.0945 | 24.5777 | 15.0731 | 12.2473 | FAIL |
| 32 | backpressured | 24.4467 | 27.9175 | 19.6748 | 12.5899 | 9.376 | FAIL |

Against fresh parent control, 32-factory p95 decreases 25.73% / 29.53% flowing/backpressured, with median improvement in both. Against recorded #94, 8-factory backpressure worsens from 4.4133 to 5.2663ms (median 2.0371 to 2.5717ms); fresh parent is slower than both at 6.1487ms p95 / 2.8431ms median. Preserve that regression rather than claiming a universal speedup. All cases improve against the fresh control, but independent runs on shared hardware do not eliminate thermal/host/JIT/GC variance. The 32-factory <=10ms budget remains FAIL in both cases; 8 comparison cases PASS. This accepts only a bounded evidence-backed improvement, not Phase 7 completion.

## CPU attribution and limits

At 32 factories, observe inclusive share falls from #94 52.49% to 40.51% flowing and 41.657% to 33.187% backpressured. Work has moved into factoryMembers, which still costs 17.642% / 16.753% inclusive. stateSignature is 14.77% / 6.64% inclusive; snapshot is 39.449% / 46.154%. Signature serialization and membership selection still cost time; nothing is free or skipped. Inclusive percentages overlap and are relative to each whole sampled interval, not the cause of a specific p95 spike. The portable ranked summary omits functions below its rank cutoff; absence does not mean zero cost. Profile line numbers refer to transformed worker code.

The benchmark is Node-only and phase synchronized. GC recording allocates harness objects; inspector plumbing affects CPU samples. These results do not certify browser FPS, rendering, representative-device budgets or a new snapshot policy. A next candidate needs a separate approved scope and must preserve save/player-hidden boundaries and snapshot ownership before changing cloning.

[New timing](evidence/phase7-membership-timing.json), [fresh parent timing control](evidence/phase7-membership-control-timing.json), [new CPU summaries and raw hashes](evidence/phase7-membership-cpu.json). New raw profiles and summaries are archived locally under artifacts/phase7-profiling/5296eebd9dd9b1fec338d78e13092f599f46da2d/; control under artifacts/phase7-profiling/d830600d5f557219d8cb164e62da012b8340c9f9-control/. Canonical keyed integer coordinates are validated in save.ts; current fixture factoryMax is 20. Selection enumerates factory area, so unusually large sparse future authored factories need new measurements before extrapolating benefit.

## Verification

Focused 5 files / 41 tests PASS, 2 opt-in tests skipped; throughput suite 17 tests PASS. New tests preserve fresh reset on internal placement/removal, both boundary-wall routes, machine membership, geometry and ports. Reordered records/ports and belts at the excluded right/bottom edges preserve topology identity. Existing tests retain external connected recurrence, T/crossing dynamics, multi-factory independence, conservation, blueprints and deterministic restored worlds. Deliberately excluding wall cells makes both wall-route tests fail (false stable); exact measured source is restored before the final gate. Full gate at measured source: npm test -- --maxWorkers=4: 37 files / 258 tests PASS, 2 opt-in tests skipped. npm run typecheck, npm run lint, npm run build and static-export verification PASS (exit 0). git diff --check PASS. The full suite passes after restoring the exact measured source from the deliberate wall-omission mutation. Final evidence/status commit modifies docs/JSON only; apps/packages/scripts/package.json match the measured source. #96 completes through PR #97 as a bounded improvement; Phase 7 remains open. No public API, content/save schema or persistent-cache change.
