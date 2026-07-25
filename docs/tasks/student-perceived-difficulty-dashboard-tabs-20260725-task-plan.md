# Task Plan & Dependency Graph

- **Feature**: `student-perceived-difficulty-dashboard-tabs-20260725`
- **Date**: 2026-07-25

---

## Dependency Graph

```
[Phase 1: Database Migration & Controllers]
       |
       v
[Phase 2: Student Dashboard Tabbed Layout & Difficulty Rating UI]
       |
       v
[Phase 3: Team Matrix Integration for Student Perceived Difficulty]
       |
       v
[Phase 4: Lint, Build Verification & Implementation Review]
```

---

## Execution Phases

### Phase 1: Database Schema & API Controllers
- Update `server/src/utils/dbInit.ts` to add `student_difficulty` columns to `classroom_topic_problem_progress` and `class_problems`.
- Update `server/src/controllers/classroomController.ts` handlers (`updateClassroomTopicProblemProgress`, `updateProblemStatus`, `getClassroomDetails`, `getClassroomTopicAssignments`, `getClassroomTopicAnalytics`) to accept, store, and return `student_difficulty`.

### Phase 2: Student Dashboard Tabbed Layout & Rating UI
- Update `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`:
  - Reorganize non-trainer view into `<Tabs>` (`topics`, `live`, `challenges`, `history`, `team`).
  - Add student perceived difficulty selector/badge to topic problem rows and challenge cards.
  - Connect difficulty changes to API endpoints.

### Phase 3: Team Matrix Integration
- Update `client/src/app/classroom/live/[id]/teams/[teamId]/TeamMatrixClient.js`:
  - Read student-perceived difficulty (`student_difficulty`) per member row.
  - Display student difficulty in member columns and compute row average difficulty dynamically.

### Phase 4: Verification & Docs
- Run `npm run lint` in `client/`.
- Run `npm run build` in `client/`.
- Update project memory in `docs/knowledge-base/` and prepare implementation review.
