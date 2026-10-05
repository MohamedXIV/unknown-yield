# Phase 13 physical shipment manifests

Issue #132 adds explicit off-world shipment selection without introducing a second inventory.

## Physical truth

Cargo remains authoritative in the terminal locations that already existed:

- solid cargo stays in `Save.staging`;
- liquid and gas cargo stay in installed terminal handling modules.

`Save.shipmentManifest` is reservation/intent only. Its quantities must be positive, known to the company, accepted by the exchange, currently handling-capable, no greater than the physically staged amount and no greater in total than the authored `economy.shipmentCapacity`.

The manifest therefore cannot create cargo, move it into escrow or reveal an undiscovered authored listing.

## Capacity and auto-export interaction

The fixture authors an 8-unit shipment capacity, independently from the 24-unit dry staging capacity.

If a material still uses the accepted Phase 5 auto-export policy, terminal settlement may export only cargo above the quantity reserved in the manifest. Reserved units remain in their actual staging/module location.

This keeps legacy automatic shipping useful while giving the player a meaningful explicit shipment choice.

## Dispatch

`dispatchShipment` is immediate and deterministic; there is no waiting timer.

It validates the manifest against live physical staging, then for every selected material in stable ID order:

1. removes exactly the reserved quantity from dry staging or the compatible installed handling module;
2. applies the existing market compensation/debt/recovery path;
3. records Corporate Order export progress;
4. updates aggregate exported/flow history;
5. clears the manifest after the whole bounded shipment.

Milestones refresh immediately after a successful dispatch.

## Handling proof

The focused regression covers both:

- solid granules, including reservation from auto-export, save/load and a capacity-limited manual dispatch;
- liquid cargo held in the real liquid terminal dock, proving a manifest never substitutes dry staging for non-solid handling.

A fresh world cannot see or reserve the undiscovered granules listing.

## Scope boundary

#132 does not add imports, market demand memory changes, discovery-created listings or richer directives. Those remain #133–#137; #138 is the integrated Phase 13 exit gate.
