# Phase 13 #133 — Physical off-world imports

## Scope

This slice implements the company/Earth -> planet direction without creating a magical global inventory.

- authored `economy.imports` supply catalog;
- company-fuel request cost;
- bounded persisted terminal import holding;
- explicit imported-material ledger source;
- one deterministic dry terminal outlet into ordinary belt logistics;
- an import-only specialized feedstock that has no local source and cannot be directly re-exported.

## Proof content

`orbital-binder-crate` delivers 6 units of **Orbital binder** for 42 company fuel.

Orbital binder is company-known and solid, but it has no authored deposit, hidden deposit, atmospheric source or reaction that produces it. It is not a Materials Exchange listing. The existing Sinterer can consume two binder units to produce one hidden Resonant matrix outcome, so imported cargo is useful industrial feedstock rather than decorative inventory.

At baseline compensation, six binder units can produce at most three matrix units (48 gross export fuel before process fuel and saturation) against a 42-fuel import cost plus processing fuel. The proof therefore does not create a trivial positive-fuel import/export loop.

## Physical flow

```text
request import
  -> company fuel decreases
  -> terminalImports.staging increases
  -> ledger imported-source history increases
  -> dry import outlet waits for an ordinary compatible belt
  -> one physical unit enters belt arbitration
  -> ordinary storage / factory / machine logistics
  -> reaction consumption / local product
```

No request writes to `stock`. A full terminal import holding refuses another request. A blocked outlet retains the cargo at the terminal.

## Persistence and conservation

Save schema 23 adds `terminalImports = { staging, received }`. Schema 22 migrates to both empty maps. Current-schema saves must carry the state explicitly.

The ledger adds two dimensions:
- `importStaging`: current physical units still held at the terminal;
- `imported`: cumulative off-world source units.

The conservation source side is therefore `initial + produced + imported`, while import staging is counted among held material.

## Deferred to #134

This slice is intentionally dry solid cargo only. Liquid/gas inbound handling, cryogenic, hazardous and secure cargo rules remain #134, where terminal handling modules become deeper bidirectional logistics gates.
