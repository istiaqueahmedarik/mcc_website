# Trainer Student Roster Apple Redesign Implementation Review

Status: Approved
Task ID: trainer-student-roster-apple-redesign-20260809
Owner: Codex
Last updated: 2026-08-09

## Reviewer Flow

Start with `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.

1. Imports and helpers add `framer-motion`, `Checkbox`, roster search/sort helpers, `PeopleModeSwitch`, `PeoplePanelMotion`, picker lists, and shared read-only roster rows.
2. Component state splits People batching and search into trainer students, trainer groups, student groups, and classmates. Dialog state now owns add-students, create-group, edit-members, and remove-student confirmation flows.
3. Existing mutation handlers keep their endpoint strings. Removal now runs through a controlled dialog, group creation closes its dialog on success, and group member update uses Sonner feedback instead of a browser alert.
4. The trainer People tab is now one full-width workspace with Students/Groups inner switcher, quiet toolbar, search, counts, soft list surfaces, Add Students dialog, Create Group dialog, Edit Members dialog, and removal confirmation.
5. The student People tab is now a Groups/Classmates inner switcher. Groups containing the current student sort first, classmates reuse the shared read-only row, and no trainer actions are present.

## Requirement Review

| Before | After | Why |
| --- | --- | --- |
| Two side-by-side bordered Cards always exposed enrollment, CSV, pre-enrollment, group creation, group editing, and long lists. | One full-width People workspace with a Students/Groups switcher and one toolbar per view. | Reduces visual constraint and keeps one task visible at a time. |
| Roster rows used border-heavy nested sections and an always-visible red trash action. | Soft list surface, subtle separators, status labels, link-pending action lane, and removal behind overflow plus confirmation. | Improves scan speed and keeps destructive action visually quiet until requested. |
| Single add form and CSV import lived together on the page. | Add Students dialog has Single and CSV modes; missing accounts still continue to pre-enrollment review. | Applies progressive disclosure while preserving the existing enrollment flow. |
| Group creation and edit member selection were always visible or inline inside rows. | Create Group and Edit Members are focused dialogs with searchable checkbox lists and selected counts. | Keeps dense member selection out of the main list without changing group endpoints. |
| Student Group & Roster rendered bordered group cards and bordered classmate cards together. | Student view defaults to Groups, prioritizes the student's own groups, and switches to a shared Classmates list. | Matches the student mental model: my group first, roster second. |
| One shared `visiblePeopleCount` expanded students and groups together. | Separate show-more state for trainer students, trainer groups, student groups, and classmates. | Prevents one list's density from changing another list. |
| No People view motion discipline existed. | Existing `framer-motion` wraps only inner panel transitions with `MotionConfig reducedMotion="user"` and no keyboard-triggered movement. | Keeps the view switch spatial for pointer users while respecting repeated keyboard use and reduced motion. |

## Files Changed

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `docs/rsd/trainer-student-roster-apple-redesign-20260809-rsd.md`
- `docs/decisions/trainer-student-roster-apple-redesign-20260809-technical-decisions.md`
- `docs/tasks/trainer-student-roster-apple-redesign-20260809-task-plan.md`
- `docs/reviews/trainer-student-roster-apple-redesign-20260809-implementation-review.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/quality-rules.md`
- `docs/knowledge-base/hci-rules.md`
- `docs/knowledge-base/doc-usage.md`

## Verification

- `npx eslint 'src/app/classroom/live/[id]/ClassroomLiveClient.js'`: passed.
- `npm run lint` in `client/`: passed with 10 existing warnings outside this task.
- `npm run build` in `client/`: passed.
- `git diff --check`: passed.

## Residual Risk

- Authenticated browser visual QA with real trainer/student roster data was not run in this environment. The production build proves compilation and route generation, but final visual judgment should still be checked in a real logged-in classroom with long rosters and pending links.
- The worktree already contained unrelated Discord/classroom changes. This review treats those as user-owned and verifies that this task preserves the Discord additions in `ClassroomLiveClient.js`.
