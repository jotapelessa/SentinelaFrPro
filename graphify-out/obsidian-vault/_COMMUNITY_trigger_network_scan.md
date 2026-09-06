---
type: community
cohesion: 0.40
members: 6
---

# trigger_network_scan

**Cohesion:** 0.40 - moderately connected
**Members:** 6 nodes

## Members
- [[BaseModel_2]] - code
- [[ScanPayload]] - code - backend/app/api/scanner.py
- [[Triggers concurrent ONVIF Discovery and verified CCTV port scanner.]] - rationale - backend/app/api/scanner.py
- [[post_2]] - code
- [[scanner.py]] - code - backend/app/api/scanner.py
- [[trigger_network_scan()]] - code - backend/app/api/scanner.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/trigger_network_scan
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_FastAPI]]

## Top bridge nodes
- [[scanner.py]] - degree 3, connects to 1 community