# Trainer Bulk Import, Feedback, and Notification Removal RSD

Status: Approved
Task ID: trainer-bulk-import-feedback-notifications-20260726
Owner: OpenCode
Last updated: 2026-07-26
Delivery mode: Auto

## Mode and Gate Policy

Manual mode was selected initially. User approved the requirement package, approved the technical decisions, approved the task plan, and requested auto mode for implementation.

## Task Restatement

Improve trainer classroom workflows by adding local CSV bulk input for problem assignment and student enrollment, allowing student enrollment by email or Student ID, adding visible processing feedback to prevent misclicks, and removing classroom notification behavior that causes performance cost while keeping email fields/data.

## Answers Received

- Trainers need CSV bulk input for problem assignment in addition to the current manual method.
- CSV files should be processed locally first, then the trainer maps CSV columns before import.
- Student enrollment should support email and Student ID; trainer chooses the lookup method.
- Student enrollment should also support bulk CSV input from local/USB files.
- Buttons often do not show processing state, causing repeated clicks and confusion.
- Keep email data/display, but remove notification behavior that causes polling/performance issues.

## Assumptions

- "Student ID" means `users.mist_id`.
- "USB bulk input" means selecting a CSV file from a browser file picker; browsers do not expose raw USB device APIs for this use case.
- CSV parsing should happen in the browser before any network mutation.
- Trainer maps uploaded CSV columns through a local dialog before import.
- Notification removal applies to classroom in-app notification creation, broadcast/refetch, bell UI, and notification API routes; it does not remove account emails, user email fields, or password/registration email flows outside classroom notifications.
- Existing manual problem assignment and manual student enrollment remain supported.

## Goal

Trainer classroom workflows should support efficient bulk data entry, safe column mapping, clear action progress feedback, and no classroom notification overhead that degrades performance.

## Non-Goals

- No database schema migration.
- No new CSV parsing dependency unless local parsing proves insufficient.
- No support for Excel `.xlsx` files in this task.
- No removal of email fields from user profiles, rosters, auth flows, or display tables.
- No removal of unrelated team collection or authentication email-sending workflows.
- No redesign of the full trainer classroom page beyond the affected forms/dialogs/buttons.

## Users and Use Cases

- Trainer imports many student enrollments from a CSV exported from another system.
- Trainer assigns many problems to students/groups from a CSV rather than entering one problem at a time.
- Trainer chooses whether a student identifier column represents email or Student ID.
- Trainer sees immediate loading/success/error feedback after clicking an async action.
- Student and trainer users no longer pay the cost of classroom notification write/broadcast/refetch behavior.

## User-Visible Behavior

- Student panel offers manual enrollment by Email or Student ID.
- Student panel offers CSV import with mapping and preview before enrollment.
- Problem assignment panel offers CSV import with mapping and preview before assignment.
- CSV upload does not mutate server data until the trainer confirms mapped rows.
- CSV previews show valid rows, skipped rows, missing required fields, unknown targets, and duplicate rows where practical.
- Bulk import shows one loading state and one final success/failure result.
- Touched buttons disable while their request is running and show processing text/spinner.
- Classroom notification bell is removed from the navbar.
- Classroom notification APIs and server-side creation/broadcast work stop running.

## Acceptance Criteria

- [x] Manual student enrollment supports email lookup and Student ID lookup.
- [x] Student CSV import is local-first: upload, map columns, preview, then confirm.
- [x] Student CSV import sends one bulk request instead of one request per row.
- [x] Problem CSV import is local-first: upload, map columns, preview, then confirm.
- [x] Problem CSV import supports platform, problem link, target type, target identifier, timer, difficulty, and tags.
- [x] Problem CSV import reuses existing manual assignment behavior for successful rows and preserves server authorization checks.
- [x] Trainer-visible actions touched by this work use loading/disabled/success/error feedback.
- [x] Classroom notification bell, notification client route handlers, server notification routes, and classroom notification creation/broadcast/email side effects are removed or disabled.
- [x] Email fields remain visible where already shown in profile/roster/trainer UI.
- [x] Targeted client lint, server type/build check where feasible, and `git diff --check` pass or document unrelated blockers.

## Constraints

- Preserve existing route auth checks.
- Keep SQL parameterized.
- Keep changes scoped to trainer/classroom surfaces named in this RSD.
- Avoid repeated per-row network requests for bulk workflows.
- Keep CSV parsing small and readable inside client code or a local helper.

## Dependencies

- Existing classroom trainer page: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.
- Existing classroom controller/routes: `server/src/controllers/classroomController.ts`, `server/src/routes/classroomRoute.ts`.
- Existing user fields: `users.email`, `users.mist_id`.
- Existing Sonner toaster mounted in `client/src/app/layout.js`.

## Risks and Mitigations

- Risk: CSV parsing mishandles quoted commas.
  Mitigation: implement quoted-field parsing and preview errors before import.
- Risk: bulk assignment creates too many duplicate rows.
  Mitigation: deduplicate identical imported rows client-side and server-side where practical.
- Risk: notification removal breaks navbar import references.
  Mitigation: remove `NotificationBell` usage and stale route/controller imports together.
- Risk: broad edits in `ClassroomLiveClient.js` cause regressions.
  Mitigation: keep new helpers local and verify changed file with targeted lint.

## Test Expectations

- Run targeted ESLint for changed client files.
- Run server build/type check command available in this repo.
- Run `git diff --check`.
- Manually inspect changed handlers for loading-state cleanup on success and failure.

## Definition of Done

- [x] Primary RSD approved.
- [x] Technical decision package approved.
- [x] Task plan approved.
- [x] Implementation complete.
- [x] Verification complete.
- [x] Implementation review complete.
- [x] Knowledge base updated.
