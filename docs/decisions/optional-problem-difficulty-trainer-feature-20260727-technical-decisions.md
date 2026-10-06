# Optional Problem Difficulty for Trainer Feature Decisions

- **Author**: Antigravity
- **Date**: 2026-07-27
- **Status**: APPROVED

## Decision 1: Default UI State and Select Options

Initialize problem difficulty state (`problemDifficulty` and `topicProblemForm.difficulty`) to `""` (empty string) instead of `"Medium"`. Add a `"None"` (value `""`) option to difficulty dropdown selects in both live assignment and topic problem forms.

Reason:
- Allows trainers to leave difficulty unselected by default or choose "None" explicitly.
- Keeps form control consistent with standard optional select fields in shadcn/React UI.

## Decision 2: Backend Controller Normalization and Fallbacks

In `server/src/controllers/classroomController.ts`:
- Modify `assignProblem`: allow `difficulty` to be empty string `""` instead of defaulting to `"Medium"`.
- Modify `addClassroomTopicProblem`: set `difficulty` to normalized text or `""` if empty, removing forced default `"Medium"` or `"Trainer selected"`.
- Modify `updateClassroomTopicProblem`: preserve `""` when trainer clears difficulty instead of forcing existing difficulty or `"Trainer selected"`.
- Modify `bulkAssignProblems`: default unmapped row difficulty to `""` instead of `"Medium"`.

Reason:
- Stores explicit trainer intent (empty/unspecified) in PostgreSQL.
- Eliminates hardcoded default difficulty strings at the controller boundary.

## Decision 3: Clean UI Badge and Details Display

In `ClassroomLiveClient.js`:
- Render difficulty badges conditionally: only render difficulty badge if `problem.difficulty` is non-empty and not `"None"`.
- Do not inject hardcoded fallback strings like `"Medium"` or `"1"` into problem list badges when difficulty is empty.

Reason:
- Avoids misleading students or trainers by showing a fake difficulty rating when none was specified.
- Maintains clean, non-cluttered UI layout for unrated problems.

## Decision 4: No Database Migration Required

Do not add schema migrations or alter PostgreSQL tables.

Reason:
- PostgreSQL text columns for `difficulty` already accept `""` or `NULL` natively.
- Zero risk to production schema or existing database rows.
