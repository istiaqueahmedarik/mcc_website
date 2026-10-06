# Classroom Live Stop Polling Technical Decisions

Status: Approved
Task ID: classroom-live-stop-polling-20260726
Last updated: 2026-07-26
Delivery mode: Auto

## Decisions

1. Replace classroom live polling/visibility effect with mount/class-selection fetch effects only.
2. Keep explicit refresh/action-driven fetches because trainers still need updates after mutations and manual refresh buttons.
3. Remove IDE heartbeat interval and browser focus/visibility activity posts because they generate background traffic and rerenders unrelated to user action.
4. Keep WebSocket live IDE monitor because it is event-driven, not polling.

## Rationale

The performance issue came from interval and tab-visibility effects, not notification code. Removing those effects prevents tab-return request bursts while preserving intentional user-driven refreshes.
