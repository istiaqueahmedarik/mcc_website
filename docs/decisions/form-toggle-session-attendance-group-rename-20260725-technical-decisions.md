# Technical Decisions: Form Toggle, Session Attendance, Session Type/Overflow & Group Rename

- **Document ID**: `docs/decisions/form-toggle-session-attendance-group-rename-20260725-technical-decisions.md`
- **Date**: 2026-07-25
- **Status**: APPROVED (Pending Implementation)

## 1. Form Submission Toggle
- **Schema**: Add `accepting_responses` boolean DEFAULT `true` to `trainer_forms`.
- **API**: Check `accepting_responses` in `submitPublicTrainerForm`. Return 403 error if `false`.
- **UI**: Add an "Accepting Responses" toggle switch on form detail pages and form card actions.

## 2. Session Attendance (5 Presence Levels)
- **Schema**: Create `class_attendance` table:
  - `id`: uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - `classroom_id`: uuid REFERENCES classrooms(id) ON DELETE CASCADE
  - `class_id`: uuid REFERENCES classes(id) ON DELETE CASCADE
  - `student_id`: uuid REFERENCES users(id) ON DELETE CASCADE
  - `status`: text CHECK (`status` IN ('present', 'absent', 'late', 'very_late', 'excused'))
  - `recorded_by`: uuid REFERENCES users(id)
  - `trainer_name`: text
  - `remarks`: text
  - `created_at`, `updated_at`: timestamps
  - UNIQUE(`class_id`, `student_id`)
- **API**:
  - `GET /classroom/:id/class/:classId/attendance`: Returns roster with current attendance state.
  - `POST /classroom/:id/class/:classId/attendance`: Upserts student presence rows and auto-injects `recorded_by` & `trainer_name`.

## 3. Session Type & Duration Overflow
- **Schema**: Add `session_type` text DEFAULT `'onsite'`, `duration_minutes` integer DEFAULT `90`, and `overflow_minutes` integer DEFAULT `0` to `classes`.
- **Overflow Logic**:
  - Live session: `elapsed_minutes = Math.max(0, Math.floor((now - starts_at) / 60000))`.
  - `overflow_minutes = Math.max(0, elapsed_minutes - duration_minutes)`.
  - When stopping class, calculate final `overflow_minutes` and persist to `classes`.

## 4. Group Terminology Renaming
- Keep DB table names (`classroom_teams`, etc.) unchanged to preserve backend schema stability.
- Update all user-facing UI labels, badges, titles, modals, and buttons in `ClassroomLiveClient.js`, `TeamMatrixClient.js`, and `MyDashboardClient.js` from "Team" / "Teams" to "Group" / "Groups".
