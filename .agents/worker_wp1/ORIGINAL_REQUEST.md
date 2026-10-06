## 2026-07-28T01:38:57Z
You are Worker WP1 (teamwork_preview_worker).
Your working directory is `c:\Users\Arik\Desktop\mcc\.agents\worker_wp1\`. Create this directory if needed and place your `progress.md` and `handoff.md` there.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task: Execute Work Package 1 (Removal of Legacy Messaging System - R4).
Read `docs/rsd/trainer-classroom-overhaul-rsd.md`, `docs/decisions/trainer-classroom-overhaul-technical-decisions.md`, and `docs/tasks/trainer-classroom-overhaul-task-plan.md` for full context.

Instructions:
1. **Server Routes Removal (`server/src/routes/classroomRoute.ts`)**:
   - Remove legacy chat route definitions:
     - `POST /:id/chat/send`
     - `GET /:id/chat/history`
     - `POST /:id/chat/reaction`
   - Remove unused imports `sendChatMessage`, `getChatMessages`, `toggleChatReaction`.

2. **Controller Functions Removal (`server/src/controllers/classroomController.ts`)**:
   - Remove function exports: `sendChatMessage`, `getChatMessages`, `toggleChatReaction`.
   - Ensure the file parses cleanly without unused references.

3. **Database Table Cleanup (`server/src/controllers/classroomController.ts` or DB migration code)**:
   - Add/Execute SQL cleanup statement when initializing DB or executing migrations:
     ```sql
     DROP TABLE IF EXISTS public.classroom_message_reactions CASCADE;
     DROP TABLE IF EXISTS public.classroom_messages CASCADE;
     ```

4. **Client UI Cleanup (`client/src/app/classroom/live/[id]/ClassroomLiveClient.js`)**:
   - Remove floating pet chat bubble component, chat drawer/sheet trigger, chat WebSocket logic, chat message state (`chatMessages`, `chatInput`, etc.), and legacy chat UI imports where no longer used.

5. **Verification**:
   - Test client lint by running `npm run lint` inside `client/`.
   - Confirm server files compile cleanly.
   - Document all changes, file paths, line numbers, and verification results in your handoff report `.agents/worker_wp1/handoff.md`.
   - Message the Project Orchestrator upon completion.
