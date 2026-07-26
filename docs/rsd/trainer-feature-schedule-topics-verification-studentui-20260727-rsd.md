# Requirement Satisfaction Document (RSD) - Revision 3

**Feature Title**: Schedule Planned Duration Direct Editing, Topics Studio Sub-tabs (Overview, Resources, Problems, People, Groups, Pending Submissions), and Unified "Assign Topic" Workflow
**Date**: 2026-07-27
**Author**: Antigravity AI Pair Programmer

---

## 1. Problem Description & Intent

1. **Schedule Planned Duration & Overflow**:
   - Planned Duration must be a directly editable input field alongside Start Time and End Time.
   - Editing Planned Duration updates End Time (`Start Time + Planned Duration`), and editing End Time updates Planned Duration (`End Time - Start Time`).
   - Overflow for completed/started sessions is recalculated as `Math.max(0, actualRuntime - plannedDuration)`.

2. **Topics Studio Sub-Navigation & Dedicated Submissions Sub-tab**:
   - The Topics Studio tab needs intuitive sub-tabs for complete topic lifecycle management:
     - `Overview`: Topic Units list & management.
     - `Resources`: Resource library.
     - `Problems`: Problem repository.
     - `People`: Individual student topic assignments & progress.
     - `Groups`: Group topic assignments & progress.
     - `Pending Submissions`: Dedicated sub-tab for reviewing all pending student topic submissions with badge counter (`Pending Submissions (N)`).
   - Button label updated from "Assign topic to group" to **"Assign Topic"**.

---

## 2. Detailed Requirements & Acceptance Criteria

### Requirement 1: Directly Editable Planned Duration & Overflow Sync
- **R1.1**: In `SessionEditDialog` and schedule creation forms, **Planned Duration (Minutes)** MUST be a directly editable `<Input type="number">`.
- **R1.2**: Editing `Planned Duration` MUST automatically update `End Time` (`Start Time + durationMinutes`).
- **R1.3**: Editing `End Time` MUST automatically update `Planned Duration` (`(End Time - Start Time) in minutes`).
- **R1.4**: `overflow_minutes` for started or completed sessions MUST recalculate as `Math.max(0, actualRuntime - plannedDuration)` and update live in preview and backend.

### Requirement 2: Topics Studio Sub-tabs & Dedicated Submissions Tab
- **R2.1**: The Topics Studio navigation MUST feature 6 sub-tabs:
  1. `Overview` (📖 Overview)
  2. `Resources` (📚 Resources)
  3. `Problems` (🎯 Problems)
  4. `People` (👤 People)
  5. `Groups` (👥 Groups)
  6. `Pending Submissions` (🛡️ Submissions [N])
- **R2.2**: The `Pending Submissions` sub-tab MUST display all student topic submissions requiring trainer verification with proof details, feedback input, and 1-click Approve / Reject buttons.
- **R2.3**: The assignment action button MUST be labeled **"Assign Topic"** (supporting target selection between People and Groups).

---

## 3. Scope & Affected Files

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`:
  - Update `SessionEditDialog` and schedule form to make Planned Duration directly editable with bi-directional end time sync and live overflow preview.
  - Update Topics Studio tabs to include `Overview`, `Resources`, `Problems`, `People`, `Groups`, and `Pending Submissions`.
  - Update assignment button text to "Assign Topic".
- `server/src/controllers/classroomController.ts`:
  - Verify `updateClassSession` calculates overflow based on updated `plannedDuration`.

---

## 4. Verification Plan

- **Schedule Editing**: Edit Planned Duration in modal, verify End Time updates automatically. Edit End Time, verify Planned Duration updates automatically. Verify overflow preview updates for completed class.
- **Topics Studio Sub-tabs**: Click through `Overview`, `Resources`, `Problems`, `People`, `Groups`, and `Pending Submissions` sub-tabs in Topics.
- **Pending Submissions Sub-tab**: Submit topic solution as student, switch to trainer Topics -> Submissions tab, review and approve/reject.
- **Build Verification**: Run `npm run lint` and `npm run build` in `client/`.
