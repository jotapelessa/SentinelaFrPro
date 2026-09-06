---
type: community
cohesion: 0.67
members: 3
---

# Tasks: Integração Frigate NVR 0.17 & go2rtc

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[AsyncSession_2]] - code
- [[Returns application audit logs with newest events at the top (DESC order).]] - rationale - backend/app/api/telemetry.py
- [[get_audit_logs()]] - code - backend/app/api/telemetry.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Tasks_Integração_Frigate_NVR_017__go2rtc
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_apitelemetry.py]]
- 1 edge to [[_COMMUNITY_events.py]]

## Top bridge nodes
- [[get_audit_logs()]] - degree 5, connects to 2 communities