# Trainer Feature Futureproof CRUD, Schedule, and Submission Implementation Review

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED
- **RSD**: `docs/rsd/trainer-feature-futureproof-crud-schedule-submission-20260727-rsd.md`
- **Decisions**: `docs/decisions/trainer-feature-futureproof-crud-schedule-submission-20260727-decisions.md`
- **Task plan**: `docs/tasks/trainer-feature-futureproof-crud-schedule-submission-20260727-task-plan.md`

## Scope Reviewed

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`
- Planning and knowledge-base docs for this task.

## Requirement Satisfaction

- People/Groups member displays now use bounded `MemberPreview` rendering with counts, a limited visible subset, and show-all/show-less controls. Group actions stay in separate toolbar areas.
- Session edit now shows start time and end time, derives positive duration minutes on submit, and sends the existing `durationMinutes` field. Schedule creation remains start time plus duration.
- Topics tab now supports topic edit/archive/restore, resource edit/remove, problem edit/remove, and assigned group unassign actions.
- Live Challenge proof submission now accepts a public URL or pasted code. Students select language, enter code/notes, and submissions still go to `pending_approval`.
- Trainer review surfaces now show submitted code through `MarkdownRenderer` with raw HTML disabled, preserving syntax highlighting for fenced code.

## Security and Data Review

- Server topic CRUD endpoints require `canManageClassroom` and validate classroom/topic ownership before mutation.
- Topic assignment unassign archives the assignment row instead of deleting progress history.
- Topic problem delete is blocked once student progress exists.
- Student live challenge status still cannot self-finalize to `solved`; code-only proof only widens accepted proof input for `pending_approval`.
- Submitted code is bounded server-side and rendered as markdown with raw HTML disabled.

## Verification

- Passed: `npx eslint --no-error-on-unmatched-pattern "src/app/classroom/live/\\[id\\]/ClassroomLiveClient.js"` in `client/`.
- Passed: `bun build src/index.ts --target=bun --outdir .codex-build` in `server/`.
- Passed: `git diff --check`.

## Residual Risks

- Topic problem update does not refetch external metadata when changing a problem URL; trainers can edit title/difficulty manually.
- Code language is stored inside `solution_code` as a fenced markdown convention because the database is intentionally unchanged.
- Manual browser verification is still recommended for topic CRUD dialogs and large group visual layout.

## Implementation Review Result

No blocking findings found in the scoped implementation review.
