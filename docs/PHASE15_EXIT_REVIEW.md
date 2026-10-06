# Phase 15 Exit Review — Content scale and expedition arc (#152)

Parent epic: #106  
Delivery PR: #205

Phase 15 closes only if the accepted systems sustain one coherent expedition rather than a collection of isolated proofs.

## Fresh-expedition gate

`packages/sim-core/test/phase15-expedition-exit.test.ts` starts from the canonical initial state:

`new Simulation(fixture)`

The test is intentionally forbidden from injecting save truth. It does not mutate:

- `knowledge`;
- experiment evidence;
- flow history;
- terminal imports;
- discovered deposits;
- market state;
- milestones;
- company allocations.

Progress is generated only by gameplay commands and simulation time.

The integrated route proves four qualitatively different industrial eras.

### Era 1 — differentiated stable material

Ferrite is extracted and the hidden ambient thermal branch is discovered.

Magnetic ceramic becomes company-known and is physically routed to the terminal for Materials Exchange export. This demonstrates that the structural family can diverge into a specialty economic use rather than existing only as construction feedstock.

### Era 2 — reactive multi-state industry

Veined ore is processed through the accepted sealed/liquid/gas systems.

The expedition confirms:

- sealed thermal evidence;
- liquid/gas capability progression;
- gas collection;
- resonance sensing;
- a real Corporate Order fulfilled through exported conductive granules.

This funds later company imports through ordinary economy play rather than debug fuel injection.

### Era 3 — physical advanced/research fuel

The resonance probe reveals the catalytic seam.

The expedition installs accepted terminal handling, imports:

- Advanced propellant into the gas dock;
- Research-grade coolant into the cryogenic dock.

A Deep extractor and Sinterer consume those physical fuels to discover the local resonant-matrix route.

### Era 4 — recursive company learning

Local Matrix knowledge makes the company offer Orbital matrix application R&D.

Physical Orbital binder is imported through the dry terminal outlet and processed by a Sinterer. Completing the R&D returns an allocation for the previously hidden Orbital resonance seed.

The seed is physically imported and locally sintered into Phase lattice.

That reaction:

- makes Phase lattice known;
- reveals the previously hidden Phase-lattice field-calibration milestone as completed;
- reveals the previously hidden Phase probe;
- unlocks Phase-quench equipment;
- allows sensing of the previously hidden depth-18 Phase-lattice seam;
- allows the existing Deep extractor to establish native Phase-lattice extraction.

The late capability therefore depends on a material/application that did not exist in company knowledge at expedition start.

## Accepted supporting evidence

The fresh gate does not duplicate every already-accepted Phase 15 proof.

### #145 — differentiated material families

`phase15-material-families.test.ts` and content regressions prove structural, reactive and resonant families create different industrial/economic choices.

### #146 — partial knowledge graph

`phase15-knowledge-graph.test.ts` proves hinted/confirmed evidence grows player knowledge without leaking hidden recipe truth.

### #147 — advanced/research fuel

`phase15-fuel-progression.test.ts` proves higher fuel classes are physical terminal-held materials, not Fuel II/Fuel III counters.

### #148 — recursive company technology

`phase15-recursive-company-tech.test.ts` proves the company-R&D/import/Phase-lattice chain and spoiler boundary in focused form.

### #149 — late-game hazard/handling/logistics

`phase15-late-game-integration.test.ts` proves Phase lattice creates a deterministic instability hazard and a protected sealed-cold liquid route using accepted Phase 9/11/14 systems.

### #150 — pacing and diversification

`phase15-balance.test.ts` proves:

- diversified exports outperform sustained top-product spam;
- the late Phase-ceramic loop does not remain self-funding;
- durable progression is not a repeated export/XP grind.

### #151 — targeted Studio tooling

`PHASE15_STUDIO_AUDIT.md` and the accepted Studio tests prove only the repeated economy-authoring gap was added to Content Studio.

## Conservation and persistence

The fresh exit gate audits the authoritative material ledger after each major era.

Final Phase technology survives save/load and deterministic continuation.

No material is created by milestone, R&D or sensing state. Those systems only expose capabilities; all industrial feedstock remains physical.

## Accepted evidence

Phase 15 is **accepted and complete** through #152 / PR #205.

Exact closing head:

`2f530ababb282c3e6d4046c5a5e9ce0cd6491fdb`

Squash merge on `main`:

`d8d0de628b73f1cd291083437de5aa2a88b33804`

Exact-head evidence:

- fresh `phase15-expedition-exit.test.ts`: PASS;
- focused recursive-company-tech regression: PASS;
- 104 / 104 test files PASS;
- 502 tests PASS / 2 skipped;
- typecheck PASS;
- lint PASS;
- build PASS;
- GitGuardian PASS;
- RepoPilot exact-head merge readiness: `ready=true`, `blockers=[]`;
- no unresolved review threads.

The fresh gate also exposed and fixed a real spoiler: the Phase-lattice milestone is now omitted from player-facing milestone views until it has completed.
