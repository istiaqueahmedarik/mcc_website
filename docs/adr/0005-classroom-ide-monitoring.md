# ADR-0005: Classroom IDE Monitoring Data Model

Status: Accepted
Date: 2026-07-25
Task ID: trainer-team-dashboard-ide-monitor-20260725

## Context

Students need a classroom IDE while trainers need to monitor code activity, tab focus, visibility loss, and paste-like behavior. The feature cannot run code yet. Existing classroom permissions distinguish classroom access from trainer/admin management.

## Decision

Store IDE state in two classroom-scoped tables:

- `classroom_ide_sessions`: one latest session snapshot per classroom/student, including class, language, code, focus state, code length, paste count, and timestamps.
- `classroom_ide_events`: append-only activity rows for focus, blur, visibility, paste, large insert, language change, code update, and save-style heartbeat events.

Students can write only their own classroom IDE activity. Trainers/admins can read sessions/events through a management endpoint. The student IDE must show that monitoring is active.

## Consequences

Positive:
- Trainers can inspect current code state and recent events.
- Event history survives refresh.
- Code execution stays out of scope, reducing runner/security risk.
- Monitoring policy is explicit and server-side.

Negative:
- Student code and behavior telemetry now exist in the database.
- Retention rules are not automated yet.
- Paste/large-insert evidence is not proof of misconduct.
- Near-real-time polling is less immediate than WebSockets.

## Alternatives Considered

- Client-only monitor state: rejected because trainers need inspection and audit history.
- WebSocket-only monitor: postponed because existing requirement can be met by polling and server persistence.
- Store every full code snapshot in event rows: rejected to reduce storage; session row stores latest code while events store metadata.
- Add runner backend now: rejected by requirement.

## References

- `docs/rsd/trainer-team-dashboard-ide-monitor-20260725-rsd.md`
- `docs/decisions/trainer-team-dashboard-ide-monitor-20260725-technical-decisions.md`
- `server/src/controllers/classroomController.ts`
- `server/src/utils/dbInit.ts`
