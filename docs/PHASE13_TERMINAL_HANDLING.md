# Phase 13 #134 — Bidirectional terminal handling gates

## Contract

#134 deepens the Phase 9 terminal module model rather than creating a second handling system.

- handling state remains `solid | liquid | gas`;
- cryogenic, hazardous and secure requirements are all-of containment capabilities;
- multiple fixed modules may share one handling state when their cells differ;
- an import may require a specific module;
- request admission checks capability unlock, installation, identity and capacity;
- accepted module cargo occupies the existing persisted `terminalModules[id]` holding;
- imported module cargo exits through that module's same fixed edge port into ordinary world logistics;
- incompatible or missing downstream containment leaves cargo physically held at the terminal.

## Fixture proof

### Dry
`orbital-binder-crate` keeps the #133 dry path: bounded import holding -> deterministic dry outlet -> ordinary belt.

### Gas
`orbital-propellant-cylinder` requires the existing `gas-dock`. It cannot be requested before gas handling is certified or before the dock is installed. Once accepted, the cylinder quantity is the gas-dock holding and can feed the pressure line immediately outside the dock.

### Cryogenic / hazardous / secure
`orbital-coolant-canister` requires `cryo-dock`, which carries all three capabilities:
- `cryogenic-rated`
- `hazard-isolated`
- `secure-chain`

The coolant cannot enter ordinary liquid infrastructure. The authored `sealed-cold` containment profile supplies those three capabilities to pipes/tanks/pumps so the physical import can leave the terminal without bypassing containment.

## Conservation

`terminalImports.received` remains the cumulative off-world material source. Current module quantities are already counted once under `terminalModules` by the material ledger; dry imports still count under `importStaging`. Moving cargo from a module into a belt/pipe/pressure line changes only its held location, never the source total.

No save-schema bump is needed: #134 reuses the schema-23 terminal module holdings and import source history added in #133.
