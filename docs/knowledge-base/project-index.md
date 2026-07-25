# Project Index

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
