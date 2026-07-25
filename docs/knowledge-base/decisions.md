# Decisions

## 2026-07-26 - trainer-logout-option - Dedicated Trainer Logout Button and Mobile Nav Support

Source:
- `docs/decisions/trainer-logout-option-20260726-decisions.md`

Decision:
1. Pass the `logout` server action (`client/src/lib/action.js`) from `client/src/app/trainer/profile/page.js` to `TrainerProfileClient.jsx`.
2. Add a styled Logout form/button in `TrainerProfileClient.jsx` sidebar.
3. Render a Logout form button in `Navbar.js` mobile sheet for logged-in users.

Applies when:
Managing profile actions for trainers or mobile navigation menu items.

Do not overgeneralize:
Does not change cookie names or server auth endpoints.

## 2026-07-25 - admin-trainers-and-roles-management - Admin Roles Management & UI Standardization

Source:
- `docs/decisions/admin-trainers-and-roles-management-technical-decisions.md`

Decision:
1. Standardize `/admin/trainers` into a modern Trainers & Admin Roles Management Dashboard using standard Shadcn UI components (`Card`, `Table`, `Tabs`, `Badge`, `Button`, `Input`, `Dialog`) instead of ad-hoc custom CSS variables.
2. Add backend endpoints `POST /classroom/admin/toggle-admin` (with sole-admin safety check) and `POST /classroom/admin/create-admin`.
3. Update `client/src/components/Navbar.js` adminTools label to "Manage Trainers & Admins".

Applies when:
Managing user roles (trainers or admins) or updating admin dashboard UI components.

Do not overgeneralize:
Non-admin routes and database table structures remain untouched.


## 2026-07-25 - student-perceived-difficulty-dashboard-tabs-20260725 - Student Perceived Difficulty & Tabbed Dashboard

Source:
- `docs/decisions/student-perceived-difficulty-dashboard-tabs-20260725-technical-decisions.md`

Decision:
1. Store student perceived difficulty ratings in `classroom_topic_problem_progress.student_difficulty` and `class_problems.student_difficulty`. Allow students to rate/update perceived difficulty when solving/trying problems in the Student Dashboard.
2. In `TeamMatrixClient.js`, render each student's submitted perceived difficulty rating under their matrix column (falling back to trainer default problem difficulty if unrated), and calculate row `AVERAGE DIFFICULTY` directly from student perceived difficulty ratings.
3. Reorganize non-trainer Student Dashboard UI in `ClassroomLiveClient.js` using `<Tabs>` navigation (Topics, Live Session & IDE, Challenges, Class History, Team & Roster).

Applies when:
Managing student problem progress, classroom student dashboard navigation, or Team Matrix difficulty aggregations.

Do not overgeneralize:
This adds student-perceived difficulty ratings and reorganizes the student classroom view into tabs; core classroom live sockets, board sync, and trainer views remain intact.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Local Navbar Condition

Source:
- `docs/decisions/hide-classrooms-tab-for-trainers-technical-decisions.md`

Decision:
Hide `Classrooms` for trainer/admin users by applying a local render condition in `client/src/components/Navbar.js`, not by adding a new shared navigation policy abstraction.

Applies when:
Only one existing nav item needs role-based visibility cleanup.

Do not overgeneralize:
Use a shared policy/helper only if the same role visibility rule is duplicated across multiple components or routes.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Browser-Side Gemma Helper

Source:
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`
- `docs/adr/0001-browser-side-gemma-webgpu-writing-assistant.md`

Decision:
Superseded for classroom/resource authoring by `classroom-resource-reader-problem-preview-20260725`: trainer writing assistance no longer uses a lazy client-only `@huggingface/transformers` integration.

Applies when:
Adding AI draft assistance to trainer classroom/resource authoring.

Do not overgeneralize:
This stale decision should not guide classroom/resource work. Reintroduce AI only under a future approved RSD.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Markdown Resource Storage

Source:
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`
- `docs/adr/0002-markdown-source-classroom-resources.md`

Decision:
Classroom resource markdown should be stored as nullable source text in `classroom_resources.content`, with `url` nullable and validation requiring title plus URL or content.

Applies when:
Changing classroom resource schema, API, rendering, or editor flows.

Do not overgeneralize:
This does not change courses, achievements, trainer forms, or other markdown-backed content models.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Trainer UI Refresh Scope

Source:
- `docs/decisions/trainer-mode-ui-refresh-20260725-technical-decisions.md`

Decision:
Trainer mode UI refreshes should use existing Tailwind, shadcn/Radix components, and lucide icons inside trainer client components instead of adding UI dependencies or changing routes/process.

Applies when:
Improving trainer dashboard, trainer form builder, or trainer form detail presentation.

Do not overgeneralize:
This decision does not block future route, API, or design-system changes when a new RSD explicitly requires them.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Swiss UI Refresh Scope

Source:
- `docs/decisions/swiss-minimal-learning-ui-refresh-20260725-technical-decisions.md`

Decision:
Implement the Swiss minimal learning UI refresh as client presentation-only changes in `TrainerDashboardClient.js`, `ClassroomListClient.js`, `ClassroomLiveClient.js`, and `MyDashboardClient.js`, using existing Tailwind, shadcn/Radix UI, and lucide icons.

Applies when:
Refreshing trainer dashboard, classroom list/live classroom, or student dashboard UI under this task.

Do not overgeneralize:
This does not approve server/API/schema/auth/path changes, dependency changes, trainer form redesigns, or behavior refactors.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Serial Main Workspace Implementation

Source:
- `docs/decisions/swiss-minimal-learning-ui-refresh-20260725-technical-decisions.md`

Decision:
Run implementation serially in the main workspace because `ClassroomLiveClient.js` owns overlapping trainer/student/resource/chat surfaces and existing dirty changes overlap approved files.

Applies when:
Planning this Swiss minimal refresh implementation.

Do not overgeneralize:
Future tasks may still use parallel worktrees when write scopes are clean and disjoint.

## 2026-07-25 - past-class-detail-visualization-20260725 - In-Page History Detail

Source:
- `docs/decisions/past-class-detail-visualization-20260725-technical-decisions.md`

Decision:
Completed class detail should be added in-page to `/classroom/live/[id]`, using the existing class-problem API on selection and an additive all-resources classroom detail payload filtered by `class_id` in the client.

Applies when:
Extending completed class history, class resources, or classroom live detail visualization.

Do not overgeneralize:
This does not approve a new history route, report export system, schema migration, or chat-per-class archival model.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Class-Scoped Chat Storage

Source:
- `docs/decisions/trainer-class-tags-chat-shadcn-refresh-20260725-technical-decisions.md`

Decision:
New classroom chat messages should require a `class_id`, and history queries should filter by both `classroom_id` and `class_id`; old null-`class_id` common messages remain stored but hidden from class-specific chat.

Applies when:
Changing live class chat, completed class chat history, chat reactions, or classroom message migrations.

Do not overgeneralize:
Do not backfill old common messages into all classes without a user-approved migration rule.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Remove Trainer Writing AI

Source:
- `docs/decisions/classroom-resource-reader-problem-preview-20260725-technical-decisions.md`

Decision:
Remove `TrainerWritingAssistant`, its browser-side Gemma helper, and the `@huggingface/transformers` dependency from classroom/resource authoring.

Applies when:
Reviewing trainer dashboard classroom creation or classroom resource authoring after this task.

Do not overgeneralize:
This supersedes ADR-0001 only for the trainer/classroom writing assistant; unrelated AI APIs are out of scope.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Resource Reader Route

Source:
- `docs/decisions/classroom-resource-reader-problem-preview-20260725-technical-decisions.md`

Decision:
Classroom resources should open in a dedicated reader route under `/classroom/live/[classroomId]/resources/[resourceId]`, with server-side access validation.

Applies when:
Adding links, notifications, or display changes for classroom resources.

Do not overgeneralize:
Inline resource excerpts can still exist on dashboards; the reader page is for focused reading.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Classroom-Scoped Topic Model

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`
- `docs/adr/0003-classroom-topic-team-assignment-model.md`

Decision:
Classroom topic units should be classroom-scoped, with topic resources/problems stored separately from `classroom_resources` and `class_problems`.

Applies when:
Adding, listing, assigning, or authorizing reusable classroom topics and topic resources/problems.

Do not overgeneralize:
This does not create a global topic catalog, trainer-wide reusable catalog, or external YouKn0wWho import.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Team Topic Assignment Separate From Class Problems

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`
- `docs/adr/0003-classroom-topic-team-assignment-model.md`

Decision:
Team-topic assignments should use assignment/progress tables instead of making `class_problems.class_id` nullable or materializing all per-student rows up front.

Applies when:
Implementing team-topic problem work, solve-status updates, and team/member analytics.

Do not overgeneralize:
Existing live-class `class_problems` behavior remains class-bound and student-bound.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Ephemeral tldraw Sync

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`
- `docs/adr/0004-ephemeral-tldraw-board-sync.md`

Decision:
Live classroom board should use app-controlled tldraw sync over Bun/Hono WebSocket with in-memory room state, short-lived join tokens, and PostgreSQL metadata only.

Applies when:
Changing classroom board broadcast, tldraw integration, WebSocket authorization, or board session lifecycle.

Do not overgeneralize:
This does not approve public tldraw demo rooms, Cloudflare Durable Objects/R2 deployment, permanent drawing storage, or asset uploads.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Classroom IDE Monitor Storage

Source:
- `docs/adr/0005-classroom-ide-monitoring.md`

Fact:
Classroom IDE monitoring stores one latest session snapshot per classroom/student plus append-only event rows for focus, visibility, paste, large insert, language change, code update, and heartbeat activity.

Applies when:
Adding, reviewing, or querying classroom IDE monitor features.

Do not overgeneralize:
This is not a code runner, cheating detector, or global IDE outside classroom live pages.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Hide Topic-to-Team Mapping in Topic Cards

Source:
- `docs/decisions/trainer-team-dashboard-ide-monitor-20260725-technical-decisions.md`

Fact:
Topic library cards should show aggregate assignment state without rendering which team received which topic.

Applies when:
Changing topic library assignment badges or team dashboard presentation.

Do not overgeneralize:
Trainer-only analytics may show team progress and IDE snapshots, but topic cards should not expose the topic-to-team mapping.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Selected Student IDE Reads

Source:
- `docs/decisions/trainer-ide-tracking-team-edit-20260725-technical-decisions.md`

Decision:
Trainer IDE monitoring should reuse `classroom_ide_sessions` latest snapshots and filter `listClassroomIdeActivity` by selected `studentId` instead of polling all classroom IDE sessions.

Applies when:
Changing trainer IDE monitoring, activity logs, polling, or classroom telemetry queries.

Do not overgeneralize:
Whole-class session reads remain available for compatibility, but live polling UI should prefer selected-student reads.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Team Membership Replacement Endpoint

Source:
- `docs/decisions/trainer-ide-tracking-team-edit-20260725-technical-decisions.md`
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

Decision:
Trainer team editing replaces a team's member set through one server endpoint after validating trainer permission, team classroom ownership, UUID shape, and student enrollment.

Applies when:
Changing classroom team membership editing, assignment targeting, or team analytics membership assumptions.

Do not overgeneralize:
This is not a team rename/delete workflow and does not create trainer-wide team templates.

## 2026-07-25 - trainer-ide-realtime-solution-verification-20260725 - Realtime IDE WebSocket Stream & Solution Verification

Source:
- `docs/decisions/trainer-ide-realtime-solution-verification-20260725-technical-decisions.md`

Decision:
1. Real-time IDE Monitoring: Stream student code edits and activity live over Bun/Hono WebSocket endpoint `/classroom/:id/ide/ws`, eliminating 5-second HTTP polling.
2. CodeMirror Language Support: Add `@codemirror/lang-cpp` and `@codemirror/lang-python` with explicit high-contrast `.cm-cursor` CSS styling.
3. Full Screen Mode: Add toggleable overlay workspace in `ClassroomIdePanel.jsx`.
4. Solution Submissions: Require solution links and code snippets for student solve submissions; transition status to `pending_approval` until trainer review/approval (`verifyClassroomTopicProblemProgress`).

Applies when:
Developing or modifying classroom IDE streaming, problem solve workflows, solution link attachments, or trainer approval features.

Do not overgeneralize:
Trainer direct solve overrides are preserved, but student progress submissions require verification.

## 2026-07-25 - form-toggle-session-attendance-group-rename-20260725 - Form Toggle, Attendance, Session Type/Duration, Group Rename

Source:
- `docs/decisions/form-toggle-session-attendance-group-rename-20260725-technical-decisions.md`

Decision:
1. Form Submission Toggle: Added `accepting_responses` boolean (DEFAULT true) to `trainer_forms`. Server returns 403 on POST when `accepting_responses = false`. Trainer sees a live toggle switch; public form shows a "Submissions Closed" banner.
2. Session Attendance: Created `class_attendance` table with `status IN ('present', 'absent', 'late', 'very_late', 'excused')` and UNIQUE(class_id, student_id). Trainer opens a per-session Attendance Dialog; attendance is auto-recorded under the authenticated trainer's identity (`recorded_by`, `trainer_name`).
3. Session Type & Duration: Added `session_type` (DEFAULT 'onsite') and `duration_minutes` (DEFAULT 90) to `classes`. `overflow_minutes` is calculated and persisted at `completeClass`. Live overflow badge (`+Xm`) shown on session cards when elapsed > duration.
4. Group Terminology: Do NOT rename `classroom_teams` table or API routes. All user-facing labels (tab, headers, buttons, badges) use "Group" / "Groups" instead of "Team" / "Teams".
5. IDE Feature Beta Mode: Classroom IDE monitoring tab hidden with `/* TODO: Classroom IDE Feature (Beta Mode) */` comments in code; TabsTrigger and TabsContent are commented out.

Applies when:
Modifying trainer form response control, session creation forms, session attendance workflows, classroom session cards, or any user-facing team/group labels.

Do not overgeneralize:
Database table and API route names (`classroom_teams`, `create-team`, `teams/:teamId/members`) remain unchanged to preserve schema and endpoint stability.

## 2026-07-26 - admin-change-user-password-20260726 - Admin Password Reset for Any User

Source:
- `docs/decisions/admin-change-user-password-20260726-decisions.md`

Decision:
1. Endpoint: Added `POST /classroom/admin/change-password` endpoint in `server/src/routes/classroomRoute.ts` backed by `changeUserPassword` in `server/src/controllers/classroomController.ts`.
2. Authorization: Strictly requires JWT authentication and `admin === true` status.
3. Password Validation & Hashing: Password must be at least 8 characters long and is hashed using `Bun.password.hash(newPassword)`.
4. User Management Interface: Integrated password modification into `/admin/trainers` (`TrainersManagementClient.js`) via a "Password" button per user row and a dedicated `Dialog` modal with visibility toggles and validation feedback.

Applies when:
Modifying admin user management, user credentials, password overrides, or `/admin/trainers`.

Do not overgeneralize:
Does not alter public email OTP password reset flow (`resetPassword`) or logged-in user profile password changes.

## 2026-07-26 - user-change-own-password-20260726 - Self-Service Password Change for Authenticated Users

Source:
- `docs/decisions/user-change-own-password-20260726-decisions.md`

Decision:
1. Endpoint: `POST /auth/user/change-password` in `authRoute.ts` backed by `changeOwnPassword` in `authController.ts`, secured by existing `/user/*` JWT middleware.
2. Authorization: Requires valid JWT token; verifies current password via `Bun.password.verify` before applying hash update.
3. Client Action: `changeOwnPassword(currentPassword, newPassword)` exported from `client/src/lib/action.js`.
4. UI: Shared `ChangePasswordModal` component at `client/src/components/ChangePasswordModal.js` with eye-toggle inputs, client-side validation, and success/error alerts — mounted in both `ProfileSidebarEditor.jsx` (`/profile`) and `TrainerProfileClient.jsx` (`/trainer/profile`).

Applies when:
Modifying user profile pages, account security settings, or password management flows.

Do not overgeneralize:
Does not alter admin-initiated password override (`POST /classroom/admin/change-password`) or OTP-based public password reset (`POST /auth/reset-password`).
