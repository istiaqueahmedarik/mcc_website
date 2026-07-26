# Trainer Live Progress Design Refresh Task Plan

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## Dependency Graph

1. Add local derived summary counts from `problems`.
2. Refresh Live progress section body layout.
3. Move submitted proof link treatment into action/status area.
4. Verify client lint and inspect UI risk.

## Tasks

### Task 1: Add Summary Counts

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Derive total, pending, solved, tried, and not-solved counts from existing `problems`.

### Task 2: Refresh Table Shell

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Replace narrow min-width table feel with full-width table classes.
- Improve header, row hover, column widths, and text hierarchy.

### Task 3: Improve Row Actions

- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Move `Review submission` link into a clean action chip/button.
- Keep Notes & Hints dialog trigger and status select behavior unchanged.

### Task 4: Verification And Review

- Run `npm run lint` in `client/`.
- Run `git diff --check` for touched files.
- Write implementation review and update knowledge-base entries.

## Write Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `docs/rsd/trainer-live-progress-design-refresh-20260727-rsd.md`
- `docs/decisions/trainer-live-progress-design-refresh-20260727-decisions.md`
- `docs/tasks/trainer-live-progress-design-refresh-20260727-task-plan.md`
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`
- `docs/knowledge-base/`

## Rollback

- Revert listed files.
- No migration rollback needed.
