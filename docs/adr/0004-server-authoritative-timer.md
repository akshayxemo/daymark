# 0004 — Interval-based, server-authoritative timer

**Context.** Timers must survive refreshes and devices, exclude paused time, and never run twice.

**Decision.** `work_sessions` plus `work_session_intervals`. Start opens an interval, pause closes it, resume opens another, stop closes it and stores the total. A partial unique index allows one running-or-paused session per user; every timer operation locks the user's settings row first. The client displays the server's elapsed value and only advances it locally while running.

**Consequences.** Elapsed time is reproducible from stored timestamps; concurrent starts serialise; clock skew in the browser cannot change recorded effort.
