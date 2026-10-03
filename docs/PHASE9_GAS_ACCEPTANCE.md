# #109 — gas logistics acceptance evidence

Local gate verified on 2026-10-03 in the existing checkout, branch `codex/109-pressurized-gas`, based on main `7f88eb3c326194836e3f360755daf2c87b4287fb`. Live #109 and parent #100 were open; no competing open PR was present. This document records local evidence, not remote CI or merge approval.

## Implemented scope

Separate directed pressure lines, physical pressure vessels and source compressors extend the normal solid → liquid → gas → solid chain. sim-core owns admission, reservations, quantities, fuel, construction, recovery and saves. Ordinary liquid/solid paths reject gas. No pressure physics, venting, cylinder cargo, leaks, new terminal handling, Vercel or remote-agent work.

Save schema **15**, fixture **world-01-v8**, gas blueprint schema **4**. Schema 14 with matching content gets empty gas records; old world-01-v7 content is explicitly incompatible. Rejection is atomic. Earlier blueprints remain supported.

## Domain evidence

- `gas-content.test.ts`: content handling/interface validation, hidden reactions and Studio roundtrip.
- `gas-logistics.test.ts`: pre-step movement and source/target/fuel reservation, insertion order, full/disabled/unfueled backpressure, successful-only fuel cost, identity and ordinary-path rejection, atomic build/preview/refund, walls/occupancy and loaded-edit recovery.
- `gas-persistence.test.ts`: identity/capacity/location/overlap and dry inventory rejection without mutation; empty schema-14 migration and old-content refusal.
- `gas-chain.test.ts`: normal build commands discover gas and collector output, reconcile exact ledger every tick, detach snapshots and compare uninterrupted/restored futures.
- Factory tests: separate gas inventory, connected backlog withdraws certification while unrelated vessels do not; blueprint relative layout/settings excludes material quantities. Interaction/session regressions cover gas construction, selection and save slot fallback.

New content/runtime/persistence/factory/interaction regressions were observed failing before their fixes. Self-review completed locally; no independent agent review was performed because this session prohibits agents.

## Browser evidence

Local app `http://127.0.0.1:3030`, normal player controls only; no injected simulation state. Factory `(23,32)`, 20×9, contains Liquefier `(25,35)`, Vaporizer `(29,35)`, pressure vessel `(33,35)`, Gas collector `(37,35)`, socket compressors and directed routes.

1. The initial ordinary liquid pipe on the Vaporizer outlet retained gas upstream; the compressor reported incompatibility after runtime refresh. Saved/reloaded/restored gas output remained 12 units. The wording was broadened to identify source/outlet incompatibility.
2. Replacing the ordinary pipe with a pressure line admitted gas to the vessel and collector. The notebook gained the observed results; collector output reached **5 Conductive granules** with **6 Process vapor** remaining in input. [Collector evidence](evidence/phase9-gas-collector.png).
3. An empty pressure line was redirected south to a missing outlet. It filled to **4/4**, and edit/reclaim controls were unavailable. [Blocked line](evidence/phase9-gas-blocked-line.png).
4. Stopped source feed, placed a real south-facing recovery vessel `(31,37)`, then resumed. All **4 units** drained into that vessel without compressor fuel. Empty-line controls became available; outlet was restored east and source feed enabled. [Recovery vessel](evidence/phase9-gas-recovery.png).
5. Saved/restored this recovery state. The closed factory showed **4 gas units** in physical pressure infrastructure, separate observed machine buffers and truthful Needs fuel statuses; reopening showed the recovery vessel still **4/48**. [Restored factory](evidence/phase9-gas-restored-factory.png).

Fuel depletion and the existing obligation-backed assistance were exercised normally. No fuel/state was injected. Continued production after the final reroute was fuel-blocked; domain tests cover reroute/resume and full-vessel backpressure. The browser proves loaded-line blockage/drainage, not a full 48-unit vessel. Console warnings/errors: `[]`.

## Integration gate

Final repeat: `npm test -- --maxWorkers=4` — **45 files, 308 PASS, 2 skipped**. `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` — PASS. Static export verification excludes Studio authoring UI. Final repeat includes the added schema-14 compatibility regression. No remote CI workflow is present.

#100 remains open. This implements #109 only; #110 and later scopes are not started. Phase 7's previously unmet performance budget remains deferred and unchanged.
