# Student Challenge Submission and Custom Duration Task Plan

- **Author**: OpenCode
- **Date**: 2026-07-26
- **Status**: APPROVED

## Dependency Graph

1. Server status policy must be updated before client can rely on trainer-only final verdicts.
2. Student modal can then submit `pending_approval` safely.
3. Trainer table pending visibility depends on existing `solution_link` returned by class problem fetches.
4. Duration UI and server normalization are independent and can be implemented after status flow.
5. Verification runs after all code changes.

## Tasks

### Task 1: Harden Live Problem Status API

- File: `server/src/controllers/classroomController.ts`
- Replace direct student status updates with trainer-owned final verdict logic.
- Let students submit `pending_approval` only when a non-empty submission link is provided.
- Let students update `student_difficulty` without changing status.
- Keep trainer/admin/substitute trainer direct status updates.

### Task 2: Add Student Challenge Submission Modal

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Replace Challenge tab `handleToggleStatus` use with modal state/handler.
- Modal collects required submission URL.
- Submit to `classroom/problem/:id/status` with `status: 'pending_approval'` and `solutionLink`.
- Refresh active class problems after success.

### Task 3: Make Pending Submissions Visible To Trainers

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Show `pending_approval` in trainer live problem status select.
- Render submitted link in trainer problem table when present.
- Preserve trainer ability to choose `solved`, `tried`, or `not_solved`.

### Task 4: Make New Session Duration Custom

- Files:
  - `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  - `server/src/controllers/classroomController.ts`
- Replace schedule duration preset select with number input.
- Remove backend 1440-minute product cap; keep positive integer normalization and DB-safe bound.
- Remove edit dialog `max="1440"`.

### Task 5: Verify

- Run `npm run lint` in `client/`.
- Run narrow server syntax/type verification if available.
- Inspect diff for authorization, data exposure, input validation, and no hidden polling.

## Write Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- Documentation/knowledge-base artifacts under `docs/`

## Rollback

- Revert changes in listed files.
- No migration rollback required.
