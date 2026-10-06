# Technical Decisions Document: Trainer Classroom Overhaul

> Superseded on 2026-07-28 by `docs/decisions/trainer-updates-problem-threads-20260728-technical-decisions.md`.
> Do not use this preview artifact for implementation. It proposed destructive table drops and routes that were not verified against the approved RSD.

- **Document ID**: TD-20260728-TRAINER-CLASSROOM-OVERHAUL
- **Author**: Explorer 2 (teamwork_preview_explorer)
- **Date**: 2026-07-28
- **Status**: SUPERSEDED PREVIEW
- **Target Release**: Classroom 2.0 Overhaul
- **RSD Reference**: `docs/rsd/trainer-classroom-overhaul-rsd.md`

---

## 1. Executive Summary & Architectural Overview

This document specifies the technical design, database migrations DDL, API contracts, client component architecture, and non-functional guarantees for the **Trainer Classroom Overhaul**.

### 1.1 High-Level Architecture

```
                                  +---------------------------------------+
                                  |     ClassroomLiveClient.js (Next.js)  |
                                  |  (Tabs: Updates, Practice, Topics...) |
                                  +-------------------+-------------------+
                                                      |
                   +----------------------------------+----------------------------------+
                   |                                  |                                  |
                   v                                  v                                  v
       +-----------------------+          +-----------------------+          +-----------------------+
       |     UpdatesTab.js     |          |   ProblemThread.js    |          |  PrioritySettings.js  |
       +-----------+-----------+          +-----------+-----------+          +-----------+-----------+
                   |                                  |                                  |
                   | GET /classroom/:id/updates       | GET /classroom/problem-thread/:id| POST /user/settings
                   |                                  | POST /classroom/:id/problem-tr...|
                   v                                  v                                  v
       +-----------------------------------------------------------------------------------------+
       |                                Bun Hono API Server (server/src)                         |
       |  - routes/classroomRoute.ts, routes/userRoute.ts                                       |
       |  - controllers/classroomController.ts, controllers/userController.ts                    |
       +-------------------+--------------------------------------------------+------------------+
                           |                                                  |
                           v (Raw SQL queries via postgres.js)                v (Fire-and-forget async)
               +-----------------------+                          +-----------------------+
               |  PostgreSQL Database  |                          |     sendEmail.ts      |
               | (user_settings,       |                          |  (Nodemailer Gmail)   |
               |  problem_threads,     |                          +-----------------------+
               |  problem_thread_rct)  |
               +-----------------------+
```

### 1.2 Architectural Principles
1. **Raw `postgres.js` DB Access**: Continuous use of `sql` tagged template literal from `server/src/db.ts` for safe, paramaterized, high-performance SQL execution.
2. **Zero-Polling Updates Engine**: No client HTTP `setInterval` polling loops or WebSocket state for updates. Update evaluation for `time_exceeded`, `teacher_feedback`, `thread_reply`, and `new_problem` is calculated purely server-side on route invocation (`GET /classroom/:id/updates`).
3. **Fire-and-Forget Email Dispatch**: Email delivery via `sendEmail.ts` is invoked asynchronously without awaiting the returned promise in HTTP controller handlers. SMTP latency or errors will never block or delay the client's HTTP response.
4. **Scoped Problem Threads**: Messaging is scoped per-problem (`problem_id` + `class_id` + `problem_type`) rather than global room chat.

---

## 2. Database Schema Migrations DDL

### 2.1 Creation of New Tables

```sql
-- 1. user_settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  update_priorities text[] DEFAULT ARRAY['time_exceeded', 'teacher_feedback', 'thread_reply', 'new_problem']::text[],
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. problem_threads Table
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

-- 3. problem_thread_reactions Table
CREATE TABLE IF NOT EXISTS public.problem_thread_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.problem_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_message_reaction UNIQUE (message_id, user_id, reaction)
);
```

### 2.2 Database Indexes & Optimization

```sql
CREATE INDEX IF NOT EXISTS idx_problem_threads_problem ON public.problem_threads(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_threads_class ON public.problem_threads(class_id);
CREATE INDEX IF NOT EXISTS idx_problem_threads_created ON public.problem_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_thread_reactions_msg ON public.problem_thread_reactions(message_id);
```

### 2.3 Legacy Database Cleanup DDL

```sql
-- Remove legacy global chat tables (R4.3)
DROP TABLE IF EXISTS public.classroom_message_reactions CASCADE;
DROP TABLE IF EXISTS public.classroom_messages CASCADE;
```

---

## 3. Endpoint Design & API Contracts

### 3.1 R1: `GET /classroom/:id/updates`

- **Description**: Fetches prioritized update items for the specified classroom based on user role (trainer vs student) and user's priority order preferences.
- **Access**: JWT Enrolled Student or Classroom Trainer.
- **Response Format**:
```json
{
  "updates": [
    {
      "id": "cp-123",
      "problem_id": "cp-123",
      "title": "A. Watermelon",
      "student_name": "John Doe",
      "problem_type": "class_problem",
      "type": "time_exceeded",
      "assigned_at": "2026-07-28T00:30:00Z"
    },
    {
      "id": "msg-456",
      "message": "Can you check my edge cases?",
      "sender_name": "Jane Smith",
      "type": "thread_reply",
      "created_at": "2026-07-28T01:10:00Z",
      "problem_id": "cp-123",
      "problem_type": "class_problem"
    }
  ],
  "priorities": ["time_exceeded", "teacher_feedback", "thread_reply", "new_problem"]
}
```

#### SQL Logic Details:
1. **Trainer View**:
   - `time_exceeded`: Queries un-solved `class_problems` in classes of this classroom where `cp.assigned_at + (cp.timer_minutes * interval '1 minute') < now()`.
   - `thread_reply`: Queries recent `problem_threads` messages authored by non-trainer users in classes of this classroom.
2. **Student View**:
   - `new_problem`: Queries `class_problems` assigned to student within last 3 days (`cp.assigned_at > now() - interval '3 days'`).
   - `teacher_feedback`: Queries assigned problems where `cp.submission_notes IS NOT NULL`.
   - `thread_reply`: Queries replies on problem threads of problems assigned to the student where `pt.user_id != student_id`.
3. **Sorting**:
   Sort updates in JS by matching priority index in `update_priorities` array (primary sort key ascending), and then by timestamp (`created_at` or `assigned_at`) descending (secondary sort key).

---

### 3.2 R2: Enhanced Problem Thread Endpoints

#### `GET /classroom/problem-thread/:problemId`
- **Description**: Retrieves messages and aggregated reactions for a specific problem thread.
- **Response**:
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "class_id": "c1111111-e29b-41d4-a716-446655440000",
      "problem_id": "cp-123",
      "problem_type": "class_problem",
      "user_id": "u2222222-e29b-41d4-a716-446655440000",
      "sender_name": "Alice Johnson",
      "message": "I get WA on Test 4. Here is my approach.",
      "is_solution": false,
      "created_at": "2026-07-28T01:15:00Z",
      "reactions": [
        { "reaction": "👍", "user_name": "Bob Smith", "user_id": "u3333333-e29b-41d4-a716-446655440000" }
      ]
    }
  ]
}
```

#### `POST /classroom/:id/problem-thread/:problemId`
- **Description**: Posts a new message to a problem thread and triggers background email notifications.
- **Request Body**:
```json
{
  "classId": "c1111111-e29b-41d4-a716-446655440000",
  "problem_type": "class_problem",
  "message": "Try checking for n = 1 edge case.",
  "is_solution": false
}
```
- **Response**: `{ "success": true, "message": { ... } }`

#### `POST /classroom/problem-thread/reaction`
- **Description**: Toggles an emoji reaction on a message (adds if absent, removes if present).
- **Request Body**: `{ "messageId": "550e8400-...", "reaction": "👍" }`
- **Response**: `{ "success": true, "active": true }` (or `active: false` if removed).

---

### 3.3 R3: Fire-and-Forget Email Notification Hooks

Inside `postProblemThreadMessage` controller function:

```typescript
// Asynchronous, non-blocking email dispatch (fire-and-forget)
(async () => {
  try {
    const sender = await sql`SELECT full_name FROM users WHERE id = ${userId}`;
    const senderName = sender[0]?.full_name || 'A user';
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const threadUrl = `${appBaseUrl}/classroom/live/${classroomId}?tab=updates&problemId=${problemId}`;

    if (!access.isTrainer) {
      // Notify classroom creator/trainer
      const trainerRows = await sql`SELECT id, email, full_name FROM users WHERE id = ${access.createdBy}`;
      if (trainerRows.length > 0) {
        const settings = await sql`SELECT email_notifications_enabled FROM user_settings WHERE user_id = ${trainerRows[0].id}`;
        const wantsEmail = settings.length === 0 || settings[0].email_notifications_enabled;
        if (wantsEmail && trainerRows[0].email) {
          sendEmail(
            trainerRows[0].email,
            `[Classroom] New thread post from ${senderName}`,
            `${senderName} posted on a problem thread: ${trimmedMessage}\n\nView thread: ${threadUrl}`,
            `<p><strong>${senderName}</strong> posted on a problem thread:</p><blockquote>${trimmedMessage}</blockquote><p><a href="${threadUrl}">Click here to view thread in Classroom</a></p>`
          );
        }
      }
    } else {
      // Trainer reply -> Notify assigned student
      const problemRows = await sql`SELECT u.id, u.email FROM class_problems cp JOIN users u ON cp.student_id = u.id WHERE cp.id = ${problemId}`;
      if (problemRows.length > 0 && problemRows[0].id !== userId) {
        const studentId = problemRows[0].id;
        const studentEmail = problemRows[0].email;
        const settings = await sql`SELECT email_notifications_enabled FROM user_settings WHERE user_id = ${studentId}`;
        const wantsEmail = settings.length === 0 || settings[0].email_notifications_enabled;
        if (wantsEmail && studentEmail) {
          sendEmail(
            studentEmail,
            `[Classroom] Trainer reply from ${senderName}`,
            `Trainer ${senderName} replied to your problem thread: ${trimmedMessage}\n\nView thread: ${threadUrl}`,
            `<p>Trainer <strong>${senderName}</strong> replied to your problem thread:</p><blockquote>${trimmedMessage}</blockquote><p><a href="${threadUrl}">Click here to view thread in Classroom</a></p>`
          );
        }
      }
    }
  } catch (err) {
    console.error('Fire-and-forget email error:', err);
  }
})();
```

---

### 3.4 R4: Removal of Legacy Messaging System

#### Server Changes:
1. **`server/src/routes/classroomRoute.ts`**:
   - Remove imports: `sendChatMessage`, `getChatMessages`, `toggleChatReaction`.
   - Remove route definitions:
     - `route.post('/:id/chat/send', sendChatMessage);`
     - `route.get('/:id/chat/history', getChatMessages);`
     - `route.post('/:id/chat/reaction', toggleChatReaction);`
2. **`server/src/controllers/classroomController.ts`**:
   - Remove function exports: `sendChatMessage`, `getChatMessages`, `toggleChatReaction`.
3. **Database Migration**:
   - Execute `DROP TABLE IF EXISTS classroom_message_reactions CASCADE;` and `DROP TABLE IF EXISTS classroom_messages CASCADE;`.
4. **Client Cleanup**:
   - In `ClassroomLiveClient.js`, remove floating pet chat bubble, chat drawer trigger, chat WebSocket logic, chat message state, and chat-related imports.

---

### 3.5 R5: User Priority Settings Endpoints

#### `GET /user/settings`
- **Access**: JWT Authenticated User
- **Response**:
```json
{
  "update_priorities": ["time_exceeded", "teacher_feedback", "thread_reply", "new_problem"],
  "email_notifications_enabled": true
}
```

#### `POST /user/settings`
- **Access**: JWT Authenticated User
- **Request Body**:
```json
{
  "update_priorities": ["time_exceeded", "teacher_feedback", "thread_reply", "new_problem"],
  "email_notifications_enabled": true
}
```
- **SQL Execution**:
```sql
INSERT INTO public.user_settings (user_id, update_priorities, email_notifications_enabled, updated_at)
VALUES (${userId}, ${update_priorities}, ${email_notifications_enabled}, now())
ON CONFLICT (user_id) DO UPDATE SET
  update_priorities = COALESCE(EXCLUDED.update_priorities, user_settings.update_priorities),
  email_notifications_enabled = COALESCE(EXCLUDED.email_notifications_enabled, user_settings.email_notifications_enabled),
  updated_at = now()
RETURNING *;
```

---

## 4. Client Component Architecture

### 4.1 Component Hierarchy

```
ClassroomLiveClient.js (Parent Container)
├── Navbar / Header Controls
│   └── PrioritySettings Dialog/Popover (<PrioritySettings token={token} onSettingsChanged={refetchUpdates} />)
├── Tabs Header ("updates" [default], "live", "topics", "whiteboard", "teams", "schedule", "settings")
└── Tabs Content
    ├── TabsContent value="updates"
    │   └── <UpdatesTab classroomId={classroomId} isTrainer={isTrainer} token={token} />
    ├── TabsContent value="live" (Class Practice)
    │   └── Problem Cards
    │       └── <ProblemThread classroomId={classroomId} problemId={problem.id} problemType="class_problem" ... />
    └── TabsContent value="topics" (Topic Modules)
        └── Topic Problem Cards
            └── <ProblemThread classroomId={classroomId} problemId={problem.id} problemType="topic_problem" ... />
```

### 4.2 Component Details

#### 1. `client/src/components/UpdatesTab.js`
- **Props**: `classroomId`, `isTrainer`, `token`
- **State**: `updates`, `priorities`, `loading`, `filterCategory`
- **Features**:
  - Fetches `/classroom/:id/updates` on mount.
  - Displays category count summary badges (`Time Exceeded`, `Teacher Feedback`, `Thread Reply`, `New Problem`).
  - Renders updates list with color-coded badges and direct CTA buttons (e.g. "View Problem" button triggering tab change / problem scroll).

#### 2. `client/src/components/ProblemThread.js`
- **Props**: `classroomId`, `problemId`, `problemType`, `classId`, `token`, `currentUser`
- **State**: `messages`, `newMessage`, `isSolution`, `loading`, `sending`
- **Features**:
  - Fetches `/classroom/problem-thread/:problemId`.
  - Renders scrollable message list with sender names, badges (`Solution`, `Trainer`), markdown message content, and timestamps.
  - Interactive emoji reaction bar (`👍`, `❤️`, `🎉`, `💡`, `🚀`) with active user highlight count.
  - Input form for posting reply with `is_solution` check option.

#### 3. `client/src/components/PrioritySettings.js`
- **Props**: `token`, `onSettingsChanged`
- **State**: `priorities`, `emailNotifications`, `saving`
- **Features**:
  - Up/Down reordering arrow buttons or drag-to-reorder for priority categories.
  - Toggle switch for email notification preference (`email_notifications_enabled`).
  - Calls `POST /user/settings` and displays Sonner toast notification on save.

---

## 5. Non-Functional Requirements & Performance Strategy

1. **Zero-Polling Engine**: `time_exceeded` update items are computed dynamically on database load via SQL timestamp comparison. No client `setInterval` or server background cron jobs are used.
2. **Asynchronous Non-Blocking Emails**: Email dispatches inside `postProblemThreadMessage` are fire-and-forget. SMTP timeouts or configuration issues log errors to stdout but never reject HTTP responses.
3. **Optimized SQL Indexes**: Indexes on `problem_threads(problem_id)`, `problem_threads(class_id)`, and `problem_thread_reactions(message_id)` ensure sub-10ms query performance for thread lookups.
4. **Layout & Cleanliness Standards**: No code inside `.agents/`. Client UI code strictly under `client/src/components/` and `client/src/app/`.

---

## 6. Verification Plan

1. **Client Build & Lint**:
   - `cd client && npm run lint`
   - `cd client && npm run build`
2. **Server Compilation Check**:
   - `cd server && bun build src/index.ts --target=bun --outdir .codex-build`
3. **Database Verification**:
   - Execute DDL migration script.
   - Verify `user_settings`, `problem_threads`, `problem_thread_reactions` exist.
   - Verify `classroom_messages` and `classroom_message_reactions` are dropped.
