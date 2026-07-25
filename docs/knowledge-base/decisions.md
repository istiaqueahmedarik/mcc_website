# Decisions

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
