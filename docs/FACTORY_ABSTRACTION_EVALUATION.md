# Phase 3 Factory Abstraction Evaluation

Issue: #49 — evaluate aggregate factory execution with equivalence and performance evidence.

## Purpose

This evaluation answers one question:

> Does Unknown Yield currently have measured evidence that justifies a second, aggregate factory execution path?

A stable external contract is **not** permission to replace detailed simulation. Detailed simulation remains authoritative unless an alternate executor proves behavioral equivalence, conservation, deterministic save/load, and a useful measured performance benefit.

## Representative scenario

The harness builds the same kind of line used in Phase 3 browser acceptance:

```text
Veined ore deposit
  → Extractor
  → input wall port
  → Crusher inside a 10×10 factory
  → output wall port
  → terminal
  → Conductive granules Auto-export
```

The factory must earn a Stable throughput contract from real wall-port flow before the evaluation seed is captured.

## What the automated gate proves

`packages/sim-core/test/factory-aggregate-evaluation.test.ts` verifies:

1. the representative detailed factory reaches a certified contract;
2. the material ledger reconciles;
3. two simulations loaded from the exact same seed remain byte-equivalent after the same interval;
4. throughput certification is transient across Load and must be earned again;
5. re-certification returns the same external contract;
6. the same detailed seed can be timed repeatedly at 1, 8 and 32 factory-equivalent loads;
7. every timed copy remains deterministic and conservation-safe.

The multi-copy measurement is a **CPU envelope**, not a claim that 32 independent `Simulation` instances are identical to one future 32-factory world. It intentionally includes per-world overhead, so treat it as conservative context rather than a production capacity promise.

## Run

From the repository root:

```bash
npm run evaluate:factory
```

The test prints one machine-readable line:

```text
FACTORY_ABSTRACTION_EVALUATION { ...json... }
```

Record:

- Node version;
- platform/architecture;
- median wall time for 1 / 8 / 32 copies;
- aggregate simulated-to-wall ratio for each load;
- focused/full test results;
- typecheck/lint/build results.

Do not compare timing numbers from materially different hardware as if they were the same benchmark run.

## Decision rule

### NO-GO for aggregate execution

Record a no-go and keep detailed simulation when the measured baseline does **not** demonstrate an important performance problem on the target development hardware / intended near-term scale.

This is the default outcome when there is no profiler-backed bottleneck. It avoids introducing:

- a parallel source of gameplay truth;
- synchronization between detailed and aggregate state;
- additional save compatibility surface;
- hidden divergence in fuel/material/time behavior;
- roof-state coupling to simulation accuracy.

A no-go is a successful #49 result. It means the optimization has not earned its complexity yet.

### GO to a prototype

Only prototype aggregate execution when the detailed benchmark demonstrates a concrete budget problem worth solving.

The prototype must then run from the **same saved seed** and the **same simulated interval** as detailed execution and must prove all of the following before it can enter runtime code:

- exact external material behavior;
- exact fuel/time behavior;
- material-ledger conservation;
- deterministic Save/Load continuation;
- no dependence on roof/open presentation state;
- a useful measured wall-clock improvement over detailed execution.

If any equivalence gate fails, the prototype is rejected even if it is faster.

## Current decision

**NO-GO — keep detailed simulation only.**

Measured locally on exact code head `0ebf2d6acb2d8dfa292cd689a9597fe8afe6a44f`:

- Node `v24.20.0`
- Windows x64
- 300,000 ms simulated per copy
- 3 samples per load
- 1 copy: median 466.865 ms wall time, 642.58× simulated/wall ratio
- 8 copies: median 3026.907 ms wall time, 792.89× aggregate simulated/wall ratio
- 32 copies: median 11996.091 ms wall time, 800.26× aggregate simulated/wall ratio

The same exact head also passed:
- focused factory abstraction evaluation test;
- full suite: 21 files / 138 tests;
- typecheck;
- lint;
- build/static export;
- dedicated benchmark run.

The benchmark harness also verified deterministic continuation, identical Save/Load re-certification, and material-ledger conservation.

These numbers do not demonstrate an important near-term performance problem that justifies a second aggregate execution truth. The multi-copy benchmark is a conservative CPU envelope rather than a direct model of one 32-factory world, but even that envelope does not provide evidence that abstraction complexity is currently earned.

Therefore:
- no aggregate executor is added;
- detailed simulation remains authoritative whether a roof is open or closed;
- future abstraction work requires new profiling evidence from a larger real-world scenario;
- Rust/WASM/ECS remain out of scope.

## Scope guardrails

This evaluation does not authorize:

- Rust/WASM;
- ECS migration;
- a global simulation rewrite;
- roof-driven simulation switching;
- recipe-capacity guesses;
- persisted throughput certificates;
- blueprint library/editor work.

Those require separate evidence and scope.
