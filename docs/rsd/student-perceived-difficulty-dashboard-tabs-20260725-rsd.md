# Requirement Satisfaction Document (RSD)
## Student Perceived Difficulty Flow & Tabbed Student Dashboard

- **ID**: `student-perceived-difficulty-dashboard-tabs-20260725`
- **Date**: 2026-07-25
- **Status**: Proposed

---

## 1. Executive Summary

This requirement addresses two core improvements to the student classroom experience and analytics:
1. **Student-Driven Perceived Difficulty Flow**: Capture how a problem was actually perceived by the student who solved/tried it (rather than displaying only trainer-assigned static difficulty). Store this student perceived difficulty, expose it in student update flows on the Student Dashboard, and reflect per-student perceived difficulty ratings (and recalculated average difficulty) in the Team Matrix view.
2. **Tabbed Student Dashboard Organization**: Reorganize the currently cluttered, vertically-stacked Student Dashboard (`ClassroomLiveClient.js`) into an intuitive, tabbed layout matching modern UI standards (Topics, Live Session, Challenges, History, Team/Roster).

---

## 2. Requirement Specification & Scope

### 2.1 Student Perceived Difficulty Flow
- **Student Input**:
  - When marking a topic problem or live challenge as "Solved" or "Tried" (or updating progress on the Student Dashboard), students can rate/select their perceived difficulty (1=Easy, 2=Medium, 3=Hard, 4=Advanced, 5=Extreme, or 1..5 scale).
  - The student can also adjust their perceived difficulty rating independently of changing status.
- **Backend Persistence**:
  - Schema update: Add `student_difficulty` column to `classroom_topic_problem_progress` and `class_problems`.
  - API update: Update `/classroom/:id/topic-progress/status` and `/classroom/problem/:id/status` endpoints to accept and store `studentDifficulty`/`difficulty`.
  - Expose `student_difficulty` in assignment details, topic progress, class problem listings, and topic analytics APIs.
- **Team Matrix View (`TeamMatrixClient.js`)**:
  - Under each student's column in the matrix table, display that student's actual perceived difficulty rating (`student_difficulty`). Fall back to trainer-assigned difficulty or default if not rated/unsolved yet.
  - Dynamically calculate the row's `AVERAGE DIFFICULTY` based on the perceived difficulties submitted by the students.

### 2.2 Tabbed Student Dashboard Layout
- **Structure**:
  - Replace the stacked card layout for non-trainer users in `ClassroomLiveClient.js` with an intuitive `<Tabs>` container:
    - **Tab 1: Topics & Modules**: Assigned topic units, sub-problems, resources, status toggles, and perceived difficulty controls.
    - **Tab 2: Live Session**: Ephemeral live board broadcast (`ClassroomBoardPanel`) and live online IDE (`ClassroomIdePanel`).
    - **Tab 3: Challenges**: Grid of assigned live session practice problems with direct problem links, status toggles, hints/notes modal, and perceived difficulty controls.
    - **Tab 4: History**: Completed class sessions, past session summaries, and recorded class materials.
    - **Tab 5: Team & Roster**: Assigned team details, team members list, and classroom member directory.
  - Preserve all existing live socket connections, IDE activity recording, chat, and notification features.

---

## 3. Success Criteria & Verification

1. **DB Verification**: Migration adds `student_difficulty` column safely without breaking existing records.
2. **Student Flow Verification**: Students can view, select, and submit perceived difficulty on assigned topic problems and live challenges.
3. **Team Matrix Verification**: Team Matrix correctly renders each student's submitted perceived difficulty under their name and computes average difficulty across student perceptions.
4. **Student Dashboard Verification**: Student UI is organized logically into tabs (`topics`, `live`, `challenges`, `history`, `team`), responsive, cleanly styled, and free of clutter.
5. **Quality Verification**: `npm run lint` and `npm run build` pass clean in `client/`.
