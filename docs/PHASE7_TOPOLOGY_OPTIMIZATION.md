# Phase 7: shared observation topology (#94)

Approved scope: build incoming-belt adjacency and machine/storage socket-owner indexes at most once per synchronous FactoryThroughputMonitor.observe call. Share read-only maps between factories and discard them when the call returns. Rebuild on the next observation, including changes to manual routing, geometry and socket placement. Build lazily when a factory actually needs a signature.

Keep connected traversal and dynamic fingerprint construction per factory: cargo, jobs, buffers, storage, terminal staging, T cursor and all crossing state remain authoritative. Certification frequency/policy, content, save schema and public API are unchanged. No cross-tick cache or invalidation subsystem.

Compare against measured source b7f7f2b7fbf324c0b38a19aebea316e397a3cc75 using the unchanged profile:world harness on the same reference machine. The 32-factory joint step+snapshot p95 budget remains <=10ms; incremental improvement does not close Phase 7. Timing/CPU evidence and final verification will be recorded after measurement.
