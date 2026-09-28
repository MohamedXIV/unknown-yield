# Phase 3 Exit Review — Factory as Function

Issue: #50  
Parent epic: #10

Phase 3 closes the factory-as-function proof without introducing a second simulation truth.

## Final contract

A solved factory can now be treated as a readable external function **for presentation and tooling** while the detailed TypeScript simulation remains authoritative.

The accepted contract is:

- factory identity, footprint and wall-port roles are derived read-only views;
- stable throughput is certified only from repeated real boundary flow;
- throughput certificates are transient and are not persisted in saves;
- a deterministic runtime-free blueprint can be serialized from detailed topology;
- closing a roof shows the certified external contract without changing simulation;
- reopening restores the same detailed machines, belts, buffers and statuses for diagnosis;
- Save/Load restores detailed gameplay truth, resets throughput to Measuring, and requires the same contract to be earned again;
- aggregate execution is **not** implemented because measured evidence in #49 did not justify a parallel executor.

## Child evidence

### #45 — read-only external contract

PR #52 merged as `59db8f8a3ee0b37b925570c4163facef95ecd12b`.

The first contract exposed only facts already present in the detailed world:
- stable factory identity/footprint;
- input/output wall-port roles from geometry;
- internal machine status counts.

It did not infer recipes, hidden outcomes, throughput or aggregate state.

### #46 — stable throughput certification

PR #54 merged as `a0a140eb336a6fea488d8f59c9768bbcce460cb5`.

Throughput comes from successful cargo moves crossing factory wall ports. Stable rates are earned from repeated detailed state/flow cycles, never from recipe tables or nominal machine capacity.

Browser acceptance proved real boundary-flow certification and invalidation/re-certification behavior.

During #48 acceptance, a backlog-dependent false short cycle was discovered. #46 was deliberately reopened rather than hiding the discrepancy.

Regression PR #57 merged as `dbe982aa8cbc74ba4b21b3825a0daf852939e142`.

The fix made certification include only the connected logistics runtime phase relevant to the factory boundary, preventing feeder/drain backlog from masquerading as steady internal operation.

Exact-head local verification for #57:
- focused throughput: 1 file / 4 tests PASS;
- full suite: 19 files / 133 tests PASS;
- typecheck PASS;
- lint PASS;
- build/static export PASS.

### #47 — deterministic blueprint serialization

PR #55 merged as `2d5e94b0b36da44433e3afbec4e084eb3bb97c71`.

A blueprint records relative validated topology only:
- factory dimensions;
- wall ports;
- internal processor definitions/operations;
- internal belts and diverter topology.

It deliberately excludes runtime buffers, jobs, incidents, cargo, fuel, knowledge and instance IDs.

Exact-head local verification:
- focused blueprint: 1 file / 3 tests PASS;
- full suite: 19 files / 132 tests PASS;
- typecheck PASS;
- lint PASS;
- build PASS.

### #48 — closed contract presentation and reopen diagnosis

PR #56 merged as `876c887ea67c6ba3e9acc93b6157ceb1b171b55b`.

The closed-world building itself displays:
- `CERTIFIED CONTRACT`;
- measured input/output material names;
- measured units/min.

Uncertified factories display no stale rates and explicitly direct the player to reopen for diagnosis.

Roof state remains presentation-only and outside the authoritative Save/simulation.

Final combined code gate on the merged #46-regression base:
- focused throughput + factory-presentation + interaction: 3 files / 16 tests PASS;
- typecheck PASS;
- build/static export PASS;
- clean exact-head worktree.

Fresh-world browser acceptance on the same runtime:
- representative Veined ore → Crusher → terminal factory certified at 120 ticks, 30/min input → 15/min output;
- closed world label displayed the same contract;
- Save → Load returned `Site restored`;
- restored factory began Measuring with no stale rates;
- without gameplay commands, re-certification returned exactly the same 120-tick / 30 → 15 contract;
- roof remained closed and the building label showed the same re-certified contract;
- same factory, Crusher, two wall ports and empty diagnostic buffers were preserved;
- no visible page errors;
- JavaScript console remained unverified because the browser automation surface did not expose it.

Earlier #48 acceptance also proved:
- roof open/closed invariance while simulation continued;
- deliberate disable invalidated certification;
- closed blocked factory showed diagnosis state with no rates;
- reopen returned the same detailed machine and buffers;
- re-enable recovered the same detailed factory behavior.

### #49 — aggregate execution evidence decision

PR #58 merged as `4ac27406c81a78eb98b1ad715a7ebc05c86bc56b`.

The issue was intentionally evaluated before an aggregate executor was written.

Exact-head local gate:
- focused evaluation PASS;
- full suite: 21 files / 138 tests PASS;
- typecheck PASS;
- lint PASS;
- build/static export PASS;
- dedicated benchmark PASS;
- clean worktree.

Measured detailed baseline on Node v24.20.0 / Windows x64:
- 1 copy: 466.865 ms median wall time for 300,000 ms simulated;
- 8 copies: 3026.907 ms median for 2,400,000 ms aggregate simulated;
- 32 copies: 11996.091 ms median for 9,600,000 ms aggregate simulated;
- 32-copy envelope: about 800.26× aggregate simulated-time / wall-time.

Decision: **NO-GO for aggregate execution now.**

The detailed TypeScript path did not show a near-term performance failure large enough to justify a second authoritative executor and its synchronization/save/divergence risks.

## Phase 3 integrated regression gate

`apps/web/test/phase3-exit.test.ts` ties the Phase 3 layers together in one representative world:

1. build the known-good Veined ore → Crusher → terminal line;
2. earn a real Stable throughput contract;
3. feed the actual `FactoryView` into the closed-factory presenter;
4. verify roof toggling changes presentation state only;
5. serialize and validate a runtime-free deterministic blueprint;
6. Save and Load the authoritative detailed world;
7. verify throughput restarts as Measuring with no stale rates;
8. re-certify to the exact same contract from two restored simulations;
9. prove the same closed-world presentation returns;
10. prove the blueprint remains identical;
11. reconcile the material ledger.

The existing Phase 1.5 and Phase 2 exit tests remain part of the full suite, so the Phase 3 gate does not replace conservation/routing or discovery/hazard/knowledge regression coverage.

## Browser acceptance reuse

Issue #50 requires browser acceptance. The accepted #48 browser proof remains the Phase 3 browser gate because no production runtime behavior changed after it:

- #49 added only an evaluation test, command and documentation;
- #50 adds only regression coverage/documentation.

Therefore repeating the long browser construction flow would add ceremony without testing a changed runtime surface. If future commits modify runtime world/UI/save behavior before #50 merges, browser acceptance must be repeated.

## Phase 3 outcome

Phase 3 is complete when this exit-review PR passes its final exact-head automated gate and merges.

The resulting architecture is intentionally simpler than the initial hypothesis:

- **one detailed authoritative simulation;**
- **one derived readable external contract;**
- **one deterministic topology blueprint;**
- **closed/open presentation with zero authority;**
- **no aggregate runtime path until future profiling earns it.**

Phase 4 may begin only after #50 is closed.
