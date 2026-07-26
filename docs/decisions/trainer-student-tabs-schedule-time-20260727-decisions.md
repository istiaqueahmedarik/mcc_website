# Trainer Student Tabs And Schedule Time Decisions

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## Decision 1: Keep Student Tab Values Stable

Reorder `TabsTrigger` elements and labels without renaming tab values or content keys.

Reason:
- Minimizes behavior risk in `ClassroomLiveClient.js`.
- Existing state uses stable values such as `topics`, `challenges`, `live`, `people`, and `attendance-summary`.

## Decision 2: Normalize Datetime-Local On Submit

Convert `datetime-local` input values to ISO strings before POST requests for schedule create/edit.

Reason:
- `datetime-local` has no timezone. Converting on the client captures the trainer browser's intended local time as an absolute timestamp.
- Existing display code can continue using `Date` parsing and local display.

## Decision 3: Validate And Normalize On Server

Add a small local server helper in `classroomController.ts` that parses scheduled time input and returns `toISOString()`.

Reason:
- Server should reject invalid scheduled time payloads and store one consistent timestamp shape.
- Keeps the fix local to schedule endpoints without schema changes.

## Decision 4: No Schema Migration

Do not change `classes.scheduled_time` column type or run data backfills.

Reason:
- User asked for bug fix, not historical migration.
- Current create/edit path can prevent new drift without risking existing production data.
