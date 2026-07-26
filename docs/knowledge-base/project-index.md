# Project Index

## 2026-07-26 - trainer-qa-fixes-20260726 - Trainer QA Fix Scope

Source:
- `docs/rsd/trainer-qa-fixes-20260726-rsd.md`

Fact:
Trainer QA fixes cover classroom roster role pollution, topic resource reader links, trainer form detail analytics/JSON visibility, Group/Groups terminology, validation feedback, board duplicate controls/license CTA, and honest problem preview fallback.

Applies when:
Maintaining trainer classroom People/Groups/Topics/Board/Live tabs, topic resources, trainer form detail analytics, and problem preview display.

Do not overgeneralize:
This does not approve destructive cleanup of existing `classroom_students` rows, schema migrations, public route renames, or tldraw architecture changes.

## 2026-07-25 - student-perceived-difficulty-dashboard-tabs-20260725 - Student Perceived Difficulty & Tabbed Student Dashboard

Source:
- `docs/rsd/student-perceived-difficulty-dashboard-tabs-20260725-rsd.md`

Fact:
Student perceived difficulty flow is supported in `classroom_topic_problem_progress` and `class_problems`. Students can select/rate perceived difficulty when updating problem progress on the Student Dashboard. Team Matrix view (`TeamMatrixClient.js`) displays each student's perceived difficulty under their member column and computes row average difficulty dynamically from student ratings. Student Dashboard (`ClassroomLiveClient.js`) is organized into clean `<Tabs>` navigation (Topics, Live Session & IDE, Challenges, Class History, Team & Roster).

Applies when:
Inspecting or modifying student classroom UI, topic problem progress APIs, or Team Matrix difficulty aggregations.

Do not overgeneralize:
Trainer difficulty assignment defaults remain intact as fallbacks when a student has not rated a problem yet.

## 2026-07-25 - trainer-team-list-matrix-view-20260725 - Trainer Team Matrix View

Source:
- `docs/rsd/trainer-team-list-matrix-view-20260725-rsd.md`

Fact:
In trainer mode, classroom team overview is simplified to a clean list of team cards with high-level stats and a "View Team Matrix" button that navigates to a dedicated page (`/classroom/live/[id]/teams/[teamId]`). The dedicated page renders a Google Sheets spreadsheet matrix view (Judge, Problem ID, Topic, Average Difficulty, and per-member Difficulty & Verdict sub-columns).

Applies when:
Inspecting or editing classroom team displays, trainer analytics, or team problem matrix routing.

Do not overgeneralize:
This changes the classroom live team analytics presentation and adds a team matrix page; core classroom problem data structures remain unchanged.

## 2026-07-25 - Initial RSD Bootstrap

Source:
- `AGENTS.md`

Fact:
The repository has a Next.js client in `client/` and a Bun/Hono server in `server/`.

Applies when:
Planning UI, route-handler, API, trainer, classroom, and verification changes.

Do not overgeneralize:
This index is seeded from package files and initial source inspection. Update it as deeper module ownership becomes known.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Trainer Classroom Navigation

Source:
- `docs/rsd/hide-classrooms-tab-for-trainers-rsd.md`

Fact:
Trainer and admin users should use `Trainer Dashboard` as their classroom management entry point instead of seeing a duplicate top-level `Classrooms` nav item.

Applies when:
Changing role-aware classroom navigation.

Do not overgeneralize:
This is a navigation cleanup only; classroom routes and authorization remain unchanged.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Changed Entry Point

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Fact:
`client/src/components/Navbar.js` now hides the `Classrooms` nav item for users who can use `Trainer Dashboard`, while keeping `Classrooms` visible for logged-in student users.

Applies when:
Checking trainer/admin/student top-level navigation behavior.

Do not overgeneralize:
Direct classroom routes remain valid; this only changes navbar and mobile menu visibility.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Trainer AI Writing Scope

Source:
- `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`

Fact:
Trainer/admin classroom creation and classroom resource authoring should support optional browser-side AI draft assistance for names, titles, descriptions, and resource markdown content.

Applies when:
Changing trainer dashboard classroom creation, classroom live resource sharing, AI writing helpers, or resource authoring flows.

Do not overgeneralize:
AI assistance is draft-only and must not replace manual authoring or change trainer/admin authorization.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Markdown Classroom Resources

Source:
- `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`

Fact:
Classroom resources should support markdown body content while keeping existing URL-only resources readable and linked.

Applies when:
Changing `classroom_resources`, resource APIs, or classroom resource rendering.

Do not overgeneralize:
This requirement is scoped to classroom resources, not courses, achievements, trainer forms, or all markdown content across the site.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Planned Write Scope

Source:
- `docs/tasks/trainer-dashboard-ai-resource-writing-assistant-task-plan.md`

Fact:
The approved implementation scope includes client package dependency files, trainer dashboard classroom creation UI, classroom live resource UI, markdown editor/renderer components, classroom resource controller/schema, and implementation review/knowledge-base artifacts.

Applies when:
Reviewing implementation diffs for this task.

Do not overgeneralize:
Unrelated trainer forms, course editors, achievements, and navbar code are outside this task scope.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Implemented Entry Points

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

Fact:
Superseded for AI by `classroom-resource-reader-problem-preview-20260725`: trainer dashboard classroom creation no longer uses `TrainerWritingAssistant`. Classroom live resources still support URL-only, markdown-only, or URL-plus-markdown resources.

Applies when:
Inspecting trainer dashboard classroom creation or classroom live resource authoring/display.

Do not overgeneralize:
Do not reintroduce trainer/classroom AI helper without a future approved RSD. The resource markdown storage fact remains valid.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Trainer Mode UI Scope

Source:
- `docs/rsd/trainer-mode-ui-refresh-20260725-rsd.md`

Fact:
Trainer mode UI refresh work is scoped to `/trainer/dashboard`, `/trainer/forms`, and `/trainer/forms/[id]` client presentation while preserving existing routes, API calls, state transitions, and authorization guards.

Applies when:
Changing trainer dashboard, trainer form builder, or trainer form management presentation.

Do not overgeneralize:
This does not include classroom live pages, public form pages, server APIs, database schema, or navigation policy unless a future RSD explicitly expands scope.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Implemented Trainer UI Surfaces

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

Fact:
`TrainerDashboardClient`, `TrainerFormsClient`, and `TrainerFormDetailClient` now use a shared operational visual direction with command headers, metric tiles, semantic status accents, responsive panels, and stable icon controls.

Applies when:
Reviewing or extending trainer dashboard, trainer form builder, or trainer form management UI.

Do not overgeneralize:
Classroom live pages, public form pages, and admin pages were not redesigned by this task.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Approved UI Scope

Source:
- `docs/rsd/swiss-minimal-learning-ui-refresh-20260725-rsd.md`

Fact:
Swiss minimal learning UI refresh work is approved for `/trainer/dashboard`, `/classroom/list`, `/classroom/live/[id]` trainer and student views, and `/my_dashboard`, while preserving existing route paths, endpoint strings, handlers, state transitions, polling, and authorization-bearing guards.

Applies when:
Changing trainer dashboard, classroom entry/live classroom, or student dashboard presentation.

Do not overgeneralize:
This approval does not include server APIs, database schema, route/path changes, trainer form pages, package dependencies, or behavior refactors.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Approved Task Plan

Source:
- `docs/tasks/swiss-minimal-learning-ui-refresh-20260725-task-plan.md`

Fact:
The approved implementation runs serially in the main workspace with tasks for baseline guard, Swiss local UI rules, trainer dashboard/classroom list, live classroom trainer view, live classroom student/resources/chat view, student dashboard, and verification/review.

Applies when:
Coordinating or reviewing this Swiss minimal UI refresh.

Do not overgeneralize:
No parallel worktree, server/API, dependency, route-path, or behavior refactor work is approved by this task plan.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Implemented UI Surfaces

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Fact:
`TrainerDashboardClient`, `ClassroomListClient`, `ClassroomLiveClient`, and `MyDashboardClient` now use a quieter Swiss-inspired presentation with compact headers, grid alignment, restrained cards, semantic status accents, and reduced placeholder/decorative content.

Applies when:
Reviewing or extending trainer dashboard, classroom list/live classroom, or student dashboard UI.

Do not overgeneralize:
This implementation did not change route files, server APIs, database schema, package dependencies, auth guards, polling behavior, or trainer form pages.

## 2026-07-25 - past-class-detail-visualization-20260725 - Requirement Scope

Source:
- `docs/rsd/past-class-detail-visualization-20260725-rsd.md`

Fact:
Completed classroom sessions should be visible from `/classroom/live/[id]` with in-page past-class detail, using existing class/problem/resource data before adding routes or schema.

Applies when:
Changing classroom live history, completed class display, class-specific resources, or past problem summaries.

Do not overgeneralize:
This does not approve chat archival, report export, route changes, schema migrations, or broader classroom authorization refactors.

## 2026-07-25 - past-class-detail-visualization-20260725 - Implemented History Surface

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now includes an in-page `Class history` surface that selects completed classes, fetches past problem rows through the existing class problems API, shows solve distribution, and displays class-specific resources.

Applies when:
Reviewing or extending `/classroom/live/[id]` completed-session history and class resource display.

Do not overgeneralize:
No new route, export/report system, class duration model, chat archival, schema migration, or authorization refactor shipped with this task.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Class Tags and Chat Scope

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

Fact:
Trainer problem assignment now uses a global `problem_tag_dictionary` for searchable/createable tags while preserving `class_problems.tags text[]`; classroom chat messages are scoped to `classes.id` through `classroom_messages.class_id`.

Applies when:
Changing trainer problem assignment tags, classroom chat, class history chat, or chat reaction behavior.

Do not overgeneralize:
Existing common chat rows with null `class_id` are preserved but not displayed in class-specific threads unless a future migration/archive requirement approves a mapping.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Auto Requirement Scope

Source:
- `docs/rsd/classroom-resource-reader-problem-preview-20260725-rsd.md`

Fact:
Classroom resource/problem UX work now removes trainer writing AI, adds dedicated classroom resource reader pages, improves long-list handling, and adds problem metadata preview before assignment.

Applies when:
Changing `/classroom/live/[id]` resource authoring/display, resource reader routes, or trainer problem assignment preview behavior.

Do not overgeneralize:
This does not remove unrelated app-wide AI routes or introduce global pagination.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Implemented Resource Reader and Preview

Source:
- `docs/reviews/classroom-resource-reader-problem-preview-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now links resources to `/classroom/live/[classroomId]/resources/[resourceId]`, and `server/src/controllers/classroomController.ts` now provides resource detail and problem metadata preview endpoints.

Applies when:
Changing classroom resource cards, resource notifications, resource reading, or trainer problem assignment preview.

Do not overgeneralize:
Resource reader pages are classroom-scoped; this does not create a general CMS.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Approved Requirement Scope

Source:
- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`

Fact:
Approved classroom work adds reusable topic units, team-topic/problem assignment, team and member solve-count analytics, ephemeral tldraw board broadcast, and a bottom-right pet chat bubble to `/classroom/live/[id]`.

Applies when:
Changing classroom topics, team assignment, class problem analytics, board broadcast, or classroom chat presentation.

Do not overgeneralize:
This approval does not include permanent board storage, external judge solve scraping, global public topic marketplace, AI generation, or unrelated route replacement.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Approved Implementation Plan

Source:
- `docs/tasks/classroom-team-topic-board-chat-20260725-task-plan.md`

Fact:
Implementation is approved as serial main-workspace work with tasks for dependencies/schema, topic-assignment analytics API, board backend, trainer topic UI, board UI, floating pet chat bubble, and verification/review.

Applies when:
Coordinating or reviewing this classroom topic/team/board/chat implementation.

Do not overgeneralize:
No parallel worktrees are planned because approved write scopes overlap.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Implemented Topic Assignment Board Chat

Source:
- `docs/reviews/classroom-team-topic-board-chat-20260725-implementation-review.md`

Fact:
The implementation adds `classroom_topics`, topic resources/problems, team-topic assignment/progress, derived team solve analytics, ephemeral tldraw board broadcast endpoints, and a floating pet chat bubble in `ClassroomLiveClient.js`.

Applies when:
Maintaining classroom topic APIs, trainer topic tabs, student assigned topic cards, board broadcasts, or chat presentation.

Do not overgeneralize:
Board content remains in memory only, topic problems are separate from live-class `class_problems`, and `/pet.lottie` is expected under `client/public/`.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Implemented Team Dashboard and IDE Monitor

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Classroom live now includes topic-resource markdown editor reuse, topic assignment display without team names, a trainer Teams dashboard with member focus cards and a spreadsheet-like problem/member matrix, student CodeMirror IDE access, disabled "Run coming soon", and trainer-readable IDE activity/session monitoring.

Applies when:
Maintaining `/classroom/live/[id]` topic resources, team dashboards, IDE activity monitor, or classroom telemetry.

Do not overgeneralize:
The IDE does not execute code, does not prove plagiarism, and uses near-real-time polling rather than WebSockets.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Requirement Scope

Source:
- `docs/rsd/trainer-ide-tracking-team-edit-20260725-rsd.md`

Fact:
Trainer IDE monitoring should live in its own `/classroom/live/[id]` trainer tab and should poll only after the trainer selects one enrolled student to track.

Applies when:
Changing classroom live trainer tabs, IDE activity monitor reads, or team analytics.

Do not overgeneralize:
This does not introduce IDE WebSockets, code execution, plagiarism scoring, or broader telemetry retention changes.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Implemented IDE Tab and Team Editing

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now has a dedicated trainer `IDE` tab that tracks one selected student through filtered IDE activity reads; Teams and People surfaces can update team members through `/:id/teams/:teamId/members`.

Applies when:
Maintaining trainer live tabs, IDE monitoring, classroom teams, or team membership APIs.

Do not overgeneralize:
The selected IDE monitor still uses bounded HTTP polling, not WebSocket streaming.

## 2026-07-25 - trainer-topics-tab-reorganization-20260725 - Reorganized Trainer Topics Tab

Source:
- `docs/reviews/trainer-topics-tab-reorganization-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` topics tab for trainers has been reorganized into a topic-centric workspace. Inline top form cards were replaced with a Workspace Header (metrics summary, `+ Build Topic`) and contextual Dialog modals (`Create Topic`, `Add Resource`, `Add Problem`, `Assign Team`) accessible directly from Topic Cards.

Applies when:
Maintaining trainer classroom topics presentation, topic resources/problems authoring, or team topic assignment workflows.

Do not overgeneralize:
Underlying database schemas and API controllers for topics remain unchanged; this is a pure presentation and workflow optimization.

## 2026-07-25 - trainer-ide-realtime-solution-verification-20260725 - Realtime IDE Board, Solution Links & Verification

Source:
- `docs/rsd/trainer-ide-realtime-solution-verification-20260725-rsd.md`

Fact:
Classroom IDE now streams student code edits, language changes, and focus states live over WebSockets (`/classroom/:id/ide/ws`). C++ (`@codemirror/lang-cpp`) and Python syntax highlighting are integrated with high-visibility cursor styling and full-screen toggle options. Problem progress schemas support `solution_link`, `solution_code`, and `submission_notes`, with student solve attempts requiring trainer approval (`pending_approval` status) before marking as `solved`.

Applies when:
Inspecting or updating classroom IDE components, live student tracking, problem progress submissions, solution link attachments, or trainer verification APIs.

Do not overgeneralize:
Direct solve override remains accessible to trainers, but student-initiated solve updates now route through pending approval.

## 2026-07-25 - form-toggle-session-attendance-group-rename-20260725 - Form Toggle, Attendance, Session Type/Duration & Group Rename

Source:
- `docs/rsd/form-toggle-session-attendance-group-rename-20260725-rsd.md`

Fact:
- **Form Toggle**: `trainer_forms.accepting_responses` (boolean DEFAULT true) controls public form submissions. Server enforces 403 when closed; trainer UI has a live toggle; public form shows a "Submissions Closed" banner.
- **Session Attendance**: `class_attendance` table (status: present/absent/late/very_late/excused, UNIQUE per class+student). Trainer opens a per-session Attendance Dialog from the session card; attendance is recorded under trainer identity automatically.
- **Session Type & Duration**: `classes.session_type` (DEFAULT 'onsite'), `classes.duration_minutes` (DEFAULT 90), `classes.overflow_minutes`. Schedule form has Session Type and Duration selects. Session cards show type badge, duration badge, and animated live overflow badge (`+Xm Overflow`) when time runs over; `overflow_minutes` is persisted on session complete.
- **Group Terminology**: All user-facing labels use "Group"/"Groups". DB tables (`classroom_teams`) and API routes remain unchanged. Modified: ClassroomLiveClient.js, TeamMatrixClient.js.
- **IDE Beta Mode**: Classroom IDE tab is hidden behind `/* TODO: Classroom IDE Feature (Beta Mode) */` comments.

Applies when:
Inspecting or changing form response control, session scheduling, session type/duration/overflow display, per-session attendance recording, or team/group labeling in ClassroomLiveClient.js.

Do not overgeneralize:
DB table `classroom_teams` and routes `/create-team`, `/teams/:teamId/members` are intentionally not renamed — only UI labels changed.

## 2026-07-25 - driverjs-adhd-onboarding-tours-20260725 - Driver.js ADHD Onboarding Tours

Source:
- `docs/rsd/driverjs-adhd-onboarding-tours-20260725-rsd.md`

Fact:
- **Driver.js Tours**: Interactive, ADHD-friendly onboarding tours added to `TrainerDashboardClient.js` (7 steps) and `ClassroomLiveClient.js` (8 trainer steps, 6 student steps).
- **Auto & Manual Invocation**: Automatically launches on first visit using `localStorage` keys (`mcc_trainer_dashboard_toured`, `mcc_trainer_classroom_toured`, `mcc_student_classroom_toured`). A persistent, floating "Take Tour" button on each page allows users to re-launch the tour manually anytime.
- **ADHD Design Principles**: Bite-sized steps, explicit progress indicator (`Step X of Y`), high contrast title emoji anchors, smooth scrolling, and backdrop-click dismissability (`skipMissingElement: true`).
- **Reusable Hook**: Custom `useTour` hook (`client/src/hooks/useTour.js`) handles initialization, localStorage persistence, and teardown.

Applies when:
Modifying trainer dashboard UI, classroom live layout, onboarding tours, or product walk-throughs.

Do not overgeneralize:
Tours use client-side `localStorage` and DOM target IDs; core classroom APIs, route handlers, and database schemas remain untouched.

## 2026-07-25 - trainer-feature-scalability-futureproofing-20260725 - Trainer Scalability Audit & Future-Proofing

Source:
- `docs/rsd/trainer-feature-scalability-futureproofing-20260725-rsd.md`

Fact:
Comprehensive review of Trainer & Classroom features identifies key scale bottlenecks under high data volume: unindexed text queries in user matching, unbounded form responses / classroom problem JSON payloads, lack of list virtualization in Team Matrix / Form detail, aggressive multi-interval client polling, and synchronous competitive programming scraping. Proposed solutions include B-Tree / expression indexing, paginated endpoints, windowed rendering, visibility-aware polling, and size limits.

Applies when:
Refactoring trainer dashboard, form responses/analytics, classroom live room performance, team matrix rendering, or database indexing.

Do not overgeneralize:
This audit highlights scalability risks across trainer and live classroom modules; implementation requires user review and task plan approval before applying code changes.
