# Execution Plan — Trainer/Classroom Overhaul

## Overview
Overhaul the trainer/classroom feature in `c:\Users\Arik\Desktop\mcc` following the RSD-first delivery workflow defined in `AGENTS.md`.

## Workflow Phases & Required Gates

### Phase 1: Discovery & RSD (Gate 1)
- Dispatch `teamwork_preview_explorer` to analyze existing implementation details in `client/` and `server/`.
- Produce `docs/rsd/trainer-classroom-overhaul-rsd.md` mapping R1–R5 to architectural requirements and test criteria.
- Present RSD to Parent/User for **Gate 1 Approval**.

### Phase 2: Technical Decisions & Task Plan (Gate 2 & Gate 3)
- Produce `docs/decisions/trainer-classroom-overhaul-technical-decisions.md` detailing DB schema migrations (`user_settings`, `problem_threads`, dropping `classroom_messages`), endpoint contracts, priority queue algorithm, and email notification trigger hooks.
- Produce `docs/tasks/trainer-classroom-overhaul-task-plan.md` with dependency graph, work packages, and review checkpoints.
- Present Technical Decisions & Task Plan for **Gate 2 & Gate 3 Approval**.

### Phase 3: Milestone 1 — Messaging Removal (R4)
- Dispatch Worker to drop old chat routes, controller functions, client chat UI drawer/sheet, and add DB table cleanup (`DROP TABLE IF EXISTS classroom_messages, classroom_message_reactions`).
- Verify build with `npm run lint` and `npm run build` in `client/`.

### Phase 4: Milestone 2 — Database & Server Endpoint Enhancements (R1, R2, R3, R5)
- Dispatch Worker to extend DB schemas and controllers:
  - `user_settings` priority & email preference schema
  - Single SQL query for page-load timer-exceeded trainer updates
  - Chat-style thread endpoints (`GET /classroom/:id/threads`, `POST message`, `POST reaction`, solution & verdict entries)
  - `sendEmail.ts` non-blocking email hooks
  - Priority management endpoints

### Phase 5: Milestone 3 — Client UI Components (R1, R2, R3, R5)
- Dispatch Worker to implement:
  - Updates tab in `ClassroomLiveClient.js` (first tab for trainer & student, priority queue + recency sort)
  - Enhanced Problem Threads UI for `class_problems` and `classroom_topic_problems`
  - Drag-to-reorder priority settings UI & per-category email toggles

### Phase 6: Verification & Review (Gate 4)
- Reviewer & Challenger verification.
- Forensic Auditor integrity verification.
- Final build verification (`npm run lint` & `npm run build` in `client/`).
- Present Implementation Review for **Gate 4 Approval**.
