---
type: community
cohesion: 0.67
members: 3
---

# app/build.gradle.kts

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[AsyncSession_3]] - code
- [[Returns application audit logs with newest events at the top (DESC order).]] - rationale - backend/app/api/telemetry.py
- [[get_audit_logs()]] - code - backend/app/api/telemetry.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/app/buildgradlekts
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_MseCameraView]]
- 1 edge to [[_COMMUNITY_TvNetflixScreen.kt]]

## Top bridge nodes
- [[get_audit_logs()]] - degree 5, connects to 2 communities