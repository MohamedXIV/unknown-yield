# #110 — authored transport and containment compatibility

Status: conversational design and written spec approved on 2026-10-04; implementation plan awaiting review. Based on main `dd67f42f5e391c425cbbc2188618a4366b4e6821`, live #110 and parent #100. #109 is closed through PR #163; no competing open PR was present. No product implementation is claimed.

## Intent and acceptance

Make a discovered material's containment requirement change a real logistics choice. Compatibility must be authored, validated and deterministic in sim-core. Refusal retains exact material and charges no transfer fuel. Players can inspect the requirement after material discovery and choose suitable infrastructure without seeing hidden reaction outputs.

The accepted slice proves one corrosion requirement on the existing liquid branch. Requirements and capabilities use stable IDs and localized labels rather than hard-coded corrosive/hot/atmosphere-sensitive booleans. Other classes can be authored against the same containment predicate, but this issue does not add additional demo chains, incidents, temperature, pressure physics, corrosion damage, leaks, terminal modules or later-phase gameplay.

## Selected approach

Use a content capability catalogue and material requirements, with selectable protection profiles on the existing liquid pipe/tank/pump records. This preserves their directed geometry and quantities and gives players a normal build/inspect recovery flow.

Separate building variants were considered but would duplicate tools and definition selection for the same footprint/transport behavior. Implementing several special-material chains at once was rejected because one corrosion branch proves the #110 contract. The profile mechanism is limited to the liquid infrastructure this example needs; gas and solid endpoints receive authored definition capabilities, not an unused upgrade UI.

## Content contract

- `containmentCapabilities`: catalogue of `{ id, nameKey }`; defaults to an empty array in content without this extension. Duplicate IDs, unknown references and missing locale resources are invalid.
- Materials: `requiredContainment: string[]`, default `[]`. Every requirement must reference the catalogue. Requirements are conjunctive: the endpoint must provide all of them. No implicit conversion or mixing is introduced.
- Machine definitions: `inputContainment` and `outputContainment` capability ID arrays, both default `[]`. They describe protected physical buffers/interfaces independently of input/output handling states and process conditions.
- Storage definitions: `containmentCapabilities`, default `[]`.
- Site definitions: `beltContainment` and `dryContainment`, default `[]`, for the existing belt cargo and dry stock/staging locations. This does not make dry endpoints accept liquids/gases or create new terminal handling.
- Gas line/vessel/compressor definitions: `containmentCapabilities`, default `[]`, independent of their existing gas-only handling state. There is no numeric pressure requirement.
- Liquid pipe/tank/pump definitions: base `containmentCapabilities`, default `[]`.
- `liquidLogistics.containmentProfiles`: entries `{ id, nameKey, capabilities, additionalCost: { pipe, tank, pump } }`. Costs are nonnegative integers, using the existing construction material. The supported baseline profile is stable ID `standard`, with no added capabilities and zero added costs. Default content without profiles receives that exact baseline. IDs and capability references are validated; the baseline must be present exactly once.

The effective liquid endpoint capabilities are its definition capabilities plus the selected profile capabilities. This is a set union, not a tier/level comparison. Capabilities do not change footprint, capacity, speed, fuel or material identity.

Content validation must prove every executable reaction's input and output fit the matched machine's authored state and containment buffers. Extraction outputs must fit their extractor interface. It must reject definitions that could start a batch whose output cannot safely remain in that machine. Unknown material/capability/profile references fail validation; never repair them silently.

## Provisional fixture

Content advances to `world-01-v9`. Add capability `corrosion-resistant` with a localized name. Existing unknown `liquid-0` requires it; discovery/recipes and transformation quantities stay unchanged. The Liquefier output and Precipitator/Vaporizer liquid inputs provide it through authored machine definitions. Their other buffer capabilities remain as authored; no blanket protection is added to unrelated machines.

Liquid profile `standard` adds no protection and costs zero. Profile `lined` provides `corrosion-resistant` with additional construction costs: pipe 2 plates, tank 10 plates, pump 4 plates. Existing base costs remain pipe 2, tank 24, pump 12. These figures and the demonstration requirement are provisional content, not global chemistry or economy constants.

Gas-0 continues to require the existing gas-only handling path; no additional demo requirement is attached to it in #110. Known construction/solid chains remain usable. The extended normal chain needs a lined liquid segment before producing gas, then uses the accepted pressure route.

## Authoritative admission

One small pure containment predicate checks a stable material ID against endpoint handling states and capability IDs. All production transport implementations use the same requirement semantics while retaining their own geometry, reservations and commit logic. This does not unify belt/liquid/gas movement engines.

Apply the predicate to every relevant receiving physical location: belt cargo, depot inventory, dry stock/staging, machine input/output buffers, liquid lines/tanks and gas lines/vessels. Source pumps/compressors must themselves provide the transported material's required containment in addition to the downstream receiver. Source withdrawal and target admission form one atomic transfer.

Compatibility refusal never takes source units, spends transfer fuel, changes discovery, reserves phantom capacity or writes a move/export event. Already admitted units may drain along a compatible route while source admission is disabled. All pre-step reservation, one-edge movement, identity, capacity and exact conservation rules from #108/#109 remain intact.

Machine processing is a defined transformation, not transport. Authored validation and save validation protect its buffers/escrow; recipe matching and the hidden knowledge boundary remain unchanged. There is no containment-specific reaction outcome or incident in this issue.

## Player construction and recovery

Liquid build tools expose Standard and Lined profile choices with localized capabilities and total construction cost. New pipe paths, tanks and pumps carry the chosen stable profile ID. A multi-cell path uses one explicitly selected profile and validates/payments atomically before placing any cells.

Inspector changes a pipe/tank profile only while empty. A pump has no cargo buffer, but must be disabled before changing its profile. A single profile-change command resolves the entity ID, validates the authored profile and applies the exact construction cost difference atomically. Insufficient stock or invalid/loaded/active entities leave the full state unchanged. A downgrade refunds only the reduction in embodied construction material; no material contents are reclaimed or teleported.

Loaded lines/tanks still refuse rotation, profile change and dismantle. To recover: stop upstream feed, provide a real compatible destination, drain, change the empty route/profile, then resume. A malformed loaded standard location with corrosive contents is rejected by save validation rather than admitted as a recovery shortcut.

Dismantling empty profiled infrastructure refunds its base cost plus profile cost. The material ledger includes the same sum as embodied construction material. Pump transfer fuel remains successful-only.

## Knowledge and presentation

Material requirements become visible through the existing material-known set: initially known materials plus confirmed observed reaction inputs/outputs. Do not add a new unlock based on recipe IDs or show requirements for undiscovered outputs through tools, catalogue descriptions, hints, factory views or rejected-command details.

Infrastructure capability/profile names may be visible before any material is discovered; they describe purchased equipment rather than predicting a reaction. The snapshot exposes known material requirements and only the capability labels needed to interpret public equipment metadata. It never includes a capability-to-hidden-material or reaction-output lookup.

Blocked endpoint/pump inspection uses a sim-core-derived reason distinguishing handling state, missing containment, identity mismatch, capacity, direction/missing route, disabled and fuel. For a known material, missing-containment feedback names the requirement and current profile; for undiscovered material, use a generic compatibility message without its ID, name or requirement. Existing machine status must not predict its hidden next output.

Phaser renders a small distinct lining marker from the snapshot; React owns profile controls and localized explanations. Neither computes admission. Closed factory views preserve separate gas/liquid inventories and show only discovered material metadata.

## Persistence, factories and Studio

Save schema advances 15 → 16. Liquid pipe/tank/pump records persist `containmentProfileId`. Cheap matching-content legacy migration assigns `standard`; incompatible `world-01-v8` saves are explicitly rejected. Backward fixture compatibility is not a release gate. Session slot advances v9 → v10 with older-key fallback and readable rejection.

Parse and semantic validation reject unknown profiles, incompatible material holdings in any protected physical location, duplicate IDs, malformed state, invalid capacities and inconsistent embodied construction accounting. Failed load leaves the live world unchanged. Snapshots remain detached.

Blueprint schema 5 records liquid profile IDs, directions/layout and pump enabled state, with existing gas arrays retained when needed. It never exports quantities/material contents/escrow/jobs/knowledge/certificates. Old schemas 1–4 remain parseable with standard liquid profiles. Export schema 5 when liquid infrastructure is present; gas-only layouts without profiled liquid members can retain schema 4. No stamping command is added.

Factory topology/recurrence fingerprints include liquid profile settings, including connected external members. A meaningful profile change withdraws stale certification immediately. Unrelated profiles outside connected topology must not invalidate a factory. Roof state remains presentation-only.

Studio import/export must preserve material requirements, machine containment fields, capability definitions and liquid profiles. Add only the necessary JSON-array authoring cell boundary for editable material/machine tables; preserve infrastructure configuration as base content. Structural/reference/semantic and locale validation happen before export/preview. No broad Studio editor is added.

## Verification and delivery

Focused domain tests must prove:

1. Authorable multiple requirements, all-of matching, unknown/duplicate references, invalid costs/baseline profiles, machine input/output constraints, locale coverage and Studio roundtrip.
2. Standard liquid route refuses corrosive liquid; lined pump/line/tank and compatible processor accept it. Missing protection on any one segment retains upstream contents and spends no fuel. Solid/gas synthetic content proves shared predicate use without new demo chains.
3. Atomic build/profile-change affordability, upgrade/downgrade refunds, loaded/active refusal, construction ledger equality and stop/drain/reconfigure/resume with real destinations.
4. Every-tick ledger reconciliation through the normal solid → liquid → gas → solid chain; hidden requirements absent before observation and truthful explanations afterwards.
5. Flowing/blocked save roundtrip and future equivalence; invalid profile/holdings/content rejected without mutation; detached snapshots, profiled blueprint roundtrip without contents and profile-dependent factory certification.

Run focused checks first, then `npm test -- --maxWorkers=4`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Record counts, skips and any failure exactly. Browser acceptance uses normal controls: observe the liquid, diagnose standard containment refusal, build/reconfigure a compatible empty route, store/transport it, block/drain/recover, save/restore, and inspect closed/open factory state. Capture screenshots and console diagnostics; domain evidence establishes exact conservation.

Execution is native in `F:\_WIP\unknown-yield`, branch `codex/110-containment-compatibility`, with no worktree, agents, new dependency or Vercel change. Open one scoped PR referencing #110 and keep #100 open. Merge requires explicit user approval at the reviewable PR stage; implementation approval does not itself authorize integration into main.

## Spec self-review

The example has one material requirement and one selectable protective profile. Empty profile changes, successful-only fuel, safe output buffering, all physical admission boundaries, knowledge visibility, version changes and refund accounting are explicit. No generic transport rewrite, hidden recipe hint, pressure model, damage incident, terminal upgrade or later child issue is included. Written-spec review is approved; the implementation plan is prepared for review, and product edits have not started.
