# ADR-0007: Classroom Problem Thread and Update Model

Status: Accepted
Date: 2026-07-28
Task ID: trainer-updates-problem-threads-20260728

## Context

The classroom feature needs to remove generic messaging and replace it with scoped per-problem threads, a first-tab Updates view, user-managed priority ordering, and classroom update email settings. Previous classroom notification infrastructure was removed for performance, and classroom live views must not reintroduce polling, visibility refetch bursts, or global notification broadcasts.

The system already has separate live class problem and topic problem workflows. Live problems use `class_problems`; topic problems use classroom topic assignment and progress tables. Student submissions and trainer verification already exist and must remain the source of truth.

## Decision

Use a dedicated problem-thread and update model:

- Updates are computed on mount or explicit refresh through `GET /classroom/:id/updates`.
- User classroom update preferences live in `user_settings` under classroom-specific fields.
- Read state lives in per-user classroom update read receipts keyed by stable server-generated update keys.
- Thread storage uses explicit thread/message/reaction tables.
- A thread references either a live class problem or a topic assignment plus topic problem.
- Existing submission and verification APIs remain authoritative.
- Successful submissions, trainer feedback, and status changes mirror structured events into the relevant thread.
- Email is sent only for event-backed classroom updates unless a future approved decision adds deduplicated time-exceeded email events.
- Generic classroom chat UI/routes are removed without destructive table drops in unrelated runtime helpers.
- Threads are reachable from problem cards/lists and authenticated problem-surface deep links; Updates remains a notification/read-state feed without thread launch actions. Server authorization remains the gate for every read/post/reaction.

## Consequences

Positive:
- The classroom has one clear communication model: problem-scoped threads.
- Authorization can be precise for trainer, target student, and assigned topic group members.
- Updates remain low overhead and do not revive polling/broadcast notifications.
- Email settings do not affect auth, password, or non-classroom emails.
- Existing submission logic stays centralized.
- Read/unread state works across refreshes and devices without reintroducing a global notification bell.

Negative:
- Updates are not realtime unless the user refreshes or performs an action.
- Time-exceeded is visual-only in the first release unless a deduplication model is approved.
- The schema is more explicit than a single loose `problem_id` text field.
- Deep-link handling adds some client complexity in the classroom live page.

## Alternatives Considered

- Reuse old `classroom_messages`: rejected because generic chat semantics conflict with per-problem scope and prior removal.
- Store thread messages with `problem_id text` and `problem_type`: rejected because authorization and referential integrity are too easy to get wrong.
- Send time-exceeded emails on page load: rejected because it can spam recipients and adds hidden side effects to a performance-sensitive load path.
- Add realtime notification infrastructure: rejected because the user explicitly asked to avoid polling/slowdowns and prior notification infrastructure was removed for performance.
- Client-only read state: rejected because it would not persist across refreshes or devices.
- Global thread inbox: rejected because it would recreate a generic messaging surface instead of keeping discussion problem-scoped.

## References

- `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`
- `docs/decisions/trainer-updates-problem-threads-20260728-technical-decisions.md`
- `docs/decisions/classroom-live-stop-polling-20260726-technical-decisions.md`
- `docs/decisions/trainer-bulk-import-feedback-notifications-20260726-technical-decisions.md`
