# 0006 — Append-only history tables and planning records

**Context.** Historical accuracy is a core product principle: moving, reopening or correcting work must not erase what happened.

**Decision.** Status and phase changes insert history rows; planning changes insert `task_plans` rows (initial, moved, carryover, unplanned); the activity timeline is insert-only; manual time edits write before/after audit rows and deletions are soft. History rows denormalise names so renamed or archived configuration still reads correctly.

**Consequences.** Analytics such as carryover rate and cycle time come from real records. Storage grows with activity; acceptable for a personal tool.
