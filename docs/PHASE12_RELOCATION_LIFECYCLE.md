# Phase 12 relocation cost, downtime and reconnection

Issue #128 makes intact relocation strategically meaningful without rebuilding the factory interior.

The site content authors a fuel cost per Manhattan relocation step and a downtime duration. Fuel is an operating resource rather than conserved material inventory, so relocation introduces no silent material sink.

A successful move persists optional factory relocation truth with start/ready ticks and the exact external connection identities that existed immediately before the move. Older saves and factories that have never relocated omit this field; no schema-version bump is required.

Connection requirements use stable port identity plus the implemented transport medium: solid belt, liquid pipe or gas pressure line. Unused ports create no synthetic blocker. External source-side logistics remain where they were.

All processors, internal pumps and compressors stay suspended while the relocation lifecycle is pending. Save validation rejects impossible enabled equipment under a relocation hold. After downtime elapses, restart is still refused until every recorded medium is physically reconnected to the same port at its new world position. Partial reconnection remains blocked.

The first successful restart of any internal processor, pump or compressor clears the relocation hold only after both gates pass.

#128 does not add district switching/shared-feed policy; that remains #129+.
