# Phase 15 — Advanced and research-grade fuel progression (#147)

Issue #147 turns higher fuel classes into distinct operating constraints without adding Fuel II/Fuel III stat bars.

## Contract

The expedition now has two deliberately different fuel models.

### Ordinary company fuel

The existing numeric `Save.fuel` allocation remains the operating budget for ordinary equipment, terminal imports, relocation and recovery.

It is company allocation, not a physical material. Existing machines with no `fuelClassId` keep exactly this behavior.

### Higher operating fuels

Higher classes are physical imported materials:

- **Advanced propellant** — `orbital-propellant`, delivered as gas through the sealed gas dock.
- **Research-grade coolant** — `orbital-coolant`, delivered through the secure cryogenic dock.

A machine may author a `fuelClassId`. Its existing positive `fuel` value then means physical units of that class consumed per batch rather than ordinary company fuel.

Higher-fuel batches:

1. require the class's evidence milestone;
2. require the matching terminal module to hold enough physical material;
3. consume that material directly from the terminal reserve at batch start;
4. record it in `flows.consumed`.

The material ledger therefore accounts for the full path:

```text
off-world import
  -> terminal module
  -> machine operating consumption
```

Nothing is silently deleted.

## Authored progression

### Advanced propellant

`gas-study-certified` certifies the class.

The representative advanced consumer is the **Deep extractor**. Each extraction batch consumes one unit of advanced propellant rather than a larger ordinary-fuel number.

The supply arrives through the existing `gas-dock`, so gas handling is part of the capability gate.

### Research-grade coolant

`resonance-survey-certified` certifies the class.

The representative research consumer is the **Sinterer**. Each batch consumes one unit of research-grade coolant.

The supply arrives through the existing protected `cryo-dock`, whose containment already requires cryogenic, hazard-isolated and secure-chain handling.

This makes research operation qualitatively different from ordinary factory fuel.

## Deliberate boundary

#147 does **not** add a new fuel-pipe or power-grid subsystem.

The terminal reserve is the authoritative operating reservoir for these scarce company supplies. Existing gas/liquid logistics remain available when a player chooses to move those same imported materials for other industrial purposes.

A dedicated distribution system should be added only if later play/evidence demonstrates that terminal-reserve consumption creates a real spatial or throughput problem.

#147 also does **not** implement the recursive company-R&D loop. That belongs to #148. The current classes use already-authored evidence milestones so this issue establishes the fuel-class mechanics without stealing the next issue's progression fiction.

## UI

Build descriptions name the required higher fuel class and units per batch.

Machine inspectors show:

- ordinary **Company fuel** for normal equipment;
- the authored class name for higher-fuel equipment;
- physical units currently held at the required terminal module;
- whether class certification is still locked.

Machine statuses distinguish:

- `fuel-class-locked`;
- `needs-special-fuel`;
- ordinary `needs-fuel`.

## Compatibility

The save schema remains **27** because no new runtime fuel inventory is persisted.

The fixture content version advances from `world-01-v13` to **`world-01-v14`** because existing machine definition IDs now have intentionally different operating-fuel semantics. Loading an older content-version save against the new fixture should fail rather than silently reinterpret a machine's fuel source.

Older authored content remains schema-compatible: `fuelClasses` defaults to an empty list, and machines without `fuelClassId` retain ordinary company-fuel behavior.
