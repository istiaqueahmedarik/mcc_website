# Trainer Pre-Enrolled Students Technical Decisions

Status: Approved
Task ID: trainer-pre-enrolled-students-20260727
Last updated: 2026-07-27
Delivery mode: Manual gates

## Gate Results

Gates waited on:
- RSD gate: user approved `docs/rsd/trainer-pre-enrolled-students-20260727-rsd.md` in chat on 2026-07-27.
- Technical decision gate: user approved this package and ADR-0006 in chat on 2026-07-27.

Gates pending:
- Task plan approval.
- Implementation review approval.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-pre-enrolled-students-20260727-rsd.md`
  Used for: approved scope and acceptance criteria.
  Evidence: missing student add/import should open pre-enrollment review, pre-enrolled students must be selectable in trainer workflows, and student access must stay protected.
  Confidence: High.

- Source: `docs/knowledge-base/project-index.md`
  Used for: trainer/classroom entry points and current classroom workflow boundaries.
  Evidence: classroom People, Groups, Live, attendance, and problem workflows are centered on `ClassroomLiveClient.js` and `classroomController.ts`.
  Confidence: High.

- Source: `docs/knowledge-base/patterns.md`
  Used for: CSV mapping and batch-import interaction pattern.
  Evidence: trainer imports should parse locally, map explicitly, preview, then submit one structured batch API call.
  Confidence: High.

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: security and verification constraints.
  Evidence: trainer bulk actions need single-request feedback, role pollution must be blocked, and classroom live should avoid hidden polling.
  Confidence: High.

- Source: `docs/knowledge-base/mistakes.md`
  Used for: avoiding student-roster role pollution.
  Evidence: trainer/admin accounts previously polluted `classroom_students` and broke student-only workflows.
  Confidence: High.

- Source: `server/src/controllers/classroomController.ts`
  Used for: current roster, group, attendance, assignment, and student-access joins.
  Evidence: `classroom_students.student_id` joins `users.id` throughout trainer and student classroom flows.
  Confidence: High.

- Source: `server/src/controllers/authController.ts`
  Used for: signup/login behavior.
  Evidence: signup inserts `users.mist_id`; login currently authenticates by email/password and returns a JWT without classroom-specific access status.
  Confidence: High.

- Source: `server/src/controllers/userController.ts`
  Used for: profile MIST ID update behavior.
  Evidence: `setMistId` updates `users.mist_id` after login, which can create a later pre-enrollment match.
  Confidence: High.

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: People tab, CSV import, group/member selection, attendance, and problem assignment UI.
  Evidence: current component already supports manual/CSV enrollment by email or `mist_id` and uses roster rows as selectable targets.
  Confidence: High.

## Decisions

### TD-001: Use Disabled User Placeholder Rows for Pre-Enrolled Roster Identities

Decision: Create disabled `users` rows for pre-enrolled students instead of using only a separate pending table.

Options considered:
- Pending-only table.
- Normal fake user accounts.
- Disabled user placeholder rows with explicit pre-enrollment status.

Rationale:
Trainer-side workflow tables already reference `users.id`. Disabled placeholder rows satisfy existing joins and selection controls without making the identity login-capable.

Tradeoffs:
The `users` table gains placeholder lifecycle semantics. Login/profile/public reads must treat `is_pre_enrolled` rows as disabled placeholders, not real accounts.

ADR required: Yes. See `docs/adr/0006-classroom-pre-enrolled-student-identities.md`.

### TD-002: Store Classroom Membership State on `classroom_students`

Decision: Add explicit membership state to `classroom_students`: `active`, `pre_enrolled`, and `link_pending`, plus claim metadata.

Proposed fields:
- `enrollment_status text not null default 'active'`.
- `claimed_user_id uuid null`.
- `pre_enrollment_method text null`.
- `pre_enrollment_identifier text null`.
- `pre_enrollment_email text null`.
- `link_requested_at timestamptz null`.

Rationale:
Classroom membership has different meanings for trainer operations and student access. One status field makes those meanings explicit.

Tradeoffs:
Every student-facing access query must filter to active rows. Trainer-facing roster/selection queries must intentionally include all allowed statuses.

ADR required: Yes. See ADR-0006.

### TD-003: Missing Student Review Uses a Separate Confirmation Endpoint

Decision: Existing add/import endpoints should report missing identifiers. A new confirmation endpoint creates pre-enrolled students after the trainer reviews names.

Proposed endpoint:
- `POST /classroom/:id/pre-enroll-students`

Rationale:
Missing-account rows need trainer confirmation and editable names before durable placeholder creation. Separating detection from creation keeps current add/import behavior safe.

Tradeoffs:
UI needs one extra modal and endpoint call when missing students exist.

ADR required: No.

### TD-004: CSV Import Adds Optional Name Mapping, Still Local-First

Decision: Extend existing browser CSV mapping with an optional student-name column and carry that name into missing-student review.

Options considered:
- Require names in CSV for all imports.
- Keep current identifier-only import.
- Optional name mapping with modal fallback.

Rationale:
Trainer can map names when CSV has them, but manual input still works when CSV only contains IDs/emails.

Tradeoffs:
Client preview state grows, but server payloads remain structured and bounded.

ADR required: No.

### TD-005: Student Access Requires Active Real Membership

Decision: Student classroom list/details/problems/topics/board/IDE access must require `classroom_students.enrollment_status = 'active'` for the logged-in real user ID.

Rationale:
Self-entered IDs can be spoofed. Link detection can create `link_pending`, but access must stay blocked until trainer approval or future verified-ID activation.

Tradeoffs:
Access helpers and a few utility modules need careful query updates.

ADR required: Yes. See ADR-0006.

### TD-006: Signup and Profile MIST ID Update Create Pending Claims, Not Access

Decision: When signup or `setMistId` finds pre-enrolled classroom rows by matching `mist_id` or email identifier, create a pending claim by setting `claimed_user_id` and `link_pending`; do not activate access.

Options considered:
- Auto-activate on signup.
- Ignore pre-enrolled rows until trainer manually links.
- Create trainer-reviewable pending claim.

Rationale:
Trainer-reviewable pending claims preserve security while still surfacing account matches automatically.

Tradeoffs:
Trainer needs approve/reject controls. Students may not see the classroom immediately after signup.

ADR required: Yes. See ADR-0006.

### TD-007: Approval Transfers Classroom-Scoped References to the Real Account

Decision: Trainer approval replaces placeholder `student_id` with `claimed_user_id` across classroom-scoped references, then marks membership active. Rejection clears claim metadata and keeps the placeholder pre-enrolled.

Affected relations:
- `classroom_students`.
- `trainer_team_members` for teams in the classroom.
- `class_attendance` for classes in the classroom.
- `class_problems` for classes in the classroom.
- `classroom_topic_problem_progress` for topic assignments in the classroom.

Rationale:
Trainer actions performed before signup should follow the real student account after approval.

Tradeoffs:
Approval needs transactional updates and duplicate-conflict handling.

ADR required: Yes. See ADR-0006.

### TD-008: Runtime Schema Setup is Acceptable for This Repo Shape

Decision: Add a small server-side schema guard for the new columns/indexes because this repository has no migration directory or migration runner.

Rationale:
Existing code already performs targeted `CREATE TABLE IF NOT EXISTS` in controllers where needed. A guarded `ensurePreEnrollmentSchema()` keeps development/test environments from failing on missing columns.

Tradeoffs:
Runtime schema guards are less ideal than formal migrations. Keep them narrow, idempotent, and documented.

ADR required: No.

### TD-009: People Tab Shows Status and Link Actions Locally

Decision: Keep People tab changes local to `ClassroomLiveClient.js`: add status badges, pre-enrollment review modal, and approve/reject controls for link-pending rows.

Rationale:
Existing People, Groups, and CSV code is already local to the page. A new global roster component is unnecessary for this scoped workflow.

Tradeoffs:
The file remains large, but behavior stays easy to trace against existing handlers.

ADR required: No.

## Security and Privacy Notes

- Login must reject `users.is_pre_enrolled = true` rows.
- Student-facing classroom access must never use `claimed_user_id` as access until approval promotes it to active membership.
- Trainer/admin accounts must remain blocked from student enrollment and pre-enrollment.
- CSV data and generated placeholder emails must not be logged.
- Pre-enrolled generated emails should not be displayed as real contact emails; display trainer-supplied email when available.

## Verification Impact

- Targeted lint for `ClassroomLiveClient.js` and any changed auth/profile pages if touched.
- Server type/build verification for `classroomController.ts`, `classroomRoute.ts`, `authController.ts`, `userController.ts`, and `classroomIdeStream.ts` if changed.
- `git diff --check`.
- Manual code audit for student access filters and link approval transfer paths.
