# Project Index

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Approved Implementation Plan

Source:
- `docs/tasks/trainer-student-thread-instant-realtime-20260802-task-plan.md`

Fact:
Instant student-thread work proceeds serially through additive SQL, removal of runtime DDL, private shadow-identity Realtime authorization/registry/publishing, transactional read/write/catch-up APIs, client private subscription/renewal/state isolation, local/live verification, and implementation review. SQL must be applied before server/client code depends on revisions, idempotency, registry uniqueness, and private policies.

Applies when:
Coordinating or reviewing the instant student-thread implementation and deployment order.

Do not overgeneralize:
The plan does not approve destructive down migrations, public fallback, service-key exposure, broad project-wide RLS cleanup, or claiming two-browser latency without measured sessions.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Approved Technical Design

Source:
- `docs/decisions/trainer-student-thread-instant-realtime-20260802-technical-decisions.md`
- `docs/adr/0011-private-gap-free-classroom-thread-realtime.md`

Fact:
The approved instant-thread design uses an MCC-authorized, server-managed Supabase Auth shadow identity with the MCC UUID and `anon` role; private receive-only Realtime RLS bound to the active channel registry; canonical safe message payloads after commit; per-thread revision catch-up; transactional/idempotent sends; membership-lifecycle thread provisioning; expiring renewed topics; and browser generation guards. ADR-0011 supersedes ADR-0010's scoped-public-topic transport and ADR-0008's opaque-refetch transport choice while preserving the student-scoped product model.

Applies when:
Implementing or reviewing the instant student-thread migration, server auth bridge, Realtime hook, thread controller, registry lifecycle, or catch-up UI.

Do not overgeneralize:
The shadow token does not authorize direct application-table access and must remain `anon`; a future signing-key bridge or role change requires a new security decision.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-student-thread-instant-realtime-20260802-rsd.md`

Fact:
Trainer/student thread realtime is approved for an instant, private, gap-free delivery redesign. The healthy receive path must render canonical committed messages without per-message HTTP refetches; reconnects and initial subscription must catch up with a stable `(created_at, id)` cursor; writes must be transactional and idempotent; thread switching must reject stale responses; request-time DDL and read-path provisioning writes must be removed; and two-session commit-to-render latency targets are p50 at or below 250 ms and p95 at or below 750 ms.

Applies when:
Changing student-thread Realtime credentials/channels, thread/manager payloads, message transactions, attachment persistence, cursor pagination, idempotency, browser thread state, channel renewal, classroom schema guards, or realtime latency telemetry.

Do not overgeneralize:
This does not approve direct browser application-table writes, service-key exposure, public message payloads, hidden polling, legacy problem-thread revival, broad UI redesign, or unrelated project-wide RLS remediation. The solution must not widen the existing public-schema exposure.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Implemented Entry Points

Source:
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`

Fact:
Trainer/student thread realtime hardening passed implementation-review approval on 2026-08-02. It is implemented through scoped SQL in `docs/sql/trainer-student-thread-realtime-hardening-20260802.sql`, server-issued opaque channel helpers in `server/src/utils/classroomStudentThreadsSchema.ts`, student-thread summary/message routes in `server/src/controllers/classroomController.ts` and `server/src/routes/classroomRoute.ts`, uncached authorized fetch support in `client/src/lib/action.js`, broadcast-envelope handling in `client/src/hooks/useClassroomThreadRealtime.js`, and incremental list/thread updates in `client/src/components/ClassroomThreadsTab.js`.

Applies when:
Maintaining trainer/student classroom threads, Realtime channel issuance, thread-message fetches, trainer thread-list invalidation, attachment broadcasts, or student-thread SQL/RLS/index setup.

Do not overgeneralize:
This implementation does not add a global Supabase private-channel JWT bridge, browser table access, full message payloads in Realtime, hidden polling, or broad unrelated Supabase advisor cleanup.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Approved Implementation Plan

Source:
- `docs/tasks/trainer-student-thread-realtime-hardening-performance-20260802-task-plan.md`

Fact:
Trainer/student thread realtime hardening should proceed serially through baseline safety checks, scoped SQL/RLS/index deployment, removal of request-time thread DDL, server-issued scoped realtime channels, lightweight message and summary APIs, attachment broadcast ordering cleanup, client incremental realtime fetches, verification, and implementation review.

Applies when:
Coordinating or reviewing changes to student-thread RLS/grants/indexes, `classroomStudentThreadsSchema.ts`, student-thread controller/routes, `ClassroomThreadsTab.js`, or the thread realtime hook.

Do not overgeneralize:
This plan does not approve unrelated Supabase advisor remediation, private-channel auth integration, hidden polling, UI redesign, or legacy problem-thread migration.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-student-thread-realtime-hardening-performance-20260802-rsd.md`

Fact:
Trainer/student classroom thread hardening is approved to fix Supabase Realtime security exposure, public-schema RLS exposure, request-time DDL slowness, heavy realtime refetches, missing trainer list realtime, attachment broadcast ordering, and student-thread indexes while preserving the existing student-scoped thread product model.

Applies when:
Changing `ClassroomThreadsTab.js`, `useClassroomThreadRealtime.js`, student-thread APIs, student-thread schema/indexes, Supabase Realtime broadcast channels, private attachment flow, or request-time schema guards used by classroom thread paths.

Do not overgeneralize:
This does not approve UI redesign, legacy problem-thread migration/deletion, direct browser writes to private classroom tables, full private payloads in Realtime, hidden polling, or changes to student submission final-verdict ownership.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-compact-ui-cleanup-20260802-rsd.md`

Fact:
Trainer compact UI cleanup is approved as a UI-only redesign for `/trainer/dashboard`, `/trainer/forms`, and `/trainer/forms/[id]`, focused on reducing visual clutter and improving mini-laptop readability while preserving existing routes, API endpoints, state transitions, authorization behavior, and trainer workflows.

Applies when:
Changing trainer dashboard classroom presentation, trainer form-builder layout, trainer form-detail analytics/explore/JSON presentation, permanent tour launcher treatment, or compact trainer operational UI.

Do not overgeneralize:
This does not approve server/API changes, database changes, auth changes, classroom live internals, new dependencies, route changes, or a global design-system rewrite.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Implemented Entry Points

Source:
- `docs/reviews/trainer-compact-ui-cleanup-20260802-implementation-review.md`

Fact:
Trainer compact UI cleanup is implemented in `TrainerDashboardClient.js`, `TrainerFormsClient.js`, and `TrainerFormDetailClient.js`. Dashboard uses a compact command header, metric strip, static live-session strip, slim classroom operation items, and icon-only tour launcher. Form builder uses tighter setup/type/identity/target panels, compact cell presets, denser field queue rows, and bounded supporting panels. Form detail uses compact title/status/actions, share/metric strip, lighter tabs, and tighter analytics/explore/JSON panels.

Applies when:
Maintaining trainer route presentation, compact trainer dashboard, trainer form-builder layout, trainer form response review, or mini-laptop trainer UI.

Do not overgeneralize:
This implementation did not change server/API routes, auth, database schema, trainer workflows, or classroom live internals.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Implemented Entry Points

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Fact:
Submission-context thread bubbles are implemented through `client/src/components/StudentThreadBubbleDock.js`, bubble-mode props on `client/src/components/ClassroomThreadsTab.js`, pending-submission entry points in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, and server-side reference validation in `server/src/controllers/classroomController.ts`. Text and attachment sends may include optional `submissionReference`; the server resolves live/topic pending rows and persists canonical `metadata.submission_reference`.

Applies when:
Maintaining trainer live pending submissions, topic pending submission cards, normal `Threads` open-as-bubble behavior, student-thread message rendering, or student-thread message/attachment APIs.

Do not overgeneralize:
This does not make chat messages update verdicts, trust client-provided reference labels, expose solution code in chat metadata, enable student-to-student chat, or revive legacy `ProblemThread` as the active bubble UI.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-submission-thread-bubbles-20260801-rsd.md`

Fact:
Trainer pending-submission workflows are approved to open the submitted student's existing student-scoped classroom thread as a floating bubble for both live class and topic submissions. Messages and attachments sent from a submission-context bubble must store server-validated submission-reference metadata visible to both trainer and student, while normal `Threads` conversations can also open as bubbles without requiring a submission reference.

Applies when:
Changing classroom pending-submission review actions, student-thread message metadata, floating thread bubbles, `ClassroomThreadsTab.js`, `FloatingThreadDock.js`, or student-thread message/attachment endpoints.

Do not overgeneralize:
This does not revive legacy problem threads, change final verdict ownership, expose cross-student submissions, add hidden polling, loosen attachment validation, or move `Updates` away from first/default notification behavior.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`

Fact:
Classroom communication is approved to add a dedicated `Threads` tab with one classroom-level trainer-student chat per active student, Supabase Realtime delivery, safe file sharing, and system event bubbles for affected classroom actions. `Updates` remains the first/default tab as a notification/read-state surface, and `Settings` owns update priority ordering and classroom email preferences.

Applies when:
Changing classroom live tabs, Updates notification behavior, student/trainer thread UI, classroom event surfacing, attachment upload/access, Supabase Realtime subscriptions, or priority settings placement.

Do not overgeneralize:
This does not approve hidden polling, student-to-student chat, public file buckets, arbitrary file uploads, automatic judge execution, student-owned final verdicts, route/auth weakening, or destructive deletion of old problem-thread/chat data.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-feature-futureproof-crud-schedule-submission-20260727-rsd.md`

Fact:
Trainer classroom work is approved to futureproof People/Groups member displays, add end-time based duration calculation in session edit while keeping start+duration scheduling and existing DB fields, complete Topics CRUD where safe, and let student live challenge submissions use either a public link or pasted private code with trainer syntax-highlighted review.

Applies when:
Changing `ClassroomLiveClient.js` group cards, session edit dialog, Topics tab operations, live challenge submission dialog, `classroomController.ts` topic endpoints, or `class_problems` proof handling.

Do not overgeneralize:
This does not approve database migrations, code execution, external judge verification, public/private URL checking, dependency additions, route renames, or broad unrelated trainer UI redesign.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Implemented Entry Points

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now bounds group member previews in People/Groups surfaces, derives session edit duration from a displayed end time, provides topic edit/archive/resource edit/delete/problem edit/delete/unassign controls, and lets live Challenge submissions use link or code with language selection. `classroomController.ts`/`classroomRoute.ts` now expose focused topic resource/problem update/delete and topic assignment unassign endpoints, and `updateProblemStatus` accepts code-only proof while preserving pending-approval behavior.

Applies when:
Maintaining trainer group cards, session edit, Topics CRUD, topic assignment management, live challenge proof submission, or trainer proof review.

Do not overgeneralize:
No database schema, dependency, route rename, code execution, external judge verification, or public/private URL checking was added.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Implemented Entry Points

Source:
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Fact:
Student classroom navigation in `ClassroomLiveClient.js` now renders `Topics`, `Challenges`, `Live Sessions & IDE`, `Group & Roster`, and `Attendance` in that order, with matching student tour order. Classroom schedule create/edit converts browser `datetime-local` values to ISO before POST, and `classroomController.ts` validates/normalizes scheduled time before writing `classes.scheduled_time`.

Applies when:
Maintaining student classroom tabs, student onboarding tour, class schedule create/edit, attendance session dates, or class history time display.

Do not overgeneralize:
This does not add global timezone preferences, migrate old schedule rows, change trainer tabs, or change attendance/class start/complete behavior.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-pre-enrolled-students-20260727-rsd.md`

Fact:
Trainer People workflows should allow Student ID/email/CSV enrollment to create pre-enrolled roster identities when matching accounts do not exist. Pre-enrolled students must be visible/selectable in trainer-side classroom workflows such as groups, attendance, and problem assignment, while student classroom access must remain blocked until a trusted account link is activated.

Applies when:
Changing classroom People tab enrollment, CSV student import, roster reads, group membership, attendance, problem targets, signup/profile MIST ID linking, or classroom student-access checks.

Do not overgeneralize:
This does not approve public invitation links, email/SMS invites, `.xlsx` import, destructive roster cleanup, or granting student dashboard access from unverified self-entered IDs.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Approved Implementation Plan

Source:
- `docs/tasks/trainer-pre-enrolled-students-20260727-task-plan.md`

Fact:
Implementation should add a shared `classroomPreEnrollment` utility, update classroom enrollment/roster/access/claim APIs, integrate signup/profile/form/IDE access checks, add People tab missing-student modal/status UI, then verify and create implementation review.

Applies when:
Coordinating the pre-enrolled student implementation or reviewing its intended write scope.

Do not overgeneralize:
This plan is not an approval for broader auth redesign, formal migration infrastructure, notification reintroduction, or unrelated classroom UI refreshes.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Implemented Entry Points

Source:
- `docs/reviews/trainer-pre-enrolled-students-20260727-implementation-review.md`

Fact:
Trainer pre-enrollment is implemented through `server/src/utils/classroomPreEnrollment.ts`, classroom enrollment/claim routes in `classroomController.ts`/`classroomRoute.ts`, signup/profile claim detection in `authController.ts` and `userController.ts`, placeholder filtering in `trainerFormController.ts`, active-only IDE membership in `classroomIdeStream.ts`, and People tab modal/status UI in `ClassroomLiveClient.js`. People tab roster shows pre-enrolled/link-pending rows above active students with an info panel explaining trainer-side use and account-link approval.

Applies when:
Maintaining classroom roster setup, pre-enrolled students, link-pending approvals, student access checks, or trainer selection flows.

Do not overgeneralize:
Runtime schema guard is not a general migration framework, and this implementation does not add public invites, email/SMS sending, `.xlsx` support, or auto-access from unverified IDs.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-live-progress-design-refresh-20260727-rsd.md`

Fact:
Trainer Live progress section in `ClassroomLiveClient.js` should be refreshed as a UI-only change: full-width operational table, compact summary metrics, clearer pending submission review CTA, and preserved status/notes/class-completion behavior.

Applies when:
Changing trainer live-class progress table presentation, pending submission display, or classroom live operational UI.

Do not overgeneralize:
This does not approve API/server changes, new polling, route changes, or student Challenge behavior changes.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Implemented Live Progress UI

Source:
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`

Fact:
Trainer Live progress in `ClassroomLiveClient.js` now renders local summary metrics, a full-width fixed-layout operational table, row-level pending highlighting, and a dedicated `Review` action chip for submitted proof links. Existing status, notes/hints, and class completion handlers remain unchanged.

Applies when:
Maintaining trainer live progress table presentation, pending submission review affordances, or classroom live UI density.

Do not overgeneralize:
This is presentation-only and does not modify student Challenge submission policy or server authorization.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Approved Requirement Scope

Source:
- `docs/rsd/student-challenge-submission-duration-20260726-rsd.md`

Fact:
Student Challenge tab live-class problems should use a submission-link modal that sends student attempts to `pending_approval`; only trainers can finalize live problem statuses as `solved`, `tried`, or `not_solved`. Class/session duration scheduling should accept custom positive minute values rather than preset max-3-hour choices or unrelated product caps.

Applies when:
Changing `ClassroomLiveClient.js` Challenge tab, `class_problems` status APIs, trainer live problem review, or class session duration validation.

Do not overgeneralize:
This does not add external judge verification, new database tables, topic workflow redesign, or hidden polling.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Implemented Entry Points

Source:
- `docs/reviews/student-challenge-submission-duration-20260726-implementation-review.md`

Fact:
Student Challenge tab live-class problems in `ClassroomLiveClient.js` now submit proof links through a modal to `pending_approval`. `updateProblemStatus` in `classroomController.ts` uses `canManageClassroom` for trainer final verdicts and prevents student API payloads from directly setting `solved`, `tried`, or `not_solved`. New-session scheduling uses custom duration minutes; server duration normalization accepts positive integer minutes with only PostgreSQL integer safety.

Applies when:
Maintaining student live Challenge cards, trainer live problem review, `class_problems` proof/status updates, or class session duration scheduling.

Do not overgeneralize:
Topic assignment progress still has its own workflow. This change does not add automatic judge verification or polling.

## 2026-07-26 - classroom-live-stop-polling-20260726 - Classroom Live Polling Removed

Source:
- `docs/reviews/classroom-live-stop-polling-20260726-implementation-review.md`

Fact:
`ClassroomLiveClient.js` no longer polls chat/classroom details or refetches chat, classroom details, topics, and board on browser tab visibility return. IDE activity polling and IDE focus/blur/visibility/heartbeat activity posts were removed from `ClassroomIdePanel.jsx`; WebSocket live IDE monitor remains.

Applies when:
Investigating tab-return request bursts, classroom live rerenders, chat refresh behavior, classroom detail refresh behavior, or IDE activity tracking.

Do not overgeneralize:
Explicit refresh buttons and mutation-triggered fetches remain valid. Non-network timers elsewhere are not covered by this task.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Trainer Bulk Import and Notification Removal Scope

Source:
- `docs/rsd/trainer-bulk-import-feedback-notifications-20260726-rsd.md`

Fact:
Trainer classroom workflows should support local CSV mapping for bulk student enrollment and problem assignment, manual student enrollment by email or `mist_id`, visible processing feedback, and removal of classroom in-app notification fetch/write/broadcast/email side effects while keeping email fields and display.

Applies when:
Changing `ClassroomLiveClient.js`, classroom student/problem assignment APIs, navbar notification UI, or classroom notification server routes/helpers.

Do not overgeneralize:
This does not remove account email fields, auth/password emails, unrelated team collection emails, or non-classroom real-time/polling behavior.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Implemented Entry Points

Source:
- `docs/reviews/trainer-bulk-import-feedback-notifications-20260726-implementation-review.md`

Fact:
Trainer bulk import is implemented in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` with local CSV parsing/mapping dialogs. Batch APIs are `POST /classroom/:id/add-students` and `POST /classroom/assign-problems/bulk`. Classroom notification bell, client notification route proxies, server notification routes/helpers, and `server/src/utils/realtime.ts` were removed.

Applies when:
Maintaining trainer classroom student enrollment, problem assignment, navbar notification behavior, or classroom notification performance.

Do not overgeneralize:
This implementation does not add `.xlsx` support, does not remove non-classroom emails, and does not add a uniqueness guarantee for existing problem assignments.

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

## 2026-07-28 - trainer-updates-problem-threads-20260728 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`

Fact:
Trainer and student classroom UI should replace the generic classroom messaging option with per-problem threads for both live class problems and topic problems. Threads support questions, visualized existing-system solution submissions, trainer feedback/status events, and reactions. `Updates` is the first/default tab for both roles and uses a fixed, priority-sorted update list. Trainer update types include `time_exceeded`, `student_solution_submitted`, `student_needs_review`, `problem_progress_changed`, and `thread_reply`. Student update types include `new_problem`, `teacher_feedback`, `thread_reply`, `solution_status_changed`, and `topic_or_resource_updated`. Classroom update email is toggleable from settings and must stay separate from auth or non-classroom emails. The 2026-07-29 amendment adds per-user `Mark as read`, `Mark all as read`, and explicit thread access through problem cards/lists and authenticated problem-surface deep links. The 2026-07-31 correction keeps Updates notification/read-state only, with no thread launch action.

Applies when:
Changing classroom problem details, classroom chat surfaces, Updates tab, email triggers, or problem thread routes.

Do not overgeneralize:
This does not approve polling, global notification bells, visibility refetches, destructive chat table drops, or time-exceeded email without a deduplicated event decision. The "time exceeded" update is derived on load or explicit refresh.

## 2026-07-29 - trainer-updates-problem-threads-20260728 - Implementation Entry Points

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Fact:
Implemented classroom Updates and problem threads across `server/src/controllers/classroomController.ts`, `server/src/routes/classroomRoute.ts`, `server/src/controllers/userController.ts`, `server/src/routes/userRoute.ts`, `server/src/utils/classroomUpdatesSchema.ts`, `client/src/components/UpdatesTab.js`, `client/src/components/ProblemThread.js`, `client/src/components/PrioritySettings.js`, and `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.

Applies when:
Changing classroom Updates, problem-card thread access, topic problem assignment threads, read receipts, or classroom update email settings.

Do not overgeneralize:
Thread APIs are authenticated classroom APIs, not public links. Updates still load only on first tab mount, refresh, or read actions, and Updates must not open thread dialogs.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Student Threads Entry Points

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`
- `docs/adr/0008-classroom-student-thread-realtime-model.md`

Fact:
Classroom visible conversation is now student-scoped in the `Threads` tab. Server entry points are `GET /classroom/:id/student-threads`, `GET /classroom/:id/student-threads/:studentId`, `POST /classroom/:id/student-threads/:studentId/messages`, `POST /classroom/:id/student-threads/:studentId/attachments`, and `GET /classroom/:id/student-threads/:studentId/attachments/:attachmentId`. Runtime schema/storage/realtime helpers live in `server/src/utils/classroomStudentThreadsSchema.ts`. Client entry points are `client/src/components/ClassroomThreadsTab.js`, `client/src/hooks/useClassroomThreadRealtime.js`, `client/src/lib/action.js#post_form_with_token`, and tab wiring in `ClassroomLiveClient.js`.

Applies when:
Changing classroom communication, student-thread chat, system event bubbles, safe classroom attachments, or Supabase Realtime invalidation.

Do not overgeneralize:
Legacy problem-thread routes and tables still exist for compatibility, but active classroom UI should guide users to `Threads`.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Private Gap-Free Realtime Entry Points

Source:
- `docs/reviews/trainer-student-thread-instant-realtime-20260802-implementation-review.md`
- `docs/adr/0011-private-gap-free-classroom-thread-realtime.md`

Fact:
Student Threads now use private identity-bound Supabase Broadcast with canonical committed payloads and durable revision catch-up. New server entry points are `POST /classroom/:id/student-threads/realtime` for credential renewal and `GET /classroom/:id/student-threads/:studentId/messages?afterRevision=` for gap recovery. Realtime Auth bridging is in `server/src/utils/classroomStudentThreadRealtimeAuth.ts`; subscription/renewal is in `client/src/hooks/useClassroomThreadRealtime.js`. Migration `trainer_student_thread_instant_realtime_20260802` (version `20260802081644`) is applied.

Applies when:
Changing student-thread delivery, Realtime authorization, message ordering, reconnect behavior, optimistic reconciliation, or thread membership provisioning.

Do not overgeneralize:
The canonical Broadcast is a fast delivery path, not the durable source of truth. PostgreSQL messages/revisions and authorized catch-up remain authoritative.
