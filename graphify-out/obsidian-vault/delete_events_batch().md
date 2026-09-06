---
source_file: "backend/app/api/events.py"
type: "code"
community: "events.py"
location: "L255"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/eventspy
---

# delete_events_batch()

## Connections
- [[AsyncSession]] - `references` [EXTRACTED]
- [[Deletes multiple events in batch with strict concurrency throttling (max 5…]] - `rationale_for` [EXTRACTED]
- [[EventBatchDeleteRequest]] - `references` [EXTRACTED]
- [[EventRecord]] - `uses` [INFERRED]
- [[Request]] - `references` [EXTRACTED]
- [[delete]] - `calls` [EXTRACTED]
- [[delete_events_by_date()]] - `calls` [EXTRACTED]
- [[events.py]] - `contains` [EXTRACTED]
- [[post]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/eventspy