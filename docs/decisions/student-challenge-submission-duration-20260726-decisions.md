# Student Challenge Submission and Custom Duration Decisions

- **Author**: OpenCode
- **Date**: 2026-07-26
- **Status**: APPROVED

## Decision 1: Reuse Existing Live Problem Verification Fields

Use existing `class_problems.status`, `solution_link`, `solution_code`, and `submission_notes` columns. No schema change.

Reason:
- Existing controller and prior solution-verification work already support `pending_approval` and solution proof fields for live-class problems.
- Current bug is UI/API policy mismatch, not missing storage.

Rejected:
- Adding a separate submission table. Too broad for one-link proof workflow.

## Decision 2: Student Challenge Modal Submits Link Only

Student Challenge tab modal will request one required submission URL. It will submit `status: 'pending_approval'` and `solutionLink`.

Reason:
- User asked specifically for submission link.
- Topic workflow already has broader code/notes modal; duplicating all fields in live challenges adds scope without need.

## Decision 3: Server Owns Trainer-Only Final Verdicts

For `class_problems`, non-trainer users can update perceived difficulty and submit proof, but cannot directly set `solved`, `tried`, or `not_solved`. Student proof submissions become `pending_approval`.

Reason:
- Client checks alone are not authorization.
- Requirement says only trainer can mark problem as solved/tried/not solved.

## Decision 4: Trainer Uses Existing Status Control With Pending Visibility

Trainer live problem table will include `pending_approval` display, show submitted link when present, and keep the existing status selector for final `solved`, `tried`, and `not_solved` updates.

Reason:
- Minimal UI change.
- Existing trainer status handler already calls the right endpoint as a trainer.

## Decision 5: Duration Is Positive Integer Minutes With DB-Safe Bound Only

Replace preset schedule duration select with number input. Backend will accept positive integer minutes and remove product caps like 180 or 1440. Only database-safe integer bounds remain.

Reason:
- User wants any custom amount.
- `classes.duration_minutes` is an integer; backend must still avoid invalid integer writes.

## Decision 6: No New Polling

Refresh after user actions only by reusing existing `fetchProblems` and `fetchClassroomDetails` calls.

Reason:
- Project quality rule forbids hidden classroom live polling.
