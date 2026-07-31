# Task Plan Document: Trainer Classroom Overhaul

> Superseded on 2026-07-28 by the canonical `trainer-updates-problem-threads-20260728` artifacts.
> Do not execute this preview plan. A new task plan will be created only after the technical decision gate is approved.

- **Document ID**: TP-20260728-TRAINER-CLASSROOM-OVERHAUL
- **Author**: Explorer 2 (teamwork_preview_explorer)
- **Date**: 2026-07-28
- **Status**: SUPERSEDED PREVIEW
- **Target Release**: Classroom 2.0 Overhaul
- **RSD Reference**: `docs/rsd/trainer-classroom-overhaul-rsd.md`
- **Technical Decisions Reference**: `docs/decisions/trainer-classroom-overhaul-technical-decisions.md`

---

## 1. Dependency Graph & Execution Topology

```
+-------------------------------------------------------------------+
|               WP1: Removal of Legacy Messaging (R4)               |
|  (Delete legacy chat routes, controllers, DB tables & client UI)  |
+---------------------------------+---------------------------------+
                                  |
                                  v
+---------------------------------+---------------------------------+
|       WP2: DB Migrations & Server Endpoints (R1, R2, R3, R5)       |
|  (Run DDL migrations, implement Hono routes & controller logic)   |
+-------------------+-------------------------------+---------------+
                    |                               |
                    v                               v
+-------------------+---------------+   +-----------+---------------+
|     WP3: Client UI Components     |   | WP4: Email Notifications  |
|  (UpdatesTab, ProblemThread,      |   |  (Fire-and-forget email   |
|   PrioritySettings, ClassroomLive) |   |   hooks & deep links)     |
+-------------------+---------------+   +-----------+---------------+
                    |                               |
                    +-------------------+-----------+
                                        |
                                        v
+---------------------------------------+---------------------------+
|             WP5: Build Verification & Final Review                |
|       (Client lint & build, server compile, AC verification)      |
+-------------------------------------------------------------------+
```

### Parallelization Strategy
- **WP1** MUST run first to cleanly purge legacy chat code before adding new thread structures.
- **WP2** can proceed immediately after WP1 to establish database tables and API endpoints.
- **WP3** and **WP4** can be executed in parallel after WP2 is complete (WP3 handles frontend UI wiring, WP4 handles backend email trigger hooks).
- **WP5** runs last to verify client build compilation, linting, and overall integration.

---

## 2. Work Packages

### Work Package 1: Removal of Legacy Messaging System (R4)
- **Primary Requirement**: R4 (REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.4)
- **Target Files**:
  - `server/src/routes/classroomRoute.ts`
  - `server/src/controllers/classroomController.ts`
  - `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

#### Tasks:
1. **Subtask 1.1 (Server Route Removal)**:
   - Edit `server/src/routes/classroomRoute.ts` to remove:
     - `POST /:id/chat/send`
     - `GET /:id/chat/history`
     - `POST /:id/chat/reaction`
2. **Subtask 1.2 (Controller Function Removal)**:
   - Edit `server/src/controllers/classroomController.ts` to remove `sendChatMessage`, `getChatMessages`, and `toggleChatReaction`.
3. **Subtask 1.3 (Database Table Cleanup)**:
   - Run SQL DDL migration:
     ```sql
     DROP TABLE IF EXISTS classroom_message_reactions CASCADE;
     DROP TABLE IF EXISTS classroom_messages CASCADE;
     ```
4. **Subtask 1.4 (Client UI Cleanup)**:
   - Edit `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` to remove floating pet chat bubble component, chat drawer trigger, chat WebSocket logic, chat message state, and legacy chat UI imports (`Bubble`, `Message`, etc. where unused).

---

### Work Package 2: DB Migrations and Server Controllers/Routes (R1, R2, R3, R5 backend)
- **Primary Requirements**: R1, R2, R3, R5
- **Target Files**:
  - `server/src/db.ts` (DB Connection)
  - `server/src/routes/classroomRoute.ts`
  - `server/src/routes/userRoute.ts`
  - `server/src/controllers/classroomController.ts`
  - `server/src/controllers/userController.ts`

#### Tasks:
1. **Subtask 2.1 (Database Migrations)**:
   - Execute DDL SQL:
     ```sql
     CREATE TABLE IF NOT EXISTS public.user_settings (
       user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
       update_priorities text[] DEFAULT ARRAY['time_exceeded', 'teacher_feedback', 'thread_reply', 'new_problem']::text[],
       email_notifications_enabled boolean NOT NULL DEFAULT true,
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now()
     );

     CREATE TABLE IF NOT EXISTS public.problem_threads (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
       problem_id text NOT NULL,
       problem_type text NOT NULL DEFAULT 'class_problem',
       user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
       message text NOT NULL,
       is_solution boolean NOT NULL DEFAULT false,
       created_at timestamptz NOT NULL DEFAULT now()
     );

     CREATE TABLE IF NOT EXISTS public.problem_thread_reactions (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       message_id uuid NOT NULL REFERENCES public.problem_threads(id) ON DELETE CASCADE,
       user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
       reaction text NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now(),
       CONSTRAINT unique_user_message_reaction UNIQUE (message_id, user_id, reaction)
     );

     CREATE INDEX IF NOT EXISTS idx_problem_threads_problem ON public.problem_threads(problem_id);
     CREATE INDEX IF NOT EXISTS idx_problem_threads_class ON public.problem_threads(class_id);
     ```

2. **Subtask 2.2 (Updates Endpoint Implementation - R1)**:
   - Add `getClassroomUpdates` controller function in `classroomController.ts`.
   - Register route `GET /classroom/:id/updates` in `classroomRoute.ts`.
   - Implement role-based query logic for trainer (`time_exceeded`, `thread_reply`) and student (`new_problem`, `teacher_feedback`, `thread_reply`).
   - Implement sorting based on user's priority order array from `user_settings`.

3. **Subtask 2.3 (Problem Thread Endpoints Implementation - R2)**:
   - Add controller functions:
     - `getProblemThread`
     - `postProblemThreadMessage`
     - `toggleProblemThreadReaction`
   - Register routes in `classroomRoute.ts`:
     - `GET /classroom/problem-thread/:problemId`
     - `POST /classroom/:id/problem-thread/:problemId`
     - `POST /classroom/problem-thread/reaction`

4. **Subtask 2.4 (User Settings Endpoints Implementation - R5)**:
   - Add controller functions `getUserSettings` and `updateUserSettings` in `userController.ts` (or `classroomController.ts`).
   - Register routes `GET /user/settings` and `POST /user/settings` in `userRoute.ts`.

---

### Work Package 3: Client UI Components & `ClassroomLiveClient.js` Wiring (R1, R2, R3, R5 frontend)
- **Primary Requirements**: R1, R2, R5
- **Target Files**:
  - `client/src/components/UpdatesTab.js` (New File)
  - `client/src/components/ProblemThread.js` (New File)
  - `client/src/components/PrioritySettings.js` (New File)
  - `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

#### Tasks:
1. **Subtask 3.1 (Create `UpdatesTab.js`)**:
   - Build `UpdatesTab` component fetching `GET /classroom/:id/updates`.
   - Render update summary badges (Time Limit Exceeded, Teacher Feedback, Thread Reply, New Problem).
   - Render priority-sorted list of update cards with colored badges and direct action buttons ("View Problem", "Open Thread").

2. **Subtask 3.2 (Create `ProblemThread.js`)**:
   - Build `ProblemThread` component fetching `GET /classroom/problem-thread/:problemId`.
   - Render scrollable message list with markdown text, solution badges, and sender avatars.
   - Render interactive emoji reaction bar (`👍`, `❤️`, `🎉`, `💡`, `🚀`) with active user highlight counts.
   - Render message input form with `is_solution` toggle and submit action.

3. **Subtask 3.3 (Create `PrioritySettings.js`)**:
   - Build `PrioritySettings` component fetching `GET /user/settings` and posting to `POST /user/settings`.
   - Render interactive priority reordering UI (arrow move-up / move-down or drag list) for update categories.
   - Render toggle switch for email notifications (`email_notifications_enabled`).
   - Include Sonner toast notification on save.

4. **Subtask 3.4 (`ClassroomLiveClient.js` Integration)**:
   - Update `<Tabs defaultValue="updates">` so `Updates` is the default active landing tab.
   - Add `<TabsTrigger value="updates">` as the first tab trigger.
   - Mount `<UpdatesTab classroomId={id} isTrainer={isTrainer} token={token} />` inside `<TabsContent value="updates">`.
   - Mount `<ProblemThread />` inside problem details / expansion panels in class practice and topic module tabs.
   - Mount `<PrioritySettings />` inside settings dialog / popover in classroom header.

---

### Work Package 4: Email Notification Integration & Deep Links (R3)
- **Primary Requirement**: R3 (REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4)
- **Target Files**:
  - `server/src/controllers/classroomController.ts`
  - `server/src/sendEmail.ts`

#### Tasks:
1. **Subtask 4.1 (Fire-and-Forget Email Hook)**:
   - Import `sendEmail` from `server/src/sendEmail.ts`.
   - In `postProblemThreadMessage`, construct non-blocking background async execution block.
2. **Subtask 4.2 (Recipient & Preference Guard)**:
   - If student posts -> identify classroom trainer/creator -> check `user_settings.email_notifications_enabled` -> if true, dispatch email.
   - If trainer posts -> identify assigned student for the problem -> check `user_settings.email_notifications_enabled` -> if true and `student_id !== trainer_id`, dispatch email.
3. **Subtask 4.3 (Deep Link Construction)**:
   - Generate direct deep link URL in HTML email body:
     `${APP_BASE_URL}/classroom/live/${classroomId}?tab=updates&problemId=${problemId}`.

---

### Work Package 5: Build Verification & Final Review
- **Target Files**: Entire workspace

#### Tasks:
1. **Subtask 5.1 (Client Lint Verification)**:
   - Run `npm run lint` in `client/` directory and ensure zero lint errors in modified and newly added files (`ClassroomLiveClient.js`, `UpdatesTab.js`, `ProblemThread.js`, `PrioritySettings.js`).
2. **Subtask 5.2 (Client Build Verification)**:
   - Run `npm run build` in `client/` directory to verify clean Next.js bundle compilation.
3. **Subtask 5.3 (Server Compilation Check)**:
   - Run `bun build src/index.ts --target=bun --outdir .codex-build` in `server/` directory to verify TypeScript route/controller compilation.
4. **Subtask 5.4 (Acceptance Criteria & Knowledge Base Verification)**:
   - Check all 6 items in RSD Section 8 Acceptance Criteria.
   - Record durable quality rules and lessons in `docs/knowledge-base/quality-rules.md` if appropriate.

---

## 3. Risk Assessment & Mitigation Strategy

| Risk Factor | Impact | Mitigation Strategy |
|---|---|---|
| Large file size of `ClassroomLiveClient.js` (8,500+ lines) causing refactoring regression | High | Keep component additions modular via isolated files (`UpdatesTab.js`, `ProblemThread.js`, `PrioritySettings.js`). Only edit tab triggers/contents and settings popover in `ClassroomLiveClient.js`. |
| Email SMTP transport delays or failures | Medium | Wrap `sendEmail` in un-awaited background async block inside `try/catch`. HTTP response returns instantly regardless of SMTP outcome. |
| DB query overhead for Updates feed | Low | Single optimized SQL query with indexes on `class_id`, `problem_id`, and `created_at`. No polling or background jobs. |
