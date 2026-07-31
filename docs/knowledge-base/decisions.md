# Decisions

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Student Thread Submission References

Source:
- `docs/decisions/trainer-submission-thread-bubbles-20260801-technical-decisions.md`
- `docs/adr/0009-student-thread-submission-reference-metadata.md`

Decision:
Pending-submission discussion bubbles must use the active student-scoped classroom thread model, not legacy `ProblemThread`. Referenced messages and attachments store a server-generated `metadata.submission_reference` object in `classroom_student_thread_messages.metadata`, after validating the live `class_problems` row or topic `classroom_topic_problem_progress` row belongs to the route classroom, selected thread student, and still has `pending_approval` status. Normal thread bubbles send ordinary messages without requiring a submission reference.

Applies when:
Changing student-thread message/attachment endpoints, pending-submission review actions, `ClassroomThreadsTab.js`, floating thread bubbles, or submission-reference rendering.

Do not overgeneralize:
Do not let chat messages approve/reject submissions, trust client-provided reference labels, revive problem-thread bubbles as active UI, store solution code or private file paths in reference metadata, or use bubble keys as authorization.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Student Thread Realtime Model

Source:
- `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
- `docs/adr/0008-classroom-student-thread-realtime-model.md`

Decision:
Classroom communication should use `Updates` as first/default notification UI, `Threads` as the only active conversation surface, and `Settings` for update priority/email preferences. `Threads` is one classroom-level trainer-student chat per active real student, with human messages, system event bubbles, private safe-file attachments, and Supabase Realtime used only as opaque invalidation before JWT-authorized refetch. Old problem-thread UI/data is legacy and should not be destructively deleted in this release.

Applies when:
Changing classroom tabs, student/trainer thread UI, thread APIs, thread schema, classroom event mirroring, Supabase Realtime channels, attachment storage/access, Updates priority settings placement, or old problem-thread entry points.

Do not overgeneralize:
Do not add student-to-student chat, direct browser writes to private classroom tables, public attachment URLs, full message payloads in realtime broadcasts, hidden polling, student-owned final verdicts, or migrations that delete/copy old problem-thread data without a separate approved plan.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Group, Topic, Schedule, and Submission Decisions

Source:
- `docs/decisions/trainer-feature-futureproof-crud-schedule-submission-20260727-decisions.md`

Decision:
Use bounded member previews instead of virtualization for People/Groups cards; derive session edit end time client-side and persist only existing `durationMinutes`; complete Topics CRUD with existing topic update plus focused resource/problem/unassign endpoints while using archive for topic removal; store submission code language in existing `solution_code` as fenced Markdown; accept code-or-link proof while keeping trainer-owned final verdicts.

Applies when:
Changing `ClassroomLiveClient.js` group member display, session edit dialog, Topics CRUD, `classroomController.ts` topic/progress APIs, `classroomRoute.ts` topic routes, or live challenge proof submission/review.

Do not overgeneralize:
Do not add DB columns, code execution, external judge verification, public/private URL checks, new dependencies, or destructive topic deletion beyond focused safe endpoints without a new RSD.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Student Tabs And Schedule Time

Source:
- `docs/decisions/trainer-student-tabs-schedule-time-20260727-decisions.md`
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Decision:
Keep student tab values stable while reordering visible navigation to `Topics`, `Challenges`, `Live Sessions & IDE`, `Group & Roster`, and `Attendance`. For class schedule create/edit, treat browser `datetime-local` values as local wall time and convert them to ISO before POST; server endpoints validate and normalize scheduled time to ISO before writing.

Applies when:
Changing `ClassroomLiveClient.js` student tabs/tour or `classroomController.ts` schedule create/edit paths.

Do not overgeneralize:
Do not infer a global timezone settings system or old-row migration from this fix.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Pre-Enrolled Identity Model

Source:
- `docs/decisions/trainer-pre-enrolled-students-20260727-technical-decisions.md`
- `docs/adr/0006-classroom-pre-enrolled-student-identities.md`

Decision:
Represent trainer-created pre-enrolled classroom students as disabled `users` placeholder identities plus explicit `classroom_students.enrollment_status` values (`active`, `pre_enrolled`, `link_pending`). Trainer-side roster workflows can include all three states, but student-facing classroom access requires active real membership. Signup/profile MIST ID matches create pending claims for trainer approval, not immediate access.

Applies when:
Changing classroom enrollment, roster reads, group/attendance/problem target validation, student classroom access checks, signup/profile MIST ID linking, or pre-enrollment approval flows.

Do not overgeneralize:
Do not use placeholders as login-capable accounts, do not auto-grant classroom access from unverified self-entered IDs, and do not remove role-clean student checks for trainer/admin accounts.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Live Progress UI-Only Refresh

Source:
- `docs/decisions/trainer-live-progress-design-refresh-20260727-decisions.md`
- `docs/tasks/trainer-live-progress-design-refresh-20260727-task-plan.md`

Decision:
Refresh trainer Live progress inside `ClassroomLiveClient.js` only, preserving endpoint strings, handlers, status behavior, class completion, notes/hints dialog logic, authorization-bearing checks, and polling behavior. Use local summary counts and a full-width table with a clearer pending submission CTA.

Applies when:
Editing trainer Live progress table layout or pending submission presentation.

Do not overgeneralize:
Do not extract global table components or change server/API behavior for this UI-only task.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Student Challenge Verification and Duration

Source:
- `docs/decisions/student-challenge-submission-duration-20260726-decisions.md`
- `docs/tasks/student-challenge-submission-duration-20260726-task-plan.md`

Decision:
Student Challenge tab live-class submissions should reuse existing `class_problems` proof fields and submit a required link to `pending_approval`; server authorization must keep final live problem verdicts (`solved`, `tried`, `not_solved`) trainer-owned. New/edit session duration should be custom positive integer minutes, with only database-safe integer bounds rather than product caps such as 180 or 1440 minutes.

Applies when:
Changing `ClassroomLiveClient.js` student Challenge cards, `updateProblemStatus`, trainer live problem review, or `classes.duration_minutes` validation.

Do not overgeneralize:
This does not add external judge verification, new tables, topic workflow redesign, or hidden classroom polling.

## 2026-07-26 - classroom-live-stop-polling-20260726 - Stop Classroom Live Polling

Source:
- `docs/decisions/classroom-live-stop-polling-20260726-technical-decisions.md`

Decision:
Classroom live should not use interval polling or browser visibility-triggered refetches for chat, classroom details, topics, board state, or IDE activity. Use initial loads, explicit refresh/action-driven fetches, and event-driven WebSocket streams where present.

Applies when:
Changing `ClassroomLiveClient.js` or `ClassroomIdePanel.jsx` network behavior.

Do not overgeneralize:
This does not ban user-clicked refreshes, mutation follow-up fetches, or non-network countdown timers.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Bulk Import and Notification Decisions

Source:
- `docs/decisions/trainer-bulk-import-feedback-notifications-20260726-technical-decisions.md`

Decision:
Trainer CSV imports should parse locally in the browser with a mapping/preview step, avoid new CSV dependencies, use explicit student lookup method (`email` or `mist_id`), call batch server endpoints for student enrollment and problem assignment, use existing Sonner plus button disabled/loading state for feedback, and remove the classroom in-app notification path including bell UI, client/server notification routes, DB inserts, broadcasts, and classroom notification email side effects.

Applies when:
Implementing or reviewing trainer classroom bulk import, classroom notifications, student lookup, or problem assignment changes.

Do not overgeneralize:
This does not remove email data or unrelated account/team-collection email workflows, and it does not add `.xlsx` support.

## 2026-07-26 - trainer-qa-fixes-20260726 - Auto-Mode Trainer QA Fix Decisions

Source:
- `docs/decisions/trainer-qa-fixes-20260726-technical-decisions.md`

Fact:
Trainer QA fixes should prevent future trainer/admin student pollution and filter polluted rosters without destructive cleanup; extend existing classroom resource reader lookup for topic resources; fix trainer form analytics client-side from existing response JSON; keep DB/API `team` names while user-facing copy says Group; use honest unavailable metadata fallbacks; and keep board fixes presentation-only.

Applies when:
Fixing or reviewing trainer classroom roster, topic resource, form analytics, group terminology, problem preview, or board UI behavior.

Do not overgeneralize:
Do not delete existing enrollment rows or rename API/database contracts without a separate explicit approval.

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

## 2026-07-27 - optional-problem-difficulty-trainer-feature-20260727 - Optional Problem Difficulty for Trainer Feature

Source:
- `docs/decisions/optional-problem-difficulty-trainer-feature-20260727-technical-decisions.md`

Decision:
1. Client UI Forms: Initial problem difficulty state defaults to empty string (`""`). Dropdown select menus include a `"None"` (value `""`) option for both live problem assignments and topic unit problem forms.
2. Server Controller Fallbacks: `assignProblem`, `addClassroomTopicProblem`, `updateClassroomTopicProblem`, and `bulkAssignProblems` in `server/src/controllers/classroomController.ts` accept empty string or null difficulty values without substituting `"Medium"` or `"Trainer selected"`.
3. Display & Badges: Problem cards and list items conditionally omit difficulty badges when difficulty is empty/unspecified instead of rendering forced default badges.
4. Schema: No database schema migration needed; existing TEXT column stores empty string or NULL directly.

Applies when:
Modifying problem creation, topic problem forms, problem list badges, or problem assignment controllers.

Do not overgeneralize:
Does not alter student perceived difficulty rating feedback scale (1-5).

## 2026-07-28 - trainer-updates-problem-threads-20260728 - Problem Threads, Updates, and Classroom Email Settings

Source:
- `docs/decisions/trainer-updates-problem-threads-20260728-technical-decisions.md`
- `docs/adr/0007-classroom-problem-thread-update-model.md`

Decision:
1. Updates load on first tab mount and explicit refresh/action only; no polling, visibility refetch, cron, or global notification broadcast.
2. Classroom update types use a fixed taxonomy with role filtering and user-managed priority ordering.
3. Classroom update settings are namespaced user settings, separate from auth/password/non-classroom email behavior.
4. Problem threads use explicit live-problem or topic-assignment/topic-problem references, not loose `problem_id text` polymorphism.
5. Existing live/topic submission and verification endpoints remain authoritative; thread entries mirror successful submission, feedback, and status events.
6. Classroom email sends only for event-backed updates in v1; `time_exceeded` is visual-only unless a future deduplicated email event model is approved.
7. Generic classroom messaging is removed from the active surface without destructive table drops in unrelated runtime helpers.
8. Update read state uses per-user classroom read receipts keyed by stable server-generated update keys; mark-all-read marks currently visible authorized updates only.
9. Threads are accessed from problem cards/lists and authenticated problem-surface deep links, with server authorization checked on every read/post/reaction. Updates is notification/read-state only and must not open thread dialogs.

Applies when:
Implementing or reviewing classroom Updates, problem threads, classroom email preferences, old chat removal, or problem submission visualization.

Do not overgeneralize:
This does not approve realtime notifications, polling, global notification bells, page-load email side effects, public thread links, or destructive cleanup of old chat tables.

## 2026-07-29 - trainer-updates-problem-threads-20260728 - Implemented Route and Data Model

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Decision:
The implemented route shape is classroom-scoped: `GET /classroom/:id/updates`, `POST /classroom/:id/updates/read`, `POST /classroom/:id/updates/read-all`, `GET /classroom/:id/problem-thread/:problemId`, `POST /classroom/:id/problem-thread/:problemId`, `POST /classroom/:id/problem-thread/reaction`, and `/user/classroom-settings` GET/POST. Topic problem thread access requires `assignmentId`.

Applies when:
Updating clients, tests, or docs for classroom Updates and problem threads.

Do not overgeneralize:
Do not reintroduce the old global `/classroom/problem-thread/:problemId` route shape; it lacks enough classroom and topic-assignment context.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Student Thread Communication Model

Source:
- `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
- `docs/adr/0008-classroom-student-thread-realtime-model.md`
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Decision:
1. `Updates` remains the first/default notification surface.
2. `Threads` is the only active classroom conversation surface and is one thread per `(classroom_id, student_id)`.
3. `Settings` owns classroom update priority ordering and classroom update email preferences.
4. Server APIs own thread reads, writes, attachment upload/access, and authorization.
5. Supabase Realtime carries only opaque invalidation payloads; clients refetch authorized content through MCC APIs.
6. Safe attachments use private Supabase Storage metadata plus short-lived signed URLs.
7. Legacy problem-thread UI is gated off without destructive table deletion.

Applies when:
Changing classroom chat, problem/thread UI, attachment behavior, classroom realtime, or notification settings.

Do not overgeneralize:
Do not let browser-side Supabase writes bypass MCC JWT/classroom authorization, and do not treat realtime payloads as the source of message content.
