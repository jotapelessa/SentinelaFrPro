---
type: community
cohesion: 0.50
members: 4
---

# opencode.json

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[$schema]] - code - .opencode/opencode.json
- [[dot-opencodepluginsgraphify.js]] - concept - .opencode/opencode.json
- [[opencode.json]] - code - .opencode/opencode.json
- [[plugin]] - code - .opencode/opencode.json

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/opencodejson
SORT file.name ASC
```
