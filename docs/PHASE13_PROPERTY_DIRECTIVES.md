# Phase 13 #136 — Property and experimental Special Directives

## Intent

Move Special Directives beyond quantity checklists and explicit recipes. The company can state **what property or prototype outcome it wants** while leaving the industrial solution to the player.

## Authoritative contract

A property directive authors:

- stable `id`, localized `nameKey` and `briefKey`;
- a localized `propertyKey` such as stability/purity/prototype fitness;
- `targetMaterialId`;
- one or more hidden `solutionReactionIds`;
- duration;
- optional fuel reward;
- optional physical import-supply allocation.

The target material must exist. Every acceptable solution must begin unconfirmed and produce that target. At least one reward is required.

## Knowledge boundary

Eligibility requires:

1. the target material is already company-known;
2. none of the acceptable solution reactions has already been confirmed;
3. at least one acceptable reaction has a company-known input and an unlocked capable processor.

The player-facing opportunity contains the target material, property wording, expiry and reward. It **never contains** `solutionReactionIds` or the hidden recipe/input chosen by content.

The fixture demonstrates this after Resonant matrix is characterized through imported Orbital binder. The company then offers `matrix-local-route`, asking for a local stable route without revealing that `sinter-catalyst` is an accepted answer.

## Completion

Confirmed experiment events pass through the existing directive recorder. If the confirmed reaction is an authored acceptable solution and the opportunity is active before expiry, the directive completes once. Replaying the same experiment cannot grant another reward.

This deliberately does not add a global quality meter. “Purity”, “stability” and similar goals are semantic property targets until later gameplay proves a need for a separately simulated property field.

## Physical reward

The fixture reward is one allocation of `orbital-coolant-canister`.

An allocation is persisted company entitlement, not cargo. Calling `requestImport` with an allocation:

1. still checks terminal capability/unlock, installed module, cargo identity and capacity;
2. preserves the allocation if any physical gate refuses the request;
3. on success consumes exactly one allocation;
4. spends zero fuel;
5. materializes the same physical conserved import cargo and imported-source ledger entry as a paid request.

Thus Special Directives can award specialized capability inputs without becoming an inventory shortcut.

## Persistence

Save schema 25 adds `company.importAllocations`.

- schema 24 -> 25 migrates to an empty allocation record;
- a legacy schema cannot smuggle future allocation state;
- current schema must explicitly carry the record;
- every allocation count must be positive and reference an authored import supply;
- completed property directives require confirmed acceptable reaction evidence;
- an active property directive cannot coexist with already-confirmed solution evidence.

## Regression evidence

`packages/content/test/property-directives-content.test.ts` covers authoring and hidden-solution validation.

`packages/sim-core/test/property-directives.test.ts` covers:

- sanitized offer view with no hidden solution leak;
- exact once-only completion;
- import allocation reward without fuel mutation;
- physical-gate refusal preserving the reward;
- successful zero-fuel claim into the real cryogenic dock;
- schema-24 migration and fail-closed future-state rejection.

Exact-head CI evidence belongs on the PR. This document does not claim unrun verification.
