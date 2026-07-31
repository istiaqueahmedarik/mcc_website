# Patterns

## 2026-08-01 - Submission-Context Bubble Reuse

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Pattern:
Render floating student-thread bubbles by reusing the same thread panel, composer, attachment flow, realtime state, and message renderer used by the normal `Threads` tab. Pass an optional submission reference into the shared send path rather than duplicating a bubble-only chat implementation.

Applies when:
Adding floating conversation surfaces, contextual chat launchers, or trainer review discussion flows.

Do not overgeneralize:
Do not turn this into a global messaging framework unless multiple non-classroom domains need the same behavior.

## 2026-08-01 - Server-Validated Submission Reference Metadata

Source:
- `docs/decisions/trainer-submission-thread-bubbles-20260801-technical-decisions.md`
- `docs/adr/0009-student-thread-submission-reference-metadata.md`

Fact:
When a student-thread message is tied to a pending submission, accept only a compact client reference request and resolve the persisted `submission_reference` metadata server-side from authoritative live or topic submission rows. Validate classroom, selected student, source type, and `pending_approval` status before inserting the message or attachment.

Applies when:
Adding submission-context chat, floating bubbles, message metadata, or trainer review discussion features.

Do not overgeneralize:
Submission references are display context, not grading authority; do not store solution code, hidden notes, storage paths, or cross-student data in message metadata.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Serial Bubble Work

Source:
- `docs/tasks/trainer-submission-thread-bubbles-20260801-task-plan.md`

Fact:
Submission-referenced thread bubbles should be implemented serially because server validation, `ClassroomThreadsTab.js`, floating dock behavior, and `ClassroomLiveClient.js` pending-submission entry points share the same student-thread conversation model.

Applies when:
Coordinating changes to pending-submission discussion, student-thread bubbles, message metadata, or classroom thread panels.

Do not overgeneralize:
This does not require serial work for unrelated trainer UI-only tasks with disjoint write scopes.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Serial Student Thread Work

Source:
- `docs/tasks/trainer-student-classroom-threads-realtime-20260731-task-plan.md`

Fact:
Student-thread realtime work should be implemented serially because schema utilities, `classroomController.ts`, `classroomRoute.ts`, `ClassroomLiveClient.js`, Updates/Settings placement, legacy problem-thread cleanup, attachment validation, and event fan-out all share classroom communication semantics and overlapping files.

Applies when:
Coordinating classroom student-thread implementation, realtime thread APIs, attachment handling, event bubbles, Updates/Settings placement, or old problem-thread UI cleanup.

Do not overgeneralize:
This serial plan does not approve broad unrelated classroom refactors, destructive legacy thread migration, or bypassing approved RSD/decision gates.

## 2026-07-27 - Explicit SQL Parameter Type Casting & Null Handling Pattern

Source:
- `docs/rsd/trainer-feature-schedule-topics-verification-studentui-20260727-rsd.md`

Fact:
When executing SQL updates in Hono / Bun PostgreSQL controllers where parameters can evaluate to `null` or `undefined` (such as `solved_at` on submission rejection or optional trainer review notes), parameters MUST be explicitly cast in SQL statements (e.g. `${nextStatus}::text`, `${solvedAt}::timestamptz`, `${feedbackText}::text`) or branched into clean query paths to prevent PostgreSQL parameter type inference errors (`could not determine data type of parameter $N`).

Applies when:
Updating submission progress, approval/rejection endpoints, or optional metadata fields in PostgreSQL controllers.

Do not overgeneralize:
Does not alter contest problem evaluation or third-party online judge auto-grading.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Approved Work Plan

Source:
- `docs/tasks/trainer-feature-futureproof-crud-schedule-submission-20260727-task-plan.md`

Fact:
Implementation should proceed serially through server topic CRUD gap endpoints, client topic CRUD UI, bounded People/Groups member display, session edit end-time duration calculation, code-or-link submissions with highlighted trainer review, then verification/review docs.

Applies when:
Coordinating or reviewing this trainer classroom change set.

Do not overgeneralize:
This plan does not approve migrations, dependencies, code execution, external judge verification, or unrelated trainer UI redesign.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Datetime-Local Submit Pattern

Source:
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Fact:
For classroom schedule forms using `<input type="datetime-local">`, convert the input value to `Date#toISOString()` in the browser before POST, and validate/normalize again server-side before persisting.

Applies when:
Adding or modifying class/session schedule create/edit forms, especially when stored timestamps are later displayed with `Date` and `toLocale*` helpers.

Do not overgeneralize:
Date-only fields or intentionally timezone-free labels should not use this pattern without a separate requirement.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Serial Roster Identity Work

Source:
- `docs/tasks/trainer-pre-enrolled-students-20260727-task-plan.md`

Fact:
Pre-enrolled classroom student work should be implemented serially because schema/status helpers, `classroomController.ts`, `ClassroomLiveClient.js`, auth/profile matching, trainer forms, and IDE/classroom access checks share the same roster identity and membership-status semantics.

Applies when:
Changing pre-enrolled students, roster membership states, classroom student access, signup/profile claim detection, or trainer-side student selection workflows.

Do not overgeneralize:
Other trainer/classroom UI-only tasks can still run in parallel when write scopes are disjoint and do not share access semantics.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Missing Account Review Modal Pattern

Source:
- `docs/reviews/trainer-pre-enrolled-students-20260727-implementation-review.md`

Fact:
When trainer batch/manual enrollment detects existing accounts and missing accounts together, commit active existing accounts first, then open a review modal for missing rows with editable required names, optional emails, a security note, and one batch pre-enrollment confirmation request.

Applies when:
Extending classroom People import, adding future roster imports, or handling mixed success/missing results in trainer bulk workflows.

Do not overgeneralize:
This pattern is for roster identity creation; problem assignment and other imports should not create placeholder domain records unless approved separately.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Operational Table Refresh Pattern

Source:
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`

Fact:
For trainer operational tables inside `ClassroomLiveClient.js`, prefer full-width table-fixed layouts with explicit columns, compact summary metrics above rows, row-level state tinting, and action chips for review workflows instead of inline links that compete with primary item titles.

Applies when:
Refreshing trainer live progress, review queues, or dense classroom workflow tables.

Do not overgeneralize:
Do not introduce global table abstractions unless multiple pages share the same structure and behavior.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Student Proof, Trainer Verdict Pattern

Source:
- `docs/reviews/student-challenge-submission-duration-20260726-implementation-review.md`

Fact:
For live-class problem attempts, student UI should collect proof and request `pending_approval`; server code must preserve trainer-owned final verdicts unless `canManageClassroom` passes. Student difficulty/proof updates can be allowed without giving students control of `solved`, `tried`, or `not_solved`.

Applies when:
Adding or modifying live-class problem status flows, proof submission UI, or trainer review controls.

Do not overgeneralize:
This pattern is for `class_problems` live-class assignments; topic progress has separate assignment/progress tables and handlers.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Local CSV Mapping Pattern

Source:
- `docs/reviews/trainer-bulk-import-feedback-notifications-20260726-implementation-review.md`

Fact:
Trainer bulk imports use browser-side CSV parsing, explicit column mapping, local preview/error counts, then one structured batch API call. Required mappings are blocked before mutation, and server endpoints still revalidate authorization and classroom targets.

Applies when:
Adding future trainer CSV imports or extending current student/problem import flows.

Do not overgeneralize:
This pattern is for small-to-medium CSV imports in trainer UI, not large background data migrations or `.xlsx` files.

## 2026-07-26 - trainer-qa-fixes-20260726 - QA Fix Work Slicing

Source:
- `docs/tasks/trainer-qa-fixes-20260726-task-plan.md`

Fact:
When trainer QA findings span server policy, form analytics, and classroom client UI, split work by disjoint write scopes: classroom server/resource policy, trainer form detail analytics, and classroom UI copy/validation/board.

Applies when:
Coordinating parallel agents for broad trainer/classroom defect repair.

Do not overgeneralize:
If `ClassroomLiveClient.js` changes overlap heavily with server behavior, integrate serially instead of giving overlapping write scopes.

## 2026-07-25 - Navigation Uses Profile-Derived Role Flags

Source:
- `client/src/components/Navbar.js`

Fact:
Navbar reads `auth/user/profile`, derives `isLoggedIn`, `isAdmin`, and `isTrainer`, then renders top-level and role-specific links from small link arrays.

Applies when:
Changing visibility of navigation entries by user role.

Do not overgeneralize:
Route authorization still belongs in route/page guards and server controllers; hiding a nav item is not an authorization control.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Shared Role Predicate Inside Navbar

Source:
- `docs/tasks/hide-classrooms-tab-for-trainers-task-plan.md`

Fact:
When desktop and mobile navbar sections need the same simple role condition, define a local boolean in `Navbar.js` and reuse it in both render branches.

Applies when:
A small role visibility rule must stay consistent between desktop navbar and mobile sheet menu.

Do not overgeneralize:
Keep the predicate local unless more components need the same rule.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Trainer Dashboard Predicate

Source:
- `client/src/components/Navbar.js`
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Fact:
`canUseTrainerDashboard` is the local navbar predicate for users with trainer or admin access.

Applies when:
Adding or hiding navbar items tied to Trainer Dashboard access.

Do not overgeneralize:
This is not a route authorization helper.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Hide Browser AI Volatility

Source:
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`

Fact:
Superseded for classroom/resource authoring by `classroom-resource-reader-problem-preview-20260725`: browser-side WebGPU/model lifecycle is no longer part of trainer classroom/resource authoring.

Applies when:
Adding or adjusting trainer AI writing assistance.

Do not overgeneralize:
Do not apply this to current classroom/resource authoring unless AI is re-approved later.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Serial Resource AI Work

Source:
- `docs/tasks/trainer-dashboard-ai-resource-writing-assistant-task-plan.md`

Fact:
Trainer AI writing, markdown resource editing, resource schema, and resource rendering share package/component/API files, so this task should run serially in the main workspace rather than split across parallel worktrees.

Applies when:
Implementing the approved trainer dashboard AI resource writing assistant plan.

Do not overgeneralize:
Future trainer/classroom work can still use parallel worktrees when write scopes are disjoint.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Trainer Writing Assistant Boundary

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

Fact:
Superseded for classroom/resource authoring by `classroom-resource-reader-problem-preview-20260725`: `client/src/lib/trainer-writing-ai.js` and `TrainerWritingAssistant` were removed.

Applies when:
Changing trainer AI draft behavior for classroom/resource authoring.

Do not overgeneralize:
Do not import or reference removed trainer AI helpers in classroom/resource code.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - UI-Only Trainer Refresh Boundary

Source:
- `docs/tasks/trainer-mode-ui-refresh-20260725-task-plan.md`

Fact:
For trainer-mode design refreshes, preserve existing handler/state/API shapes and change JSX structure, Tailwind classes, local display constants, and small presentational helpers only.

Applies when:
Redesigning `/trainer/dashboard`, `/trainer/forms`, or `/trainer/forms/[id]` without workflow changes.

Do not overgeneralize:
If a task changes business process, route paths, data shape, or authorization, create new technical decisions and broader verification.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Local Presentation Helpers

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

Fact:
For large trainer UI files, small local helpers such as section titles, metric tiles, icon buttons, tabs, draft rows, and empty states can reduce repeated JSX without creating a global design-system abstraction.

Applies when:
Cleaning up repeated presentation markup inside a single trainer page component.

Do not overgeneralize:
Promote helpers to shared components only when multiple files need the same behavior and the interface stays meaningful.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Swiss UI Local Helpers

Source:
- `docs/decisions/swiss-minimal-learning-ui-refresh-20260725-technical-decisions.md`

Fact:
For this Swiss minimal refresh, add only small local presentational helpers/constants when they reduce repeated JSX or clarify repeated status, section, metric, tab, or empty-state UI without hiding behavior logic.

Applies when:
Editing `TrainerDashboardClient.js`, `ClassroomListClient.js`, `ClassroomLiveClient.js`, or `MyDashboardClient.js`.

Do not overgeneralize:
Do not split behavior into new modules or create global design-system abstractions in this task.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Demote Empty Future Sections

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Fact:
When a student dashboard section has no live data yet, keep it as a small low-emphasis status strip instead of a primary tab/panel.

Applies when:
Reducing noise in `/my_dashboard` or similar student operational pages.

Do not overgeneralize:
Do not demote sections that contain current required actions, errors, verification status, or assigned work.

## 2026-07-25 - past-class-detail-visualization-20260725 - Separate Live And Past Problem State

Source:
- `docs/tasks/past-class-detail-visualization-20260725-task-plan.md`

Fact:
Classroom live pages should keep active live problem state separate from selected past-class problem state so polling and review views do not overwrite each other.

Applies when:
Adding completed-class summaries, history panels, or review views inside `ClassroomLiveClient.js`.

Do not overgeneralize:
This is a local classroom-live pattern, not a global state-management rule.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Dictionary Plus Array Tags

Source:
- `docs/decisions/trainer-class-tags-chat-shadcn-refresh-20260725-technical-decisions.md`

Fact:
For classroom problem topics, use a dictionary table for suggestions/create-new UX while keeping assignment rows as normalized `text[]` tags until a broader relational tag model is approved.

Applies when:
Adding tag selectors, tag filters, or tag normalization around `class_problems`.

Do not overgeneralize:
Do not apply this to achievement tags, course content, or other domains without checking their existing storage model.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Preview Before Assign

Source:
- `docs/tasks/classroom-resource-reader-problem-preview-20260725-task-plan.md`

Fact:
Problem assignment should use an explicit preview action that calls the server metadata scraper, then shows the trainer what students will see before assignment.

Applies when:
Changing trainer problem assignment, metadata scraping, or student challenge-card previews.

Do not overgeneralize:
Do not scrape on every keystroke; keep fetch timing user-controlled unless telemetry later justifies automatic preview.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Client-Side List First

Source:
- `docs/tasks/classroom-resource-reader-problem-preview-20260725-task-plan.md`

Fact:
For classroom live lists, start with bounded scroll areas and incremental display counts before changing API contracts to server pagination.

Applies when:
Handling resources, live problems, history, students, or teams in `ClassroomLiveClient.js`.

Do not overgeneralize:
Very large classrooms may still need server pagination later.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Topic Unit Before Team Assignment

Source:
- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`

Fact:
Trainer topic workflow should present "build topic unit" before "assign to team", so resources and problems feel prebuilt rather than tied to a single live class form.

Applies when:
Designing classroom topic libraries, team assignment tabs, or trainer problem/resource setup flows.

Do not overgeneralize:
This does not require importing an external topic taxonomy or making topics public outside their approved classroom/trainer scope.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Isolate Browser IDE Logic

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Keep CodeMirror/editor telemetry logic in `client/src/app/classroom/live/[id]/ClassroomIdePanel.jsx` and integrate it into `ClassroomLiveClient.js` through dynamic client-only components.

Applies when:
Extending student IDE access, trainer monitor views, autocomplete, or coming-soon runner controls.

Do not overgeneralize:
General classroom UI can stay in `ClassroomLiveClient.js`; this pattern is for browser-editor internals that would bloat the live page.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Derive Member Work Locally

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
The trainer Teams dashboard can derive per-member work and a problem/member matrix from existing active `problems`, `topicAssignments`, and topic `progressRows` without a new endpoint when the classroom live page already has those datasets.

Applies when:
Showing who is solving which live/topic problem inside `/classroom/live/[id]`.

Do not overgeneralize:
Large classrooms may need server-side pagination or a dedicated dashboard endpoint later.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Poll After Explicit Selection

Source:
- `docs/tasks/trainer-ide-tracking-team-edit-20260725-task-plan.md`

Fact:
Live trainer monitors that can be expensive should require an explicit selected target before starting short-interval polling.

Applies when:
Building trainer views for IDE activity, per-student telemetry, or similar live monitoring.

Do not overgeneralize:
Low-cost classroom summary polling can remain periodic when it supports the main live-class surface.

## 2026-07-26 - trainer-logout-option - Shared Logout Action Across Profiles & Navbar

Source:
- `client/src/app/trainer/profile/page.js`
- `client/src/app/trainer/profile/TrainerProfileClient.jsx`
- `client/src/components/Navbar.js`

Fact:
All profile pages (`/profile`, `/trainer/profile`) and global mobile sheet navigation must provide a clear Logout button bound to the shared `logout` server action in `client/src/lib/action.js`.

Applies when:
Adding or modifying role-specific profile pages or navigation components.

Do not overgeneralize:
Do not duplicate token deletion logic in individual page handlers; always reuse `@/lib/action.js#logout`.
## 2026-07-29 - Classroom Updates Read Receipts

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Pattern:
Generate stable `update_key` values on the server for the current authorized classroom feed, then validate mark-read requests against that visible key set before writing receipts. Mark-all-read should derive keys server-side from the same feed builder.

Applies when:
Adding new classroom update types or read/unread controls.

Do not overgeneralize:
Do not trust arbitrary client-provided update keys, and do not create page-load side effects such as email sends while deriving the feed.

## 2026-07-31 - Student Thread Event Bubbles

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Pattern:
Mirror successful classroom mutations into student-thread system bubbles through shared helpers. Fan out only to active real affected students, exclude trainer/admin/pre-enrolled identities, keep event bodies concise, and place sensitive details such as solution code in the original authorized workflow rather than the event metadata.

Applies when:
Adding new classroom actions that should appear in trainer-student conversation history.

Do not overgeneralize:
System bubbles are conversation history, not a second grading/status authority.

## 2026-07-31 - Private Classroom Attachment Access

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Pattern:
Upload classroom thread attachments through authenticated server endpoints, validate extension/MIME/size server-side, store only private bucket/path metadata, and generate short-lived signed URLs only after rechecking thread authorization.

Applies when:
Adding classroom file sharing, download/open controls, or private learning artifacts.

Do not overgeneralize:
Public image upload helpers such as profile/achievement uploads are not suitable for private classroom thread files.
