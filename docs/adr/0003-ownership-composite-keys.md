# 0003 — Ownership enforced by composite foreign keys plus service checks

**Context.** Users must never reach each other's data, including by guessing UUIDs or through a bug that links a task to a foreign project.

**Decision.** Every user-owned row stores `user_id`. Parents expose unique keys such as `(user_id, workspace_id, id)`, and children reference them with composite foreign keys. Services always filter by the session user and treat foreign rows as not found.

**Consequences.** Two independent layers: a service bug cannot create a cross-account reference because the database rejects it. Slightly wider tables and indexes; acceptable for the guarantee.
