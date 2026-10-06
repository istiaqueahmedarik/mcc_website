# Optional Problem Difficulty for Trainer Feature RSD

- **Author**: Antigravity
- **Date**: 2026-07-27
- **Status**: APPROVED

## 1. Executive Summary

Currently, when trainers create, assign, or edit problems (in live sessions, topic units, or bulk imports), the problem difficulty defaults or is forced to values like "Medium", "1", or "Trainer selected" if left unspecified. Trainers should have full flexibility to leave the problem difficulty empty (unspecified/optional) if they choose not to set a difficulty rating.

## 2. Scope and Requirements

### 2.1 Trainer Problem Creation and Edit UI
- **REQ-1.1**: The live problem assignment form difficulty input must allow selecting "None" or leaving difficulty unselected/empty.
- **REQ-1.2**: Default difficulty state in problem forms (live assignment form & topic unit problem form) must not default to `"Medium"`. It should default to empty string (`""`) or unselected.
- **REQ-1.3**: The topic problem creation/editing form dropdown options must include an explicit optional/empty choice (e.g. `None` / empty option).
- **REQ-1.4**: When difficulty is left empty or set to `"None"`, the client must send `""` or `null` to the backend instead of forcing a default string like `"Medium"` or `"Trainer selected"`.

### 2.2 Server Controller & API Endpoints
- **REQ-2.1**: `assignProblem` endpoint in `classroomController.ts` must accept empty/null difficulty values without forcing a default fallback of `"Medium"`.
- **REQ-2.2**: `addClassroomTopicProblem` and `updateClassroomTopicProblem` endpoints in `classroomController.ts` must accept empty string or null difficulty values without substituting `"Trainer selected"` or `"Medium"`.
- **REQ-2.3**: `bulkAssignProblems` endpoint in `classroomController.ts` must allow rows with blank difficulty fields to retain empty/blank values instead of defaulting to `"Medium"`.

### 2.3 Problem Display & Badges
- **REQ-3.1**: When a problem's difficulty is empty or null, problem list items, challenge cards, and details views in trainer and student interfaces must gracefully hide the difficulty badge or display it cleanly without fallback text like `"Medium"` or `"Trainer selected"`.
- **REQ-3.2**: Existing perceived student difficulty ratings (e.g., student self-ratings 1-5) and matrix calculations must handle problems with empty trainer difficulty gracefully without throwing errors or breaking UI state.

## 3. Out of Scope

- Database schema migration (the existing TEXT column supports empty/null strings directly).
- Modifying student perceived difficulty ratings (1-5 scale for student feedback).
- Automatic scraping or forcing auto-populated difficulties from external platforms.
- Unrelated trainer UI redesigns or database schema refactors.

## 4. Acceptance Criteria

- Trainers can submit a live problem assignment with an empty difficulty field.
- Trainers can create or edit a topic problem with difficulty set to "None" / empty.
- CSV/bulk import permits blank difficulty columns without inserting `"Medium"`.
- Backend endpoints store `""` / `null` for difficulty when unspecified.
- Problem cards and lists render cleanly when difficulty is empty (no forced `"Medium"` or `"Trainer selected"` badges).
- Existing unit/integration tests and linting pass without errors.

## 5. Verification Plan

- ESLint check on modified client files (`npm run lint` in `client/`).
- Build verification (`npm run build` in `client/`).
- Code review against repository quality and security standards.
