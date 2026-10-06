# Trainer Team List & Spreadsheet Matrix View Task Plan

Task ID: trainer-team-list-matrix-view-20260725
Owner: Antigravity
Status: In Progress

## Tasks & Dependency Graph

1. [x] **RSD Creation**: Create `docs/rsd/trainer-team-list-matrix-view-20260725-rsd.md` (Approved).
2. [ ] **Classroom Live Client Update**:
   - Refactor `TeamDashboardPanel` in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.
   - Replace inline heavy member focus and problem matrix with clean team summary cards.
   - Add "View Team Matrix" link to `/classroom/live/${classroomId}/teams/${team.id}`.
3. [ ] **Dedicated Team Matrix Route**:
   - Create `client/src/app/classroom/live/[id]/teams/[teamId]/page.js`.
   - Create `client/src/app/classroom/live/[id]/teams/[teamId]/TeamMatrixClient.js` with Google Sheets-style spreadsheet matrix table.
4. [ ] **Verification**:
   - Run `npm run lint` in `client/`.
   - Run `npm run build` in `client/`.
5. [ ] **Post-Implementation Documentation**:
   - Create `docs/reviews/trainer-team-list-matrix-view-20260725-implementation-review.md`.
   - Update `docs/knowledge-base/project-index.md`.
