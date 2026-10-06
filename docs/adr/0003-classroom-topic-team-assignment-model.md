# ADR-0003: Classroom Topic Team Assignment Model

Status: Accepted
Date: 2026-07-25
Task ID: classroom-team-topic-board-chat-20260725

## Context

Trainer topic assignment must support prebuilt topics with resources and problems, assign those topics to teams, and avoid forcing team assignments into an active class. Existing `class_problems` rows are tied to a `class_id` and a `student_id`, so making team topics fit there would weaken current class-session assumptions.

## Decision

Use classroom-scoped topic tables plus team-topic assignment rows and sparse per-student progress rows.

Topics, resources, and problems live under a classroom. Team assignments point to a topic and team. Student progress is stored only when a student or trainer changes a topic problem status; missing progress means `not_solved`.

## Consequences

Positive:
- Keeps existing class problem/history behavior stable.
- Supports topic assignments that are not fixed to a class.
- Handles new team members by projecting assignments through current team membership.
- Keeps analytics derived from source status rows.

Negative:
- Topic libraries are not automatically reusable across classrooms.
- Old progress rows can remain after team membership changes and must be filtered carefully.
- New endpoints and access checks are required.

## Alternatives Considered

- Global topic catalog: postponed because it needs ownership, moderation, import, and visibility rules.
- Trainer-wide topic catalog: postponed because current authorization is classroom-centered.
- Nullable `class_problems.class_id`: rejected because it blurs live class history semantics.
- Eager materialized per-student rows: rejected because team membership changes would create drift.

## References

- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`
- `server/src/utils/dbInit.ts`
- `server/src/controllers/classroomController.ts`
