# Technical Decisions & Architectural Considerations

- **Feature**: `student-perceived-difficulty-dashboard-tabs-20260725`
- **Date**: 2026-07-25

---

## Technical Decisions

### 1. Database Schema Extensions
- **`classroom_topic_problem_progress`**:
  - Add column: `student_difficulty VARCHAR(50) DEFAULT NULL`
  - Allows storing student perceived rating (e.g., "1", "2", "3", "4", "5" or "Easy", "Medium", "Hard", "Advanced").
- **`class_problems`**:
  - Add column: `student_difficulty VARCHAR(50) DEFAULT NULL`
  - Stores student perceived rating on individual live class problems.

### 2. Controller & API Handler Enhancements
- **`updateClassroomTopicProblemProgress`**:
  - Accept optional `studentDifficulty` in request payload.
  - Insert/update `student_difficulty` column in `classroom_topic_problem_progress`.
- **`updateProblemStatus`**:
  - Accept optional `studentDifficulty` in request payload.
  - Insert/update `student_difficulty` column in `class_problems`.
- **Progress & Details Fetchers**:
  - Ensure `student_difficulty` is selected and returned in payload for topic assignments, topic analytics, and class problems.

### 3. Team Matrix Aggregation Logic (`TeamMatrixClient.js`)
- Replace hardcoded static problem `difficulty` in student columns with `student_difficulty` from student progress (falling back to trainer-assigned problem difficulty if `student_difficulty` is null/unrated).
- Recalculate row `avgDifficulty` using student perceived difficulty values across team members.

### 4. Student Dashboard Tab Layout (`ClassroomLiveClient.js`)
- Use shadcn `<Tabs>` UI component for student view (`!isTrainer`):
  - `topics` -> TopicAssignmentsPanel
  - `live` -> ClassroomBoardPanel & ClassroomIdePanel
  - `challenges` -> Live session challenges grid
  - `history` -> Completed class history
  - `team` -> Team details & classroom roster
- Integrate perceived difficulty dropdown/badge component on problem cards/rows so students can easily rate difficulty when updating progress.
