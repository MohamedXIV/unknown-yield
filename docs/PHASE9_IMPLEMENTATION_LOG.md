# #108 implementation ledger

Ruling: user deprioritized pre-release compatibility. Keep cheap exact empty-liquid migration from schema 13, but do not guarantee old fixture content compatibility after the demo content changes. Atomic save rejection remains mandatory.

Ruling: #108 uses one authored pipe/tank/pump definition per kind rather than a multi-definition framework. Stable kind IDs identify these definitions; costs/capacity/transfer/fuel live in content. Expand only when later content needs it.

Task 1: content RED (3 failed), then GREEN (3 files / 43 tests); typecheck PASS. Persistence RED (2 failed), then GREEN (liquid persistence and ledger 2 files / 15 tests); new physical records schema 14, detached snapshots and separate pipes/tanks ledger columns. Extended persistence/ledger gate: 3 files / 21 tests PASS.

Task 2: conservative pre-step transport/construction implemented. Focused liquid tests cover one-edge movement, full outlet, disabled pump draining, successful-transfer fuel, insertion order, atomic build/refund, loaded edit/removal refusal, no-fuel, mismatched identity, per-update ledger reconciliation and exact future restore.
Task 3: blueprint schema 3 exports relative liquid layout/settings without quantities; v1/v2 unchanged when no liquid structures. Connected liquid backlog participates in recurrence; unrelated reservoir changes do not affect certification. Internal route changes reset certification. Liquid boundary events carry transferred units.
Task 4: world-01-v7 adds dedicated liquefier/precipitator operations and unknown liquid-0. Normal-command domain chain discovers both outputs with exact conservation and future restore equality. Build/inspect/toggle/reroute tools and world rendering implemented; normal-controls browser acceptance completed; final verification and GitHub closeout in progress.
Content Studio handling/interface roundtrip regression was observed RED and repaired. Focused content + Studio: 4 files / 48 tests PASS. Focused liquid/throughput/content: 4 files / 35 tests PASS. Interaction: 12 tests PASS.
Ruling: existing blueprint APIs only export and parse, with no stamp command. Preserve that boundary; do not create a new placement subsystem to satisfy a speculative plan item.

Ruling: pipe delivery at machine/tank input uses the existing solid socket convention: last pipe occupies the input socket, next point enters the footprint. No one-cell gap or invisible connector. Updated endpoint fixture accordingly.

Review ruling: changing a previously certified connected backlog withdraws the certificate immediately. Regression observed RED, then liquid/throughput 2 files / 20 tests GREEN.

Final integration gate (2026-10-02): 41 files / 281 tests PASS, 2 skipped. Typecheck, lint, build and git diff --check PASS. Production static export excludes Studio. Normal-controls browser acceptance and save/restore PASS; console error/warn []. Runtime source: 609c9fd93d5a41f4fb5e646c8903df5374a88dca. Evidence: PHASE9_LIQUID_ACCEPTANCE.md and docs/evidence/phase9-liquid-{closed,restored}.jpg.
