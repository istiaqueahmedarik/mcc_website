## 2026-07-28T01:37:59Z

You are Explorer 2 (teamwork_preview_explorer).
Your working directory is `c:\Users\Arik\Desktop\mcc\.agents\explorer_2\`. Create this directory if needed and place your `progress.md` and `handoff.md` there.

Your task:
Based on the approved RSD at `c:\Users\Arik\Desktop\mcc\docs\rsd\trainer-classroom-overhaul-rsd.md`:

1. Draft the Technical Decisions document at `c:\Users\Arik\Desktop\mcc\docs\decisions\trainer-classroom-overhaul-technical-decisions.md`.
   Include:
   - Architectural Overview (Client components structure, Hono routes/controllers, raw postgres.js DB logic, Nodemailer fire-and-forget email pattern).
   - Database Schema Migrations DDL (table creations/alterations for `user_settings`, `problem_threads`, `problem_thread_reactions`, and `DROP TABLE IF EXISTS` for `classroom_messages`, `classroom_message_reactions`).
   - Endpoint Design & API Contracts (R1 `/classroom/:id/updates` SQL query design for `time_exceeded`, R2 `/classroom/problem-thread/*` endpoints, R3 email trigger hooks, R4 chat route deletion, R5 `/user/settings` priority array).
   - Client Component Architecture (`UpdatesTab.js`, `ProblemThread.js`, `PrioritySettings.js`, and integration into `ClassroomLiveClient.js`).
   - Non-functional requirements (no polling, fire-and-forget email, performance optimization).

2. Draft the Task Plan document at `c:\Users\Arik\Desktop\mcc\docs\tasks\trainer-classroom-overhaul-task-plan.md`.
   Include:
   - Dependency Graph and Execution Topology.
   - Work Package 1: Removal of Legacy Messaging System (R4).
   - Work Package 2: DB Migrations and Server Controllers/Routes (R1, R2, R3, R5 backend).
   - Work Package 3: Client UI Components (`UpdatesTab`, `ProblemThread`, `PrioritySettings`) and `ClassroomLiveClient.js` wiring (R1, R2, R3, R5 frontend).
   - Work Package 4: Email Notification integration & direct link generation (R3).
   - Work Package 5: Build Verification (`npm run lint`, `npm run build` in `client/`) & Final Review.

3. Deliver your findings and confirm creation of both artifacts in your handoff report `.agents/explorer_2/handoff.md`.
4. Message the Project Orchestrator when done.
