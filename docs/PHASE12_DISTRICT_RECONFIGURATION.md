# Phase 12 district feed switching and storage reconfiguration

Issue #129 strengthens the existing physical belt/storage model instead of adding a virtual allocation layer.

## Explicit route selection

Plain belts already persist an optional alternate direction and a selected-route bit. The new `setDivertRoute` command makes that existing truth idempotently controllable:

- `primary` always selects the authored belt direction;
- `alternate` selects the configured alternate direction and is rejected until one exists;
- selecting the route already active is a successful state-preserving operation;
- cargo is never moved by the command. Only future dispatches from the diverter use the selected route.

The older toggle command remains compatible, but the factory/district UI now offers explicit primary and alternate feed controls so an automation or player never has to infer current state before requesting a route.

## Physical district proof

The regression builds two persistent factories around one physical depot. The depot output reaches a diverter between them:

- primary route feeds Factory B;
- alternate route feeds Factory A;
- both processors stay disabled so their authoritative input buffers expose exact destinations;
- ferrite is seeded by moving units out of the authored source deposit into the depot, preserving the ledger.

After Factory B receives stock, the route changes to Factory A. Ferrite already east of the diverter still reaches Factory B exactly, while later depot withdrawals reach Factory A. The depot inventory decreases physically; no material appears in global stock.

The selected route and every cargo destination survive save/load, and a restored simulation evolves byte-identically under the same steps.

## Scope boundary

#129 does not add quotas, priority markets, global stock allocation or factory composition. #130 separately evaluates composition only if evidence from the completed lifecycle/reconfiguration work justifies it.
