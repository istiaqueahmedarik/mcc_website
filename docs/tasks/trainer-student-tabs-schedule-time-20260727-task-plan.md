# Trainer Student Tabs And Schedule Time Task Plan

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## Dependency Graph

1. Document approved RSD, decisions, and task plan.
2. Update student tab order and tour copy.
3. Add client schedule timestamp submit helper.
4. Add server schedule timestamp normalizer.
5. Verify changed client and server files.
6. Write implementation review and update knowledge base.

## Tasks

### Task 1: Student Tab Order

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Reorder student `TabsTrigger` list to `Topics`, `Challenges`, `Live Sessions & IDE`, `Group & Roster`, `Attendance`.
- Reorder student tour steps to match.

### Task 2: Client Schedule Timestamp Normalization

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Add helper that converts a `datetime-local` value to `Date#toISOString()`.
- Use it in schedule create and session edit submit payloads.
- Preserve `toDatetimeLocalValue` for edit form display.

### Task 3: Server Schedule Timestamp Normalization

- File: `server/src/controllers/classroomController.ts`
- Add helper that validates scheduled time and returns ISO string.
- Use it in `scheduleClass` and `updateClassSession`.

### Task 4: Verification And Review

- Run targeted client lint for `ClassroomLiveClient.js` if possible.
- Run server build smoke for touched server code if possible.
- Run `git diff --check`.
- Record implementation review and knowledge-base entries.

## Write Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- `docs/rsd/trainer-student-tabs-schedule-time-20260727-rsd.md`
- `docs/decisions/trainer-student-tabs-schedule-time-20260727-decisions.md`
- `docs/tasks/trainer-student-tabs-schedule-time-20260727-task-plan.md`
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`
- `docs/knowledge-base/`

## Rollback

- Revert listed files.
- No migration rollback needed.
