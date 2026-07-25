# Doc Usage

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

Applies when:
Auditing whether trainer IDE and team-edit implementation followed repository planning rules.

Do not overgeneralize:
This entry records documentation use for this scoped task only.
