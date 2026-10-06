# Trainer Pre-Enrolled Students RSD

Status: Approved
Task ID: trainer-pre-enrolled-students-20260727
Owner: OpenCode
Last updated: 2026-07-27
Delivery mode: Manual gates

## Mode and Gate Policy

User approved this requirement package in chat on 2026-07-27. Technical decisions, task plan, and implementation review gates remain required before implementation/final merge.

## Task Restatement

Extend trainer classroom People workflows so trainers can add students by Student ID, email, or CSV even when some students do not yet have MCC accounts. Missing students should be converted into pre-enrolled roster entries through a warning/review modal where trainers provide or confirm names. Pre-enrolled students must be selectable in trainer-managed classroom workflows before account creation, while student-facing classroom access remains protected until a secure account link is complete.

## Answers Received

- Trainer wants People tab enrollment to accept Student ID, email, or CSV.
- When added students do not exist as accounts, UI should open a warning modal instead of failing silently or requiring trainer to retry.
- Warning modal should explain that missing students need pre-enrollment.
- Trainer can enter names manually in the modal or map/link names from CSV columns.
- Pre-enrolled students should behave like other roster students for trainer-side selection in groups, attendance, problem assignment, and related classroom management.
- Security concern is accepted: typing another student's ID must not grant immediate student dashboard access to an attacker.

## Assumptions

- "Student ID" means `users.mist_id`.
- CSV import remains browser-local first: upload, map, preview, then server mutation.
- CSV name mapping can use common columns such as `name`, `full_name`, `student_name`, or a trainer-selected column.
- Existing registered student accounts should still be enrolled immediately when lookup succeeds and role is student-only.
- Trainer/admin accounts must remain rejected from student enrollment.
- Pre-enrolled identities need stable internal IDs so existing trainer workflows can select them before account activation.

## Goal

Make classroom roster setup work before all students create accounts, without weakening student classroom access security.

## Non-Goals

- No public invitation-link redesign.
- No email/SMS invitation sending in this task.
- No automatic identity proofing beyond existing or approved MIST ID verification behavior.
- No destructive cleanup of existing `classroom_students` rows.
- No full People tab visual redesign outside add/import/pre-enrollment states.
- No Excel `.xlsx` support.

## Users and Use Cases

- Trainer manually adds one student by Student ID or email and sees a pre-enrollment modal if no account exists.
- Trainer bulk-adds students from CSV, maps Student ID/email and optional name column, then confirms missing students as pre-enrolled roster entries.
- Trainer uses pre-enrolled students in groups, attendance, live problem assignment, topic/team progress views, and roster management before students sign up.
- Student later creates an account using a matching Student ID and can be linked safely to the pre-enrolled classroom identity.
- Trainer can distinguish active students from pre-enrolled or link-pending students in People tab.

## User-Visible Behavior

- People tab manual add keeps lookup method selector: Email or Student ID.
- CSV import adds optional name-column mapping for student pre-enrollment.
- If all submitted identifiers match existing student accounts, current success flow remains straightforward.
- If some submitted identifiers are missing, UI opens a modal listing missing rows.
- Modal shows identifier, lookup method/source, editable student name, and validation errors for blank/duplicate/invalid rows.
- Confirming modal creates pre-enrolled roster entries for valid rows and reports created/skipped/conflict counts.
- People tab roster displays pre-enrolled students with clear `Pre-enrolled` status.
- Pre-enrolled rows are selectable anywhere trainer currently selects enrolled students: group creation/editing, attendance, student-targeted problem assignment, team matrix/analytics filters where applicable.
- Student-facing classroom access is allowed only after account link reaches an active/trusted state.

## Acceptance Criteria

- [ ] Manual People tab add by Student ID or email returns existing matches plus missing identifiers instead of treating all missing rows as terminal failure.
- [ ] Student CSV import supports optional name mapping and carries name data into missing-student review.
- [ ] Missing-student review modal opens only when one or more submitted identifiers do not match existing student accounts.
- [ ] Trainer can edit names for missing students and cannot confirm rows missing required identity/name data.
- [ ] Confirming review modal creates stable pre-enrolled roster entries tied to the classroom and submitted Student ID/email.
- [ ] Pre-enrolled students appear in People tab with a visible status badge and can be removed by trainer using existing/remove-equivalent controls.
- [ ] Pre-enrolled students are selectable in trainer group creation/edit, attendance, and problem assignment flows.
- [ ] Registered active students keep existing behavior and are not duplicated by pre-enrollment rows.
- [ ] Trainer/admin accounts cannot be enrolled or pre-enrolled as classroom students.
- [ ] Student classroom list/details/dashboard access excludes pre-enrolled or untrusted link-pending identities.
- [ ] Account signup/profile update can detect matching pre-enrolled Student ID and move the link into a safe state: verified auto-activation or trainer approval before student access.
- [ ] CSV and batch endpoints keep single-request feedback and avoid per-row network loops.
- [ ] Targeted client lint, server verification, and `git diff --check` pass or document unrelated blockers.

## Constraints

- Preserve existing route auth checks and `canManageClassroom`/student-access boundaries.
- Keep SQL parameterized.
- Keep bulk operations bounded and use one batch request per trainer confirmation.
- Keep new behavior scoped to trainer/classroom enrollment and dependent roster selection flows.
- Maintain role-clean classroom student membership; do not reintroduce trainer/admin roster pollution.
- Avoid hidden polling or focus/visibility refetches in classroom live pages.

## Dependencies

- Client classroom page: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.
- Server classroom controller/routes: `server/src/controllers/classroomController.ts`, `server/src/routes/classroomRoute.ts`.
- Existing roster relation and reads: `classroom_students`, `trainer_teams`, `trainer_team_members`, `class_attendance`, `class_problems`.
- Existing auth/profile signup and MIST ID update flows: `server/src/controllers/authController.ts`, `server/src/controllers/userController.ts`.
- Existing CSV local mapping pattern from trainer bulk import work.

## Risks and Mitigations

- Risk: Impersonation by signing up with another student's ID.
  Mitigation: pre-enrolled/link-pending records must not grant student classroom access until verified Student ID evidence or trainer approval activates link.
- Risk: Creating fake login-capable accounts.
  Mitigation: pre-enrolled identities must be disabled from normal login until claimed/activated through secure account linking.
- Risk: Pre-enrolled rows break current joins that expect full user profile fields.
  Mitigation: provide stable IDs and minimal display fields (`full_name`, `mist_id`, optional `email`) matching existing roster display needs.
- Risk: Duplicate rows when trainer imports same student repeatedly or student signs up after pre-enrollment.
  Mitigation: enforce classroom+identifier uniqueness and merge/link on signup instead of inserting duplicate classroom memberships.
- Risk: Broad `ClassroomLiveClient.js` edits cause UI regressions.
  Mitigation: reuse existing CSV mapping/modal/button feedback patterns and keep changes local.

## Test Expectations

- Run targeted ESLint for changed client files.
- Run server type/build check if available in repo.
- Run `git diff --check`.
- Manually inspect student-access queries for active/trusted status enforcement.
- Manually inspect trainer selection flows for pre-enrolled row compatibility.

## Definition of Done

- [x] Primary RSD approved.
- [x] Technical decision package approved.
- [x] Task plan approved.
- [x] Implementation complete.
- [x] Verification complete.
- [x] Implementation review complete.
- [x] Knowledge base updated.
