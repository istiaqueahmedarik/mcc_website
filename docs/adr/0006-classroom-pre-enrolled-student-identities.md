# ADR-0006: Classroom Pre-Enrolled Student Identities

Status: Accepted
Date: 2026-07-27
Task ID: trainer-pre-enrolled-students-20260727

## Context

Trainers need to add students to classroom rosters before those students create MCC accounts. Those pre-enrolled students must be selectable in existing trainer workflows including groups, attendance, problem assignment, and analytics. Current classroom workflow tables reference `users.id` through `classroom_students`, `trainer_team_members`, `class_attendance`, `class_problems`, and topic progress tables. Current student access checks also use `classroom_students`, so pre-enrollment must not accidentally grant classroom access to someone who self-enters another student's ID during signup.

## Decision

Represent pre-enrolled students as disabled roster identity rows in `users`, plus explicit enrollment/link state on `classroom_students`.

Storage:
- `users.is_pre_enrolled boolean not null default false` identifies disabled placeholder roster identities.
- Placeholder `users` rows use trainer-provided `full_name`, optional `mist_id`, generated internal email, random password hash, `trainer=false`, `admin=false`, and `granted=false`.
- `classroom_students.enrollment_status` stores `active`, `pre_enrolled`, or `link_pending`.
- `classroom_students.claimed_user_id` points to a real account that requested/appears to match a pre-enrolled row.
- `classroom_students.pre_enrollment_method`, `pre_enrollment_identifier`, and optional `pre_enrollment_email` preserve trainer-submitted lookup data for review and display.

Access model:
- Trainer-side roster and selection flows can include `active`, `pre_enrolled`, and `link_pending` rows.
- Student-side classroom list/details/problems/topics/board/IDE access requires `enrollment_status = 'active'` for the logged-in real `users.id`.
- `users.is_pre_enrolled = true` rows are not login-capable.

Claim model:
- Signup or profile MIST ID update can detect matching pre-enrolled rows by normalized `mist_id` or email identifier.
- Detection sets `classroom_students.enrollment_status = 'link_pending'` and `claimed_user_id = real_user_id`; it does not grant classroom access.
- Trainer approves a pending claim before student access becomes active unless a future verified-ID process explicitly permits auto-activation.
- Approval transfers classroom-scoped references from placeholder `student_id` to claimed real user ID, then marks membership active.
- Rejection clears the pending claim and returns row to `pre_enrolled`.

## Options Considered

1. Separate `pending_classroom_students` table only.
   Good for security but not enough for current trainer selection workflows because many tables and UI components expect `users.id`.

2. Fake normal `users` account only.
   Easy for joins but unsafe because it blurs login/account semantics and could grant access if signup overwrites the same row.

3. Disabled `users` placeholder plus explicit `classroom_students` status and claim metadata.
   Fits existing joins while preserving a hard access boundary.

## Consequences

Positive:
- Existing trainer selection code can keep using student IDs from `users`.
- Pre-enrolled students can appear in groups, attendance, live progress, and problem assignment before account creation.
- Student access checks become explicit about active membership.
- Trainer approval prevents unverified ID impersonation from revealing classroom data.

Negative:
- Account linking requires transfer logic for classroom-scoped references on approval.
- More access queries must filter by `enrollment_status = 'active'` for student-side access.
- Placeholder rows add lifecycle states to `users`, so login and public/profile reads must avoid treating placeholders as normal accounts.

## Security Notes

- Never grant classroom access from a self-entered Student ID alone.
- Login must reject `is_pre_enrolled` placeholder accounts.
- Trainer/admin accounts remain invalid student roster members.
- Generated placeholder emails must not be exposed as real contact addresses when trainer supplied an external email.

## Rollback

Keep `active` rows as normal classroom memberships. Pre-enrolled/link-pending rows can be removed from `classroom_students`; placeholder `users.is_pre_enrolled = true` rows can be archived or deleted if no classroom references remain.
