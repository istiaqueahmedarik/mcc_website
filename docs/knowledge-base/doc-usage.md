# Doc Usage

## 2026-09-02 - classroom-contest-report-scroll-edu-friends - Implementation Docs Used

Source:
- `docs/reviews/classroom-contest-report-scroll-edu-friends-20260902-implementation-review.md`

Fact:
This task used `AGENTS.md`, the classroom contest knowledge base and prior EDU implementation review, Context7 React guidance, current Codeforces friends-standings documentation/search evidence, and the current report, scroll-area, provider service, controller, and trainer toast paths. These inputs kept the change classroom-scoped, session-safe, friends-only for ordinary EDU sources, and accessible for wide report tables.

Applies when:
Auditing the report scrollbar or EDU friends-only fetch behavior.

Do not overgeneralize:
No live authenticated Codeforces session, trainer browser account, production deployment, database mutation, or automatic Codeforces friend update was performed.

## 2026-08-17 - trainer-student-context-menu-simplification-20260817 - Implementation Docs Used

Source:
- `docs/reviews/trainer-student-context-menu-simplification-20260817-implementation-review.md`

Fact:
Implementation used `AGENTS.md`, the required interface/Apple/Emil design skills, Radix Context Menu documentation through Context7, Vercel's interface baseline, current `ClassroomLiveClient.js` and shadcn primitives, and classroom navigation/roster/resource project memory. These inputs drove role-prioritized progressive disclosure, shared visible/context commands, motion restraint, focus return, and scoped preservation of native browser context behavior.

Applies when:
Auditing why the task uses visible overflow plus scoped context acceleration and remains UI-only.

Do not overgeneralize:
This documentation pass did not authorize server behavior, dependency, global design-system, or unrelated dirty-worktree changes. Authenticated multi-viewport browser QA remains a follow-up check.

## 2026-08-10 - trainer-classroom-codeforces-contests-20260810 - Docs Used

Source:
- `docs/reviews/trainer-classroom-codeforces-contests-20260810-implementation-review.md`

Fact:
This task used `AGENTS.md`, the project knowledge base, the required `supabase`, `supabase-postgres-best-practices`, `interface-design`, `apple-design`, `emil-design-eng`, and `context7` skills, Context7 React form/accessibility docs, current Supabase changelog/RLS/privilege guidance, Vercel Web Interface Guidelines, official Codeforces API help/method docs for authentication/rate-limit/`contest.standings`, and current classroom contest controller/service/UI source.

Applies when:
Auditing classroom Codeforces provider behavior, trainer-owned Codeforces credential setup, signed Gym/group/mashup standings fetches, encrypted credential storage, full Codeforces snapshot retention, trainer map/ignore handling for unmatched rows, or why public standings remain anonymous-only.

Do not overgeneralize:
This docs pass did not run live Codeforces Gym/group smoke tests or apply SQL to production; rollout still requires configuring `CODEFORCES_CREDENTIAL_ENCRYPTION_KEY`, applying expand SQL, and having trainers save credentials with Gym/group/mashup access.

## 2026-08-10 - admin-full-user-csv-20260810 - Docs Used

Source:
- Current implementation pass

Fact:
This task used `AGENTS.md`, the project knowledge base, the required `interface-design`, `apple-design`, `emil-design-eng`, `context7`, and `supabase-postgres-best-practices` skills, Context7 Hono JSON handler docs, Context7 React controlled form docs, Context7 Next.js Server Actions docs, Postgres batch insert/short transaction/constraint references, read-only live `users` table column/index inspection, and current `/admin/trainers`, `classroomController.ts`, and `classroomRoute.ts` source.

Applies when:
Auditing why admin full-user creation reused `/admin/trainers`, why no schema migration was added, why CSV parsing is browser-local but validation is server-owned, or why password hashing is done before the batch insert.

Do not overgeneralize:
This docs pass did not run a live authenticated browser session or insert real users into production data.

## 2026-08-09 - trainer-existing-classroom-discord-binding-20260809 - Docs Used

Source:
- `docs/reviews/trainer-existing-classroom-discord-binding-20260809-implementation-review.md`

Fact:
This task used `AGENTS.md`, all relevant Discord and trainer knowledge-base entries, the required `interface-design`, `apple-design`, `emil-design-eng`, `context7`, `supabase`, and `supabase-postgres-best-practices` skills, Context7 Next.js 16.1.1 Route Handler docs, Context7 Hono JSON handler docs, the 2026-08-09 Supabase changelog, Postgres index/short-transaction/privilege references, and current Discord controller/route/proxy/settings-card source.

Applies when:
Auditing why existing-classroom Discord binding lives in Settings, why it reuses creation binding logic, or why direct Postgres verification used Bun's env loader without printing secrets.

Do not overgeneralize:
No live Discord channel smoke was run for this follow-up, and no new schema migration or Supabase advisor run was required.

## 2026-08-09 - trainer-shared-discord-guild-classrooms-20260809 - Docs Used

Source:
- `docs/reviews/trainer-shared-discord-guild-classrooms-20260809-implementation-review.md`

Fact:
This task used `AGENTS.md`, the existing Discord RSD/technical decisions/ADR/task/review, current Discord SQL/controllers/provisioning/queue/command/thread/UI source, all relevant knowledge-base files, the `context7`, `supabase`, and `supabase-postgres-best-practices` skills, official Discord API documentation through Context7, the 2026-08-09 Supabase changelog, and Postgres constraint/index/lock/privilege best-practice references. The UI change was copy-only, so the new-interface design stack was not required.

Applies when:
Auditing the shared Discord guild topology, migration method, external permission revalidation, or why direct Postgres verification was used.

Do not overgeneralize:
Supabase MCP/advisors and a live two-classroom Discord guild smoke were unavailable; database schema behavior, bundles, lint, production client build, and exact-ID source routing were verified instead.

## 2026-08-09 - trainer-student-roster-apple-redesign-20260809 - Docs Used

Source:
- `docs/reviews/trainer-student-roster-apple-redesign-20260809-implementation-review.md`

Fact:
This task used `AGENTS.md`, the required `interface-design`, `apple-design`, `emil-design-eng`, and `context7` skills, Motion for React docs through Context7, Apple Human Interface Guidelines, Vercel Web Interface Guidelines, `docs/knowledge-base/project-index.md`, `patterns.md`, `decisions.md`, `quality-rules.md`, `hci-rules.md`, `doc-usage.md`, `docs/rsd/trainer-pre-enrolled-students-20260727-rsd.md`, and `ClassroomLiveClient.js` source inspection to keep the redesign UI-only and preserve roster semantics.

Applies when:
Auditing future classroom People UI work, Apple-inspired roster decisions, or why authenticated browser visual QA remains a residual check.

Do not overgeneralize:
The docs pass did not authorize server/API/schema/auth changes, dependency additions, broad classroom redesign, or production data screenshots in this environment.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Implementation Review Docs Used

Source:
- `docs/reviews/trainer-compact-ui-cleanup-20260802-implementation-review.md`

Fact:
Implementation review used the approved RSD, approved technical decisions, approved task plan, trainer client source, targeted ESLint, full client lint, production build output, headless Chrome route checks, and source audit of endpoint strings/route targets to verify the compact trainer UI cleanup.

Applies when:
Auditing the shipped trainer compact UI cleanup, mini-laptop verification limitations, or why authenticated browser layout QA remains a residual risk.

Do not overgeneralize:
The review did not prove authenticated trainer data screenshots because protected trainer routes redirected to `/login` in the headless session.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Task Plan Docs Used

Source:
- `docs/tasks/trainer-compact-ui-cleanup-20260802-task-plan.md`

Fact:
The approved task plan used the approved RSD, approved technical decisions, `AGENTS.md`, trainer/classroom knowledge-base entries, and current trainer route client files to sequence serial UI-only edits across dashboard, form builder, form detail, static verification, visual verification, implementation review, and memory updates.

Applies when:
Coordinating or auditing this trainer compact UI cleanup and its serial write scope.

Do not overgeneralize:
The plan does not approve server/API/schema/auth changes, route changes, new dependencies, or classroom live internals.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Technical Decision Docs Used

Source:
- `docs/decisions/trainer-compact-ui-cleanup-20260802-technical-decisions.md`

Fact:
The approved technical decision package used the approved RSD, `AGENTS.md`, trainer/classroom knowledge-base entries, current trainer route client files, global Tailwind tokens, and shadcn/lucide component context to choose a UI-only compact redesign with no route/API/auth/schema/dependency changes.

Applies when:
Auditing future trainer compact UI decisions, mini-laptop readability work, or route/process preservation for trainer pages.

Do not overgeneralize:
The decision package did not approve classroom live internals, behavior refactors, server changes, or global theme rewrites.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - RSD Docs Used

Source:
- `docs/rsd/trainer-compact-ui-cleanup-20260802-rsd.md`

Fact:
The approved RSD used `AGENTS.md`, the interface-design skill, trainer/classroom knowledge-base entries, `TrainerDashboardClient.js`, `TrainerFormsClient.js`, `TrainerFormDetailClient.js`, `globals.css`, `tailwind.config.js`, and local shadcn/lucide component context to scope a UI-only trainer cleanup for mini-laptop readability.

Applies when:
Auditing future trainer compact UI work, trainer route presentation changes, or why this cleanup excludes server/API/classroom-live internals.

Do not overgeneralize:
The RSD did not approve endpoint, route, authorization, schema, dependency, or classroom live workflow changes.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Docs Used

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Fact:
This task used `AGENTS.md`, the approved RSD, technical decisions, ADR-0009, the student-thread realtime implementation review, classroom knowledge-base entries, `ClassroomThreadsTab.js`, `StudentThreadBubbleDock.js`, `ClassroomLiveClient.js`, and `classroomController.ts` to keep bubble behavior on the active student-thread model with server-owned submission-reference validation.

Applies when:
Auditing future trainer pending-submission discussion, floating thread bubbles, or student-thread message metadata changes.

Do not overgeneralize:
The docs pass did not include authenticated live browser QA or live database negative-case execution.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Docs Used

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Fact:
This task used `AGENTS.md`, the project knowledge base, prior schedule/submission/topic RSDs, `ClassroomLiveClient.js`, `classroomController.ts`, `classroomRoute.ts`, and existing `MarkdownRenderer`/CodeMirror dependency context to keep the change DB-stable, dependency-free, and aligned with trainer-owned verdict rules.

Applies when:
Auditing future trainer group, schedule, topic CRUD, or submission proof work.

Do not overgeneralize:
This doc pass did not validate production-scale data volume or introduce a full topic lifecycle policy beyond archive/unassign and focused resource/problem CRUD.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Documentation Learning

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Used docs:
- `AGENTS.md`
- `docs/rsd/swiss-minimal-learning-ui-refresh-20260725-rsd.md`
- `docs/decisions/swiss-minimal-learning-ui-refresh-20260725-technical-decisions.md`
- `docs/tasks/swiss-minimal-learning-ui-refresh-20260725-task-plan.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/quality-rules.md`
- `docs/knowledge-base/mistakes.md`
- `docs/adr/0001-browser-side-gemma-webgpu-writing-assistant.md`
- `docs/adr/0002-markdown-source-classroom-resources.md`

What changed:
The prior AI and markdown ADRs constrained this UI refresh to preserve draft-only writing assistance and safe classroom resource markdown rendering. Knowledge-base UI-only rules constrained the task to preserve endpoints, handlers, polling, routes, and authorization-bearing guards.

Stale or missing:
No dedicated visual design guide existed for classroom live or student dashboard surfaces before this task.

## 2026-07-25 - past-class-detail-visualization-20260725 - Documentation Learning

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

Used docs:
- `AGENTS.md`
- `docs/rsd/past-class-detail-visualization-20260725-rsd.md`
- `docs/decisions/past-class-detail-visualization-20260725-technical-decisions.md`
- `docs/tasks/past-class-detail-visualization-20260725-task-plan.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/quality-rules.md`
- `docs/knowledge-base/mistakes.md`
- `docs/adr/0002-markdown-source-classroom-resources.md`

What changed:
ADR-0002 kept resource markdown rendering on the safe `allowRawHtml={false}` path. Knowledge-base classroom UI rules preserved polling and endpoint behavior. Source inspection showed that class-specific resources were stored but filtered out of classroom details.

Stale or missing:
No `docs/knowledge-base/hci-rules.md` file existed before this task, so one was created with the completed-session selection rule.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Docs Used

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

Fact:
This task used `AGENTS.md`, the classroom knowledge base, RSD orchestrator references, shadcn Bubble/Message docs, and focused classroom client/server source inspection. The shadcn docs determined the local Bubble/Message split; the KB preserved polling caution.

Applies when:
Auditing future trainer/classroom UI or chat changes.

Do not overgeneralize:
The docs did not define a complete design system; custom styling still came from project-specific UI requirements.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Docs Used

Source:
- `docs/rsd/classroom-resource-reader-problem-preview-20260725-rsd.md`
- `docs/decisions/classroom-resource-reader-problem-preview-20260725-technical-decisions.md`
- `docs/tasks/classroom-resource-reader-problem-preview-20260725-task-plan.md`

Fact:
This task used `AGENTS.md`, classroom knowledge-base entries, ADR-0002, `ClassroomLiveClient.js`, `classroomController.ts`, and RSD orchestrator HCI/code-quality references to pick no-AI resource authoring, a dedicated resource reader route, client-side list batching first, and explicit problem preview.

Applies when:
Auditing future classroom resource/problem UX work.

Do not overgeneralize:
This docs pass did not validate production data volume, so server pagination remains a future measurement-based decision.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - RSD Docs Used

Source:
- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`

Fact:
The RSD used `AGENTS.md`, classroom knowledge-base entries, current `ClassroomLiveClient.js`, `classroomController.ts`, `classroomRoute.ts`, `dbInit.ts`, YouKn0wWho topic-list inspiration, tldraw sync docs, Hono/Bun WebSocket docs, and dotLottie React docs.

Applies when:
Auditing future classroom topic, team analytics, board broadcast, or chat-bubble decisions.

Do not overgeneralize:
This RSD docs pass did not yet approve a final data model or board transport; those belong to the technical decision package.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Technical Decision Docs Used

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Fact:
The approved technical decision package used the RSD, AGENTS, classroom knowledge base, `dbInit.ts`, `classroomController.ts`, `ClassroomLiveClient.js`, YouKn0wWho topic-list, tldraw sync docs, Hono/Bun WebSocket docs, and dotLottie React docs to choose classroom-scoped topics, separate team-topic progress, derived analytics, in-memory app-hosted tldraw sync, polling chat bubble, and dotLottie pet rendering.

Applies when:
Auditing implementation or future changes to classroom topic/team assignments, board sync, analytics, or chat bubble behavior.

Do not overgeneralize:
The decisions do not approve permanent board persistence, public demo sync, global topic marketplace, or realtime chat conversion.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Task Plan Docs Used

Source:
- `docs/tasks/classroom-team-topic-board-chat-20260725-task-plan.md`

Fact:
The approved task plan used the accepted RSD, technical decisions, ADR-0003, ADR-0004, AGENTS, classroom knowledge base, quality/HCI rules, and worktree-parallelism guidance to select serial main-workspace implementation.

Applies when:
Auditing implementation sequencing or why no parallel worktrees were used.

Do not overgeneralize:
Future classroom tasks can use parallel worktrees when write scopes are genuinely disjoint.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Docs Used

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
This task used AGENTS, RSD orchestrator HCI/code-quality/doc-audit references, ADR-0002, ADR-0003, classroom knowledge-base entries, `ClassroomLiveClient.js`, `classroomController.ts`, `classroomRoute.ts`, and `dbInit.ts` to implement topic editor reuse, assignment visibility reduction, team dashboard, and IDE monitor storage/API/UI.

Applies when:
Auditing future classroom IDE monitor, topic assignment visibility, markdown resource editor, or trainer team dashboard work.

Do not overgeneralize:
No current doc defines IDE log retention; future retention work needs a new decision.
## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Docs Used

Source:
- `docs/rsd/trainer-ide-tracking-team-edit-20260725-rsd.md`
- `docs/decisions/trainer-ide-tracking-team-edit-20260725-technical-decisions.md`
- `docs/tasks/trainer-ide-tracking-team-edit-20260725-task-plan.md`

Fact:
This task used `AGENTS.md`, project knowledge-base entries for IDE/team work, and RSD orchestrator references for auto gates, HCI, code quality, and documentation audit.

## 2026-07-27 - optional-problem-difficulty-trainer-feature-20260727 - Docs Used

Source:
- `docs/reviews/optional-problem-difficulty-trainer-feature-20260727-implementation-review.md`

Fact:
This task used `AGENTS.md`, project knowledge base, `ClassroomLiveClient.js`, `classroomController.ts`, and prior trainer feature RSDs to make problem difficulty optional across forms, controllers, imports, and UI badges without DB schema changes.

Applies when:
Auditing future problem creation, topic problem forms, or difficulty display decisions.

Do not overgeneralize:
This entry records documentation use for this scoped task only.

## 2026-07-28 - trainer-updates-problem-threads-20260728 - Technical Decision Docs Used

Source:
- `docs/decisions/trainer-updates-problem-threads-20260728-technical-decisions.md`
- `docs/adr/0007-classroom-problem-thread-update-model.md`

Fact:
The approved technical decision package used `AGENTS.md`, the approved RSD, classroom no-polling and notification-removal decisions, `userRoute.ts`, `sendEmail.ts`, `classroomController.ts`, `ClassroomLiveClient.js`, and RSD orchestrator HCI/code-quality/worktree references to choose load/action-only Updates, namespaced classroom user settings, explicit problem-thread references, event-backed email only, no destructive old-chat table drops, and serial implementation due overlapping dirty source files.

Applies when:
Auditing future classroom Updates/problem-thread implementation, notification behavior, or why the task avoided parallel worktrees.

## 2026-07-29 - trainer-updates-problem-threads-20260728 - Implementation Review Docs Used

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Fact:
Implementation review verified the approved RSD, technical decisions, ADR, task plan, classroom controller/routes, user settings routes, email helper, and classroom live UI against requirement satisfaction, security, HCI, code-quality, and verification checks.

Applies when:
Auditing the shipped Updates/problem-thread implementation, read receipt behavior, or why topic thread access requires assignment scope.

Do not overgeneralize:
This review did not prove live SMTP delivery; it verified code paths, build/lint, and safety constraints.

Do not overgeneralize:
This documents planning inputs for this feature; future tasks still need their own source review and gate-satisfied decisions.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Implementation Review Docs Used

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Fact:
This implementation used AGENTS, the approved RSD, technical decisions, ADR-0008, approved task plan, classroom knowledge-base entries, RSD orchestrator HCI/code-quality/doc-audit references, Supabase Broadcast docs, Supabase Storage docs, and current source entry points in `ClassroomLiveClient.js`, `TeamMatrixClient.js`, `classroomController.ts`, `classroomRoute.ts`, `UpdatesTab.js`, `PrioritySettings.js`, and legacy problem-thread components.

Applies when:
Auditing student-thread realtime, private classroom attachments, Updates/Threads/Settings tab behavior, or legacy problem-thread UI treatment.

Do not overgeneralize:
The implementation review did not prove live Supabase upload/download or two-browser realtime delivery; it verified code paths, build/lint, route shape, and safety constraints.
# 2026-09-01 - admin-student-profile-readiness-20260901 - Docs Used

This task used `AGENTS.md`, the repository knowledge base, the required `interface-design`, `apple-design`, `emil-design-eng`, `context7`, and `supabase` skills, current Motion accessibility documentation, current Vercel Web Interface Guidelines, current Supabase changelog, and the existing admin authorization/proxy/UI patterns. These inputs drove the server-owned completeness rule, minimal admin response, URL-backed range/status state, focusable overflow table, purposeful transform/opacity motion, and reduced-motion behavior.

Applies when:
Auditing why this tool uses installed `framer-motion`, avoids a new chart dependency, keeps the token in the server proxy, or treats CSV safety and visual accessibility as part of the export contract.
