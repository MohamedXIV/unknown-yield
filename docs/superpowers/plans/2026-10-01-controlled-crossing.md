# #83 controlled crossing implementation

Use the approved PHASE6_JUNCTIONS section 3 contract, in this checkout.

1. Add focused failing tests for two directed routes, full transport-step windows, pending clearance, and conservation.
2. Extend authored junction definitions and simulation state. At update start, an empty pending center opens the next full window; count that update at its end. Persist axis, remaining steps, pending axis and held route. Geometry edits on empty crossings preserve scheduling.
3. Bump save schema to 13, migrate 12 without changing T state; reject impossible crossing state atomically. Blueprint v2 already carries generic definition/branch topology; preserve v1 compatibility. Include complete crossing state in throughput fingerprints.
4. Present route-specific signals, pending clearance and held route on the map and inspector, with localized wording.
5. Run focused regressions, full test/typecheck/lint/build gate, and real browser two-material/blockage/restore acceptance. Record exact tested SHA and scoped PR evidence; merge #83, then recheck #2 for #84.

Implementation and verification complete on c35eaf143d591b6dff0ebb88397c9d86d077b9f0; scoped PR #88 contains acceptance evidence. Recheck #2 after merge for #84.

No underground transport, demand-adaptive skipping, extra buffers, filters or wall bypasses.
