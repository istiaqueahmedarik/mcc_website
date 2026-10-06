# Original User Request

## Initial Request — 2026-07-28T01:36:38Z

Overhaul the trainer/classroom feature in an existing Next.js + Bun/Hono full-stack application: add an **Updates tab** (first tab for both trainer and student), replace the messaging system with **enhanced problem threads** (chat-like discussions with reactions and inline solution visualization), add **email notifications** with per-category toggles, and cleanly remove the old messaging system.

Working directory: c:\Users\Arik\Desktop\mcc
Integrity mode: development

## Codebase Context

This is an existing production application:
- **Client**: Next.js (React) with Tailwind CSS, shadcn/Radix UI, lucide icons. Source at `client/src/`.
- **Server**: Bun-powered Hono API with raw `postgres.js` queries (no ORM). Source at `server/src/`.
- **Database**: PostgreSQL via `server/src/db.ts`. Schema is managed with runtime `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS` in controllers.
- **Email**: `nodemailer` via `server/src/sendEmail.ts` (Gmail SMTP) — already functional.
- **Existing tables of interest**: `user_settings` (has `email_notifications_enabled`, `update_priorities`), `problem_threads`, `problem_thread_reactions`, `class_problems`, `classroom_topic_problems`, `classroom_topic_problem_progress`, `classroom_messages`, `classroom_message_reactions`.
- **Key files**:
  - Server routes: `server/src/routes/classroomRoute.ts`
  - Server controller: `server/src/controllers/classroomController.ts`
  - Main classroom UI: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  - Trainer dashboard: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  - Email utility: `server/src/sendEmail.ts`
- **Existing Updates endpoint**: `GET /classroom/:id/updates` (`getClassroomUpdates`) already aggregates some updates based on `user_settings.update_priorities`. Extend and enhance this.
- **Existing problem thread tables**: `problem_threads` and `problem_thread_reactions` already exist. Enhance these to support the chat-like thread UX.

## Requirements

### R1. Updates Tab — First Tab for Both Trainer and Student

Add an **Updates** tab to the classroom live view (`ClassroomLiveClient.js`) as the **first tab** for both trainer and student roles.

**Trainer Updates** — aggregated from all students in the classroom:
- Student exceeded problem timer (checked only on initial page load — no polling, no intervals, no WebSockets for this)
- Student replied in a problem thread
- Student submitted a solution (pending approval)
- Student joined or left the classroom
- Attendance anomalies (e.g., absent streak — 3+ consecutive absences)

**Student Updates** — personalized to the student:
- New problem assigned to me
- Teacher feedback on my submission (approved/rejected/tried)
- Teacher replied in a problem thread
- New topic assigned to my team
- New class session scheduled
- New resource added to a topic

**Visualization**: Display updates using a **priority queue layout** — updates are sorted by a configurable priority value per update type. Higher priority items appear first. Within the same priority, sort by recency (newest first).

**Performance constraint**: Timer-exceeded checks must happen in a single SQL query on page load. Never use polling, intervals, or background checks for this. The Updates tab must not degrade page load performance.

### R2. Enhanced Problem Threads — Chat-Like Discussions

Transform the existing `problem_threads` system into a proper **chat-like thread UI** on every problem — both `class_problems` (single/session problems) and `classroom_topic_problems` (topic problems).

Each problem's thread should support:
- **Chat-style messages**: Students and trainers can post text messages (questions, clarifications, feedback) in a chronological thread.
- **Solution submissions visualized in thread**: When a student submits a solution (via the existing submission system — `solution_link`, `solution_code`, `submission_notes`), the submission should appear as a special entry in the thread timeline. Trainer verdict changes (approved/rejected/tried) should also appear as thread entries.
- **Emoji reactions**: Users can react to any thread message with emoji reactions (extend existing `problem_thread_reactions`).
- **Thread identity**: Each thread is scoped to a specific problem. For `class_problems`, the thread key is the class problem ID. For `classroom_topic_problems`, the thread key is the topic problem ID + student ID (since multiple students work on the same topic problem).

Do **not** use polling or WebSockets for thread updates — fetch on component mount and after user actions (send message, react, submit solution).

### R3. Email Notifications with Per-Category Toggles

Send email notifications to the respective trainer or student when update-worthy events occur. Emails are sent server-side when the event is created (e.g., when a student submits a solution, email the trainer; when a trainer gives feedback, email the student).

**Settings UI**: Add a **Notification Settings** section inside each classroom's settings (per-classroom). Show all update categories with individual on/off toggles. Use the `user_settings` table to store per-category email preferences.

**Email content**: Each email should include:
- A clear subject line identifying the classroom and event
- The specific details (problem name, student name, message preview, etc.)
- A direct link back to the relevant problem/thread in the classroom

Use the existing `sendEmail` function from `server/src/sendEmail.ts`.

### R4. Remove Messaging System — Clean Removal

Completely remove the existing classroom messaging/chat system:
- **Server**: Remove routes (`/classroom/:id/chat/send`, `/classroom/:id/chat/history`, `/classroom/:id/chat/reaction`), controller functions (`sendChatMessage`, `getChatMessages`, `toggleChatReaction`), and any table creation/migration code for `classroom_messages` and `classroom_message_reactions`.
- **Client**: Remove the chat drawer/sheet UI from `ClassroomLiveClient.js` and any related components.
- **Database**: Drop `classroom_messages` and `classroom_message_reactions` tables (add DROP TABLE IF EXISTS to the cleanup).

### R5. Priority Management Settings — Drag-to-Reorder UI

Add a **Settings tab** (or section within classroom settings) for each classroom where the trainer can configure update priorities using a **drag-to-reorder interface**.

- Display all update types as draggable cards/rows.
- The order determines priority (top = highest priority, bottom = lowest).
- Persist the priority order in `user_settings.update_priorities` as a JSON array.
- Students should also have access to reorder their own update priorities from a settings section in the classroom.
- Each update type should show a brief description of what it tracks.

## Acceptance Criteria

### Updates Tab
- [ ] Updates tab is the **first tab** in the classroom live view for both trainer and student roles
- [ ] Trainer sees aggregated updates from all students (timer exceeded, thread replies, pending submissions, roster changes, attendance anomalies)
- [ ] Student sees personalized updates (assigned problems, feedback, thread replies, topic assignments, sessions, resources)
- [ ] Updates are sorted by configurable priority, then by recency
- [ ] Timer-exceeded check runs only on page load in a single efficient SQL query
- [ ] No polling, intervals, or WebSocket connections are used for the Updates tab

### Problem Threads
- [ ] Every `class_problem` has a visible thread UI accessible from the problem view
- [ ] Every `classroom_topic_problem` has a visible thread UI accessible from the topic problem view
- [ ] Thread supports posting text messages by both students and trainers
- [ ] Solution submissions appear as special entries in the thread timeline
- [ ] Trainer verdict changes appear as entries in the thread timeline
- [ ] Emoji reactions work on thread messages
- [ ] Thread data is fetched on mount and after user actions — no polling

### Email Notifications
- [ ] Events that generate updates also trigger email to the relevant user (if enabled)
- [ ] Per-category email toggles are configurable in classroom settings
- [ ] Emails include classroom name, event details, and a direct link to the relevant page
- [ ] Email sending does not block the API response (fire-and-forget pattern)

### Messaging Removal
- [ ] Chat routes, controller functions, and UI components are fully removed
- [ ] `classroom_messages` and `classroom_message_reactions` tables are dropped
- [ ] No references to the old messaging system remain in active code

### Priority Settings
- [ ] Drag-to-reorder UI is available in classroom settings for both trainer and student
- [ ] Priority order persists to `user_settings.update_priorities`
- [ ] Changes to priority order are immediately reflected in the Updates tab sort order

### Build Verification
- [ ] `npm run lint` passes in `client/`
- [ ] `npm run build` passes in `client/`
