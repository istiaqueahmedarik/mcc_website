# Trainer Student Roster Apple Redesign RSD

Status: Approved
Task ID: trainer-student-roster-apple-redesign-20260809
Owner: Codex
Last updated: 2026-08-09
Delivery mode: Direct implementation after user-approved plan

## Task Restatement

Redesign the classroom People feature so trainer roster and group management feel calmer, less bordered, and less visually constrained. Trainers should work in a focused Students/Groups workspace, while students should see a restrained Groups/Classmates view. Existing data visibility, endpoint strings, authorization, routes, enrollment statuses, and Group/Groups terminology must remain unchanged.

## User Goals

- Reduce nested borders and visual constraint in the trainer student feature.
- Separate dense information into focused views and dialogs.
- Follow Apple's current interface direction: scan-friendly lists, progressive disclosure, controls near affected content, restrained material, and reduced-motion respect.
- Use the already-installed Framer Motion package only when motion helps the view switch feel spatial.

## In Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` People tab presentation and local helper extraction.
- Trainer Students/Groups focused switcher, local search, count, add/create dialogs, scan-friendly rows, and accessible removal confirmation.
- Student Groups/Classmates focused switcher with own-group prioritization and shared calm roster rows.
- RSD, technical decision, task plan, implementation review, and knowledge-base updates.

## Out of Scope

- Public API, server route, schema, authentication, authorization, or dependency changes.
- Broad classroom tab redesign, thread/updates/attendance/topic/live/session redesign, global token changes, or design-system extraction.
- Changing roster visibility semantics for pre-enrolled, link-pending, or active students.
- Adding `react-motion` or any new animation dependency.

## Requirements

- Preserve outer tab values, tour IDs, endpoint strings, handlers, and mutation behavior.
- Default trainer inner view to Students; default student inner view to Groups.
- Use one quiet toolbar per inner view with search, low-emphasis count, and at most one primary action.
- Render rosters as soft list surfaces with subtle separators instead of nested bordered cards.
- Sort trainer roster rows as link-pending, pre-enrolled, active.
- Surface link-pending rows as a compact attention group with Approve/Reject actions.
- Move single add, CSV import, group creation, and group member editing into focused dialogs.
- Keep pre-enrollment review behavior and security copy.
- Preserve bounded member previews for groups.
- Split people batching so loading more students does not load more groups and vice versa.
- Use `MotionConfig reducedMotion="user"` and `AnimatePresence initial={false}` for pointer-initiated inner panel transitions only.
- Keep keyboard-triggered switch updates instant.

## Acceptance Criteria

- Trainers can add one student, import CSV, pre-enroll missing students, approve/reject pending links, remove students through confirmation, create groups, and edit group members.
- Students can scan their groups and classmates without trainer controls or newly exposed data.
- Empty, loading-by-action, long content, mobile, mini-laptop, desktop, and large-list states remain usable.
- Keyboard users can operate switchers, dialogs, menus, checkboxes, and destructive confirmation with visible focus and focus-managed primitives.
- Reduced-motion users do not receive transform-based panel movement.
- Targeted client lint, full client build, and `git diff --check` pass or documented blockers are recorded.

## Sources Used

- `AGENTS.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/quality-rules.md`
- `docs/knowledge-base/hci-rules.md`
- `docs/rsd/trainer-pre-enrolled-students-20260727-rsd.md`
- Apple Human Interface Guidelines: lists and tables, disclosure controls, materials, UI design tips
- Vercel Web Interface Guidelines
- Motion for React documentation through Context7
