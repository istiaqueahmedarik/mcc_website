# Task Plan: Trainer Enhancements & Topics Studio Navigation (Revision 3)

**Task ID**: `trainer-feature-schedule-topics-verification-studentui-20260727`
**Target Completion**: 2026-07-27

---

## Task Breakdown

### Phase 1: Directly Editable Planned Duration & Overflow Recalculation
- [ ] Make **Planned Duration (Minutes)** a directly editable number input field in `SessionEditDialog` and schedule creation forms.
- [ ] Connect bi-directional sync:
  - Edit Duration -> End Time updates (`Start Time + Duration`).
  - Edit End Time -> Duration updates (`End Time - Start Time`).
  - Edit Start Time -> End Time updates (`Start Time + Duration`).
- [ ] Compute live overflow preview: `Math.max(0, actualRuntime - plannedDuration)`.

### Phase 2: Topics Studio Sub-tabs & Dedicated Pending Submissions View
- [ ] Add Topics Studio sub-tabs in `ClassroomLiveClient.js`:
  - `Overview`
  - `Resources`
  - `Problems`
  - `People` (Individual student topic assignments)
  - `Groups` (Group topic assignments)
  - `Pending Submissions` (with badge counter e.g. `Submissions (3)`)
- [ ] Build full-width **Pending Submissions** management view inside Topics studio.
- [ ] Rename assignment button to **"Assign Topic"**.

### Phase 3: Verification & Memory Updates
- [ ] Run `npm run lint` in `client/`.
- [ ] Run `npm run build` in `client/`.
- [ ] Update project memory (`docs/knowledge-base/patterns.md`).
