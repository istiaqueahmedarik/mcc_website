# Trainer Feature Futureproof CRUD, Schedule, and Submission Task Plan

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED
- **RSD**: `docs/rsd/trainer-feature-futureproof-crud-schedule-submission-20260727-rsd.md`
- **Decisions**: `docs/decisions/trainer-feature-futureproof-crud-schedule-submission-20260727-decisions.md`

## Dependency Graph

1. Approve RSD and technical decisions.
2. Add server topic CRUD gap endpoints and route bindings.
3. Update client topic state/forms/actions to call approved endpoints.
4. Update group member preview presentation in People and Groups surfaces.
5. Update session edit form to derive duration from end time.
6. Update live challenge submission dialog and trainer/student proof display.
7. Verify client/server and write implementation review/memory updates.

## Tasks

### Task 1: Server Topic CRUD Gap Endpoints

Files:
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`

Work:
- Add handlers for topic resource update/delete.
- Add handlers for topic problem update/delete.
- Add handler to deactivate/unassign a topic assignment.
- Validate manager permission and classroom/topic ownership in every handler.
- Keep topic unit deletion as archive through existing `updateClassroomTopic`.

### Task 2: Client Topic CRUD UI

File:
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

Work:
- Import/use `delete_with_token` and add local patch/update helper only if needed for topic `PATCH`.
- Add topic edit/archive actions and dialog.
- Add resource edit/delete actions and dialog reuse.
- Add problem edit/delete actions and dialog reuse.
- Add assigned group unassign action.
- Refresh topic data after each mutation.

### Task 3: Member Display Futureproofing

File:
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

Work:
- Add local member preview helper/component.
- Replace unbounded member name rendering in People tab Groups list.
- Replace unbounded member badges in Groups tab cards.
- Keep actions in separate fixed/shrink-free area.

### Task 4: Session Edit End Time

File:
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

Work:
- Add `endTime` to edit dialog state only.
- Populate `endTime` from `scheduled_time + duration_minutes` when opening edit dialog.
- Compute `durationMinutes` from start/end on submit.
- Validate end time is after start time.
- Keep create schedule form unchanged.

### Task 5: Link-or-Code Submission and Highlighted Review

Files:
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`

Work:
- Add challenge submission language selector, code textarea, and notes input.
- Require URL or code on client.
- Send `solutionCode` and `submissionNotes` in live challenge submit payload.
- Widen server student proof validation to accept code-only proof while keeping `pending_approval` enforcement.
- Render submitted code through `MarkdownRenderer` with raw HTML disabled; wrap unfenced legacy code for display.

### Task 6: Verification and Review

Files:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`
- `docs/knowledge-base/`

Work:
- Run targeted client lint for changed client file if possible.
- Run server bundle/syntax smoke if possible.
- Run `git diff --check`.
- Document results, residual risks, and implementation review.
- Update knowledge base entries for implemented entry points and quality lessons.

## Write Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`
- `docs/rsd/trainer-feature-futureproof-crud-schedule-submission-20260727-rsd.md`
- `docs/decisions/trainer-feature-futureproof-crud-schedule-submission-20260727-decisions.md`
- `docs/tasks/trainer-feature-futureproof-crud-schedule-submission-20260727-task-plan.md`
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`
- `docs/knowledge-base/`

## Rollback

- Revert listed files.
- No migration rollback required because no database schema change is planned.
