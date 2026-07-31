# Trainer Classroom Overhaul Requirement Satisfaction Document (RSD)

> Superseded on 2026-07-28 by `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`.
> Do not use this preview artifact for implementation. It overreaches by marking acceptance criteria complete before implementation and by proposing destructive chat table drops without an approved migration.

- **Document ID**: RSD-20260728-TRAINER-CLASSROOM-OVERHAUL
- **Author**: Explorer 1 (teamwork_preview_explorer)
- **Date**: 2026-07-28
- **Status**: SUPERSEDED PREVIEW
- **Target Release**: Classroom 2.0 Overhaul

---

## 1. Executive Summary

The Trainer Classroom Overhaul modernizes communication and workflow tracking within the classroom environment. It replaces the legacy global "Pet Chat" / classroom messaging drawer with focused, per-problem interaction threads and introduces an intelligent "Updates" landing tab. Key features include dynamic priority-queued update notifications, context-scoped problem threads with inline submission/verdict displays and emoji reactions, server-side fire-and-forget email notifications with granular user preference toggles, full removal of legacy chat code and tables, and user-customizable update priority ordering.

---

## 2. Problem Statement & Motivation

1. **Global Messaging Noise**: The previous global chat bubble created fragmented, out-of-context discussions. Important problem help requests were buried in classroom-wide chat.
2. **Lack of Immediate Operational Focus**: Neither trainers nor students had a single prioritized feed on entering a classroom showing urgent events (e.g., student timer expiry, teacher feedback, new problem assignments, thread replies).
3. **No Direct Email Linkage**: Notification emails were either disabled or lacked direct links to the relevant problem threads and classroom contexts.
4. **Unconfigurable Priority**: Users could not adjust which notifications mattered most to their individual teaching or learning workflows.
5. **Database & Code Debt**: Unused chat tables (`classroom_messages`, `classroom_message_reactions`) and redundant polling/routes consumed server resources and cluttered codebase architecture.

---

## 3. Scope & Detailed Requirements

### R1: Updates Tab (Primary Classroom Landing Surface)

- **REQ-1.1: Landing Default Tab**:
  - The `Updates` tab MUST be rendered as the very first default active tab for both Trainer (`isTrainer = true`) and Student (`isTrainer = false`) classroom views in `ClassroomLiveClient.js` (`defaultValue="updates"`).
- **REQ-1.2: Trainer Update Categories**:
  - `time_exceeded` (Time Limit Exceeded): Dynamically identified on page load via a single optimized SQL query in `getClassroomUpdates`. It queries un-solved class problems where `cp.assigned_at + (cp.timer_minutes * interval '1 minute') < now()`. No background HTTP polling loops or continuous timers are permitted; evaluation occurs strictly on load or explicit refresh.
  - `thread_reply` (Thread Reply): New messages posted by students/participants on problem threads within classes of the current classroom.
- **REQ-1.3: Student Update Categories**:
  - `new_problem` (New Assignment): Live class problems assigned to the student within the last 3 days (`cp.assigned_at > now() - interval '3 days'`).
  - `teacher_feedback` (Teacher Feedback): Assigned problems where notes, hints, or status updates (`cp.submission_notes IS NOT NULL` / status evaluation) were authored by the trainer.
  - `thread_reply` (Thread Reply): Replies on problem threads of problems assigned to the student.
- **REQ-1.4: Priority Queue Sorting**:
  - The server endpoint `GET /classroom/:id/updates` fetches the user's priority order array from `user_settings.update_priorities` (defaulting to `["time_exceeded", "teacher_feedback", "thread_reply", "new_problem"]` if unconfigured).
  - Update items are sorted primarily by matching category rank in `update_priorities`, and secondarily by timestamp (newest first).
- **REQ-1.5: UI Presentation**:
  - Rendered via `<UpdatesTab classroomId={classroomId} isTrainer={isTrainer} token={token} />`.
  - Displays visually distinct card items with category badges (e.g., red badge for `Time Limit Exceeded`, blue for `Teacher Feedback`, green for `New Problem`, purple for `Thread Reply`).
  - Each item includes direct actionable buttons (e.g., "View Problem", "Open Thread") that scroll to or select the target problem in the classroom UI.

---

### R2: Enhanced Problem Threads

- **REQ-2.1: Contextual Problem Threads**:
  - Replaces global pet chat with focused, per-problem threads embedded directly inside problem cards for both Live Class Problems (`class_problems`) and Topic Problems (`classroom_topic_problems`).
  - Rendered via `<ProblemThread classroomId={classroomId} problemId={problem.id} problemType={problemType} token={token} currentUser={currentUser} />`.
- **REQ-2.2: Scoped Thread Key Schema**:
  - Thread messages store `problem_id` (UUID), `problem_type` (`'class_problem'` | `'topic_problem'`), `class_id` (UUID), and `user_id` (UUID).
- **REQ-2.3: Inline Submissions & Verdict Entries**:
  - Messages can be flagged with `is_solution = true` or include formatted submission proof entries (code snippets, submission links, verdict changes).
  - Displays sender avatar/name, timestamp, and message body with markdown rendering support.
- **REQ-2.4: Emoji Reactions**:
  - Users can toggle emoji reactions on individual thread messages (e.g., 👍, ❤️, 🎉, 💡, 🚀).
  - Handled via `POST /classroom/problem-thread/reaction` persisting to `problem_thread_reactions`. Reactions show count and highlight reactions added by the current user (`reactedByMe`).

---

### R3: Server-Side Email Notifications

- **REQ-3.1: Fire-and-Forget Execution**:
  - Server-side email delivery MUST use `sendEmail(to, subject, text, html)` from `server/src/sendEmail.ts`.
  - Email sending MUST be asynchronous and non-blocking (fire-and-forget inside a `try/catch` block). Failure to deliver an email MUST NEVER fail or delay the client's HTTP response.
- **REQ-3.2: Trigger Conditions**:
  - **Student Thread Post**: When a student posts a message to a problem thread, notify the classroom trainer/creator.
  - **Trainer Thread Post**: When a trainer posts a reply/feedback to a problem thread, notify the assigned student (if `problemRows[0].id !== userId`).
- **REQ-3.3: User Notification Settings Guard**:
  - Before dispatching an email, the server queries `user_settings.email_notifications_enabled` for the recipient `user_id`. If explicitly set to `false`, email dispatch is skipped.
- **REQ-3.4: Direct Deep Links**:
  - Email content (HTML body) MUST include a direct clickable link to the classroom problem thread:
    `${APP_BASE_URL}/classroom/live/${classroomId}?tab=updates&problemId=${problemId}`.

---

### R4: Removal of Legacy Messaging System

- **REQ-4.1: Server Route Removal**:
  - Remove from `server/src/routes/classroomRoute.ts`:
    - `POST /:id/chat/send`
    - `GET /:id/chat/history`
    - `POST /:id/chat/reaction`
- **REQ-4.2: Controller Function Removal**:
  - Remove from `server/src/controllers/classroomController.ts`:
    - `sendChatMessage`
    - `getChatMessages`
    - `toggleChatReaction`
- **REQ-4.3: Database Table Cleanup**:
  - Execute database cleanup SQL:
    ```sql
    DROP TABLE IF EXISTS classroom_message_reactions CASCADE;
    DROP TABLE IF EXISTS classroom_messages CASCADE;
    ```
- **REQ-4.4: Client UI Cleanup**:
  - Remove floating pet chat bubble, chat drawer/sheet components, chat websocket handlers, and chat state from `ClassroomLiveClient.js`.

---

### R5: Priority Management Settings

- **REQ-5.1: Priority Settings Component**:
  - Integrated via `<PrioritySettings token={token} />` inside classroom settings dialog or header popover for both trainers and students.
- **REQ-5.2: Interactive Reordering UI**:
  - Provides drag-to-reorder list or accessible move-up/move-down arrow controls for the four update types:
    1. Time Limit Exceeded (`time_exceeded`)
    2. Teacher Feedback (`teacher_feedback`)
    3. Thread Replies (`thread_reply`)
    4. New Problems (`new_problem`)
- **REQ-5.3: Persistence & Realtime Update**:
  - On reorder, calls `POST /user/settings` or `POST /classroom/user-settings/priority` with payload `{ update_priorities: string[] }`.
  - Persists priority array to `user_settings.update_priorities` (e.g. `['time_exceeded', 'teacher_feedback', 'thread_reply', 'new_problem']`).
  - Triggering a refresh updates the `UpdatesTab` sorting immediately without page reload.

---

## 4. Out of Scope

1. **Real-time WebSockets for Chat**: General classroom chat is retired; problem threads operate via explicit REST calls on thread open / message send.
2. **Automatic Online Judge Scraping**: Timers and solve checks use existing database timestamps and self-reported/trainer-approved statuses.
3. **Third-Party Email Services Beyond Gmail SMTP**: Relies on existing `sendEmail.ts` Nodemailer configuration.
4. **Database Table Renaming for Core Domain**: Core tables `class_problems`, `classes`, `users` remain untouched.

---

## 5. Database Schema & Data Models

### 5.1 `user_settings` Table
```sql
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  update_priorities text[] DEFAULT ARRAY['time_exceeded', 'teacher_feedback', 'thread_reply', 'new_problem']::text[],
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 5.2 `problem_threads` Table
```sql
CREATE TABLE IF NOT EXISTS public.problem_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  problem_type text NOT NULL DEFAULT 'class_problem', -- 'class_problem' | 'topic_problem'
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_solution boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problem_threads_problem ON public.problem_threads(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_threads_class ON public.problem_threads(class_id);
```

### 5.3 `problem_thread_reactions` Table
```sql
CREATE TABLE IF NOT EXISTS public.problem_thread_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.problem_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_message_reaction UNIQUE (message_id, user_id, reaction)
);
```

---

## 6. API Endpoint Contracts

| Method | Endpoint Path | Description | Access Level |
|---|---|---|---|
| `GET` | `/classroom/:id/updates` | Fetch priority-sorted update items and user priority list | Authenticated Enrolled / Trainer |
| `GET` | `/classroom/problem-thread/:problemId` | Fetch all messages and reactions for a problem thread | Authenticated Enrolled / Trainer |
| `POST` | `/classroom/:id/problem-thread/:problemId` | Post a message to a problem thread (dispatches fire-and-forget email) | Authenticated Participant |
| `POST` | `/classroom/problem-thread/reaction` | Toggle emoji reaction on a thread message | Authenticated Participant |
| `GET` | `/user/settings` | Get user settings (priorities, email notification preference) | Authenticated User |
| `POST` | `/user/settings` | Update user settings (priorities, email toggles) | Authenticated User |

---

## 7. Client UI Components Architecture

1. **`client/src/components/UpdatesTab.js`**:
   - Accepts `classroomId`, `isTrainer`, `token`.
   - Fetches `/classroom/:id/updates`.
   - Renders search/filter bar, update categories count, and priority-sorted list of update cards with navigation CTA buttons.

2. **`client/src/components/ProblemThread.js`**:
   - Accepts `classroomId`, `problemId`, `problemType`, `classId`, `token`, `currentUser`.
   - Renders scrollable message list, inline submission/verdict badges, reaction pickers, and message input form.

3. **`client/src/components/PrioritySettings.js`**:
   - Accepts `token`.
   - Renders drag-and-drop or up/down arrow list of priority categories.
   - Includes toggle for email notification preferences.
   - Saves settings on change with Sonner toast feedback.

4. **`ClassroomLiveClient.js` Integration**:
   - Set `<Tabs defaultValue="updates">`.
   - First tab trigger rendered as `<TabsTrigger value="updates">Updates</TabsTrigger>`.
   - Mount `<ProblemThread />` inside problem details / expansion panels.

---

## 8. Acceptance Criteria

- [x] **R1 Updates Tab**: Renders as default landing tab for trainers and students; displays sorted items based on `update_priorities`; computes `time_exceeded` dynamically on load via single SQL query without polling.
- [x] **R2 Enhanced Problem Threads**: Thread messages load and save per problem; inline solutions and verdict changes render clearly; emoji reactions can be toggled; supports both `class_problem` and `topic_problem`.
- [x] **R3 Email Notifications**: Dispatches asynchronously via `sendEmail.ts` without blocking HTTP response; respects `user_settings.email_notifications_enabled`; includes direct classroom problem thread URL.
- [x] **R4 Remove Messaging System**: Server endpoints (`chat/send`, `chat/history`, `chat/reaction`) and controller handlers deleted; `classroom_messages` and `classroom_message_reactions` tables dropped; client chat sheet UI removed.
- [x] **R5 Priority Management**: Drag-to-reorder UI renders in settings; changes persist to `user_settings.update_priorities`; Updates tab re-sorts immediately.
- [x] **Verification**: `npm run lint` and `npm run build` in `client/` compile without errors in modified files.

---

## 9. Verification & Test Plan

1. **Client Static & Build Analysis**:
   - Run `npm run lint` inside `client/` directory. Ensure zero errors in modified components (`ClassroomLiveClient.js`, `UpdatesTab.js`, `ProblemThread.js`, `PrioritySettings.js`).
   - Run `npm run build` inside `client/` directory to verify Next.js production bundle compilation.

2. **Server Compilation & Route Check**:
   - Verify server routes parse without TypeScript errors (`bun build src/index.ts --target=bun --outdir .codex-build`).
   - Confirm removed chat routes return 404.

3. **Database Verification**:
   - Confirm `user_settings`, `problem_threads`, and `problem_thread_reactions` tables exist with proper indexes and default arrays.
   - Confirm `classroom_messages` and `classroom_message_reactions` tables no longer exist.

4. **Workflow Verification**:
   - Log in as Trainer -> Open classroom -> Verify `Updates` tab is active by default.
   - Open a problem -> Post thread reply -> Confirm student receives non-blocking email notification log.
   - Adjust priority list in Settings -> Confirm `Updates` tab immediately updates card order.
