# Optional Problem Difficulty for Trainer Feature Task Plan

- **Author**: Antigravity
- **Date**: 2026-07-27
- **Status**: APPROVED

## Dependency Graph

1. Document approved RSD, technical decisions, and task plan.
2. Update server controller difficulty logic (`server/src/controllers/classroomController.ts`).
3. Update client UI forms, dropdown options, and state initialization (`client/src/app/classroom/live/[id]/ClassroomLiveClient.js`).
4. Update problem difficulty badge rendering in client UI (`client/src/app/classroom/live/[id]/ClassroomLiveClient.js`).
5. Run lint and build verification in `client/`.
6. Record implementation review and update project memory under `docs/knowledge-base/`.

## Tasks

### Task 1: Server Controller Difficulty Handling
- File: `server/src/controllers/classroomController.ts`
- Modify `assignProblem`: allow `difficulty` to be empty string `""` or null instead of defaulting to `"Medium"`.
- Modify `addClassroomTopicProblem`: set difficulty to `normalizeText(difficulty, 80)` without defaulting to `"Medium"` or `"Trainer selected"`.
- Modify `updateClassroomTopicProblem`: set difficulty to `body.difficulty !== undefined ? normalizeText(body.difficulty, 80) : current.difficulty`.
- Modify `bulkAssignProblems`: map empty difficulty to `""`.

### Task 2: Client Form UI & State Initializations
- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Change default `problemDifficulty` state to `""`.
- Change default `topicProblemForm.difficulty` to `""`.
- Add `"None"` (value `""`) option to Live Problem assignment Select dropdown.
- Update `topicDifficultyOptions` array to include `"None"` or handle empty string.
- Update CSV problem import state mapping to default unmapped difficulty to `""`.

### Task 3: Client Problem Display & Badges
- File: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Update problem badges across live problems, challenge cards, and topic problem lists so that if `problem.difficulty` is empty, falsy, or `"None"`, the badge is omitted or shown cleanly without hardcoding `"Medium"` or `"1"`.

### Task 4: Verification & Project Memory
- Run `npm run lint` in `client/`.
- Run `npm run build` in `client/`.
- Verify clean `git diff`.
- Write implementation review document and update project memory in `docs/knowledge-base/`.

## Write Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- `docs/rsd/optional-problem-difficulty-trainer-feature-20260727-rsd.md`
- `docs/decisions/optional-problem-difficulty-trainer-feature-20260727-technical-decisions.md`
- `docs/tasks/optional-problem-difficulty-trainer-feature-20260727-task-plan.md`
- `docs/reviews/optional-problem-difficulty-trainer-feature-20260727-implementation-review.md`
- `docs/knowledge-base/`

## Rollback Plan

- Revert changes to `ClassroomLiveClient.js` and `classroomController.ts`.
- No database migration rollback required.
