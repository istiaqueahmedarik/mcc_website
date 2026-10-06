# Form Submission Toggle, 5-Level Session Attendance, Onsite/Online Session Types, Session Overflow, and Group Terminology RSD

- **Document ID**: `docs/rsd/form-toggle-session-attendance-group-rename-20260725-rsd.md`
- **Date**: 2026-07-25
- **Status**: DRAFT (Awaiting User Approval)

## 1. Problem Statement

1. **Form Submission Toggle**: Trainer forms currently remain open indefinitely when published. Trainers need a toggle to open or close form submissions at will.
2. **Session Attendance**: Live/scheduled sessions lack structured attendance tracking. Trainers need manual session attendance logging with 5 presence levels (`present`, `absent`, `late`, `very_late`, `excused`) auto-mapped with trainer metadata.
3. **Session Type**: Sessions lack explicit delivery mode classification (`onsite`, `online`).
4. **Session Duration & Overflow**: Sessions lack configured duration limits and overflow time calculation when sessions exceed their scheduled duration.
5. **Terminology Renaming**: User-facing copy refers to "Teams", but the domain terminology should be "Groups".

## 2. Requirements

1. **Form Submission Toggle**:
   - Store `accepting_responses` boolean on `trainer_forms`.
   - Allow trainers to toggle responses open/closed on form settings and list views.
   - Block public submission endpoints with a descriptive message when closed.

2. **Session Attendance**:
   - Support 5 presence statuses: `Present`, `Absent`, `Late`, `Very Late`, `Excused`.
   - Auto-map logging trainer details (`recorded_by`, `trainer_name`, `trainer_email`).
   - Provide attendance logging UI in session management.

3. **Session Type**:
   - Support `onsite` and `online` session types in class definitions and UI badges.

4. **Session Duration & Overflow**:
   - Support `duration_minutes` per session.
   - Compute elapsed vs scheduled duration in real-time and display `overflow_minutes` when a session exceeds its duration.

5. **Terminology Renaming**:
   - Rename user-facing "Team" / "Teams" copy to "Group" / "Groups" across classroom interfaces.

## 3. Success Criteria

- Trainers can toggle form submissions open/closed and verify that public submissions are rejected when closed.
- Trainers can submit and view 5-level session attendance for students with auto-mapped trainer info.
- Session cards display Onsite/Online badges and session duration + overflow time alerts when overtime occurs.
- User-facing UI labels consistently say "Group" / "Groups".
- `npm run lint` and `npm run build` pass cleanly.
