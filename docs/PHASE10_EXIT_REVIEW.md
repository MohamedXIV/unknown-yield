# Phase 10 integrated exit review — #119

Status: AUTOMATED INTEGRATION IMPLEMENTED; browser acceptance is not yet claimed.

## Exit contract

This review closes only the accepted Phase 10 contract:

1. a manufactured result unlocks an industrial sensing capability without XP or a generic tech-tree purchase;
2. hidden authored source truth remains absent before legitimate discovery;
3. the newly unlocked capability reveals a previously unavailable source;
4. extraction remains physical and depth/capability constrained;
5. the source feeds a real processing chain into a useful new product;
6. material conservation and save/load determinism remain intact.

It does not pull Phase 11 hazards, advanced logistics, Phase 7 performance work, or Phase 16 device gates forward.

## Integrated domain scenario

`packages/sim-core/test/phase10-exit.test.ts` starts from a fresh authored world and uses normal simulation commands only.

The scenario first manufactures the sealed-Heat result required by the accepted deep-extraction capability. It then builds the real solid → liquid → gas → conductive-granules chain. Confirming that manufactured granules result unlocks the resonance probe through the authored milestone; no save, inventory, knowledge, XP or currency injection is used.

Before that unlock, the catalyst seam is absent from both snapshot and raw save. The exact resonance probe at the authored signal then materializes the source. A deep extractor physically removes catalyst units, belts carry them into a Sinterer, and the hidden Sinter result produces resonant matrix. Matrix becomes visible/useful only after the real reaction is confirmed.

The material ledger is audited after every accepted command and every simulation tick. Generic discarded flow must remain empty. The completed expedition is serialized, restored into a second simulation, and both worlds are advanced for 60 ticks with exact serialized-future equality and conservation checks.

## Verification boundary

The repository full gate remains:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Browser acceptance is a separate #119 requirement because the issue explicitly asks for it. No browser/visual evidence is recorded as PASS until a real playable session verifies the Phase 10 interaction path. A browser-only gate must not rewrite the deterministic domain evidence above.
