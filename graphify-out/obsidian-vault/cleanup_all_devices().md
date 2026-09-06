---
source_file: "backend/app/api/devices.py"
type: "code"
community: "OverlayService"
location: "L714"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/OverlayService
---

# cleanup_all_devices()

## Connections
- [[AsyncSession]] - `references` [EXTRACTED]
- [[PairedDevice_1]] - `uses` [INFERRED]
- [[Removes all paired devices so fresh real devices can register via heartbeat.]] - `rationale_for` [EXTRACTED]
- [[Request]] - `references` [EXTRACTED]
- [[delete]] - `references` [EXTRACTED]
- [[devices.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/OverlayService