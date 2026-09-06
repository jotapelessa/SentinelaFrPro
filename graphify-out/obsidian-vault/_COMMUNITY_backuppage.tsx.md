---
type: community
cohesion: 0.40
members: 6
---

# backup/page.tsx

**Cohesion:** 0.40 - moderately connected
**Members:** 6 nodes

## Members
- [[dot-emit()]] - code - backend/app/core/logging_handler.py
- [[Captures all logging records in memory for real-time API streaming.]] - rationale - backend/app/core/logging_handler.py
- [[LogRecord]] - code
- [[MemoryRingBufferHandler]] - code - backend/app/core/logging_handler.py
- [[logging_handler.py]] - code - backend/app/core/logging_handler.py
- [[mask_sensitive_data()]] - code - backend/app/core/logging_handler.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/backup/pagetsx
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_manifest.json]]
- 1 edge to [[_COMMUNITY_MseCameraView]]

## Top bridge nodes
- [[MemoryRingBufferHandler]] - degree 4, connects to 1 community
- [[logging_handler.py]] - degree 3, connects to 1 community