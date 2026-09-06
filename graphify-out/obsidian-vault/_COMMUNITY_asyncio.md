---
type: community
cohesion: 0.16
members: 17
---

# asyncio

**Cohesion:** 0.16 - loosely connected
**Members:** 17 nodes

## Members
- [[dot-__init__()_4]] - code - backend/app/services/pip_gateway.py
- [[dot-check_device_online()]] - code - backend/app/services/pip_gateway.py
- [[dot-dispatch_pip_alert()]] - code - backend/app/services/pip_gateway.py
- [[dot-get_active_tv_devices()]] - code - backend/app/services/pip_gateway.py
- [[dot-is_in_dnd()]] - code - backend/app/services/pip_gateway.py
- [[dot-record_ack()]] - code - backend/app/services/pip_gateway.py
- [[dot-test_single_device()]] - code - backend/app/services/pip_gateway.py
- [[Any_4]] - code
- [[Checks if current time falls in Do Not Disturb period.]] - rationale - backend/app/services/pip_gateway.py
- [[Dispatches Picture-in-Picture or Google Cast notification to registered TVs.…]] - rationale - backend/app/services/pip_gateway.py
- [[Dispatches an interactive test PiP alert to a specific TV using real accessible…]] - rationale - backend/app/services/pip_gateway.py
- [[Fast concurrent non-blocking port check to verify if Smart TV  device is…]] - rationale - backend/app/services/pip_gateway.py
- [[Fetches allowed Android TV  Tablet devices from DB with granular camera &…]] - rationale - backend/app/services/pip_gateway.py
- [[PiPGatewayService]] - code - backend/app/services/pip_gateway.py
- [[Records an execution acknowledgement from a remote device overlay.]] - rationale - backend/app/services/pip_gateway.py
- [[_cast_sync()]] - code - backend/app/services/pip_gateway.py
- [[pip_gateway.py]] - code - backend/app/services/pip_gateway.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/asyncio
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_events.py]]
- 2 edges to [[_COMMUNITY_devices.py]]

## Top bridge nodes
- [[PiPGatewayService]] - degree 10, connects to 2 communities
- [[pip_gateway.py]] - degree 5, connects to 2 communities