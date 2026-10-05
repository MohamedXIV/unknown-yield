# Phase 13 #135 — Discovery-created listings and market memory

## Contract

This slice extends the accepted Phase 5 Materials Exchange; it does not create a stock-trading subsystem.

- authored exchange definitions may exist before discovery, but no listing, order or bulletin is visible until the company knows the material;
- authored demand shocks are deterministic one-shot company events tied to a confirmed reaction whose output is the affected exchange material;
- applying a shock records persistent `marketSignals[shockId].triggeredAt`;
- the same shock cannot replay after another market tick or save/load;
- demand moves slowly back toward the listing baseline on the ordinary market cadence;
- supply saturation continues to recover independently;
- bulletins remain persistent history explaining why demand moved;
- no RNG, wall-clock timing or undiscovered material/application text participates.

## Fixture proof

The first confirmed `sinter-orbital-binder` result characterizes **Resonant matrix**.

At the next market cadence:

1. its pre-authored listing becomes available because matrix is now company-known;
2. the bounded `matrix-procurement` Corporate Order becomes eligible;
3. `resonance-orbital-application` applies exactly once;
4. matrix demand rises from 10,000 to 15,000 bps;
5. a persistent company bulletin records the orbital resonance application;
6. later market ticks recover demand toward 10,000 bps at 100 bps per market tick.

The alternate `sinter-catalyst` discovery can still reveal the matrix listing, but it does not fabricate the specific orbital-binder application bulletin because that authored trigger reaction was not confirmed.

## Persistence

Save schema 24 adds `marketSignals`. Schema 23 migrates exactly to empty signal history because earlier builds had no authored demand-shock events. A legacy schema carrying future signal history is rejected; current-schema saves must include the field.

Focused tests cover hidden-truth absence before discovery, one-shot application, opportunity creation, slow demand recovery, exact save/load memory and fail-closed migration. Exact-head CI evidence belongs on the Pull Request; this document claims no unrun verification.
