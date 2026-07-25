# Quality Rules

## 2026-07-25 - Keep Role-Based Navigation Local

Source:
- `client/src/components/Navbar.js`

Rule:
For small role-based navigation changes, prefer editing the existing link rendering conditions in `Navbar.js` over introducing a new navigation registry or policy layer.

Applies when:
The change only affects which already-existing links appear for a role.

Do not overgeneralize:
Extract shared navigation policy only if multiple components begin duplicating the same role logic.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Verify Narrow First

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Rule:
For a scoped component-only change in a repository with unrelated lint failures, record the full-suite blocker and run a targeted lint command against the changed component.

Applies when:
Full lint fails outside the approved write scope.

Do not overgeneralize:
Do not use targeted lint as a substitute when failures are in changed files or shared dependencies touched by the task.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Render Resource Markdown Safely

Source:
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`

Rule:
Classroom resource markdown should render with raw HTML disabled unless a future approved requirement explicitly needs trusted embeds and records the security tradeoff.

Applies when:
Rendering trainer-authored classroom resource markdown for students or trainers.

Do not overgeneralize:
Existing pages that intentionally rely on raw HTML in `MarkdownRenderer` are not changed by this rule unless they render classroom resources.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Avoid Render-Time Browser Capability Checks

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

Rule:
Client components that display browser capability state such as WebGPU support should compute it after mount with `useEffect`, then update state, to avoid server/client hydration mismatch risk.

Applies when:
Adding browser-only capability checks in Next.js client components.

Do not overgeneralize:
Pure event-handler checks can still call browser APIs directly when they do not affect initial rendered markup.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Trainer Pages Are Operational Surfaces

Source:
- `docs/decisions/trainer-mode-ui-refresh-20260725-technical-decisions.md`

Rule:
Trainer dashboard and form management pages should prefer dense operational layouts, semantic status accents, stable icon buttons, clear tables/lists, and responsive panels over decorative hero/orb treatments.

Applies when:
Designing or reviewing trainer admin/workflow pages used repeatedly by trainers.

Do not overgeneralize:
Public landing pages, portfolios, or game-like pages may need a different visual treatment under their own RSD.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - UI-Only Diffs Preserve Behavior Shape

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

Rule:
For a trainer UI-only redesign, keep endpoint strings, route targets, state keys, submit handlers, validation branches, and authorization-bearing page guards unchanged unless the RSD explicitly approves behavior change.

Applies when:
Reviewing design refreshes where the user says not to change process or routes.

Do not overgeneralize:
Behavior refactors can still be valid under a separate RSD with explicit acceptance criteria and stronger tests.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Swiss Minimal Operational Rule

Source:
- `docs/rsd/swiss-minimal-learning-ui-refresh-20260725-rsd.md`

Rule:
For the approved trainer/classroom/student dashboard refresh, use Swiss design constraints: grid-first alignment, restrained typography, purposeful whitespace, high contrast, semantic accents, compact actions, and no decorative glows or duplicate low-value information.

Applies when:
Reviewing UI changes in `/trainer/dashboard`, `/classroom/list`, `/classroom/live/[id]`, or `/my_dashboard` for this task.

Do not overgeneralize:
Do not remove statuses, errors, form labels, required counts, or action-critical data merely because the page should be minimal.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Preserve Polling During UI Refresh

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Rule:
For classroom live UI-only refreshes, leave polling intervals, visibility handlers, endpoint strings, and chat/resource/problem handlers unchanged unless a behavior RSD explicitly approves the change.

Applies when:
Editing `ClassroomLiveClient.js` presentation around live classroom data.

Do not overgeneralize:
The existing hook dependency warning is not a blanket waiver for future behavior work; fix it under a behavior-safe task with targeted tests.

## 2026-07-25 - past-class-detail-visualization-20260725 - Filter Resource Scope Explicitly

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

Rule:
When classroom detail responses include both classroom-level and class-specific resources, client display code must explicitly filter by `class_id` so general resources and class materials do not appear in the wrong section.

Applies when:
Changing `/classroom/live/[id]` resources, completed class history, or classroom detail response shape.

Do not overgeneralize:
This rule does not replace server-side authorization or justify returning unrelated classroom data.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Validate Class Chat On Server

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

Rule:
Class-specific chat endpoints must validate the requested `class_id` belongs to the route `classroom_id` and that the current user can access that class before reading messages, sending messages, or toggling reactions.

Applies when:
Changing `classroom_messages`, message reactions, direct-message filtering, or class chat APIs.

Do not overgeneralize:
This does not fix older classroom management authorization helpers; review those separately before broad reuse.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Access Check Resource Detail

Source:
- `docs/decisions/classroom-resource-reader-problem-preview-20260725-technical-decisions.md`

Rule:
Dedicated classroom resource detail endpoints must verify the resource belongs to the route classroom and the requester can access that classroom before returning markdown content.

Applies when:
Adding resource reader routes, resource notifications, or standalone resource APIs.

Do not overgeneralize:
This does not replace existing classroom management authorization checks.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Do Not Weaken Class Problem Scope

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Rule:
Class-independent team-topic work must use separate assignment/progress storage instead of making `class_problems.class_id` nullable.

Applies when:
Adding topic assignment, team progress, or analytics features around classroom problems.

Do not overgeneralize:
Future migrations can still change `class_problems` if a new RSD explicitly changes live-class history semantics and includes stronger tests.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Board WebSocket Tokens

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Rule:
Classroom board WebSocket URLs must use short-lived board join tokens generated through authenticated HTTP, not long-lived app JWTs exposed directly in the socket URL.

Applies when:
Implementing or reviewing tldraw board sync, WebSocket auth, or classroom realtime sessions.

Do not overgeneralize:
This rule is for board sync; other authenticated HTTP endpoints still use existing bearer token flow.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Bound IDE Telemetry

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Classroom IDE monitor endpoints should bound event types, languages, event detail JSON, and code snapshot length, and must keep student write access separate from trainer monitor reads.

Applies when:
Adding IDE events, monitor APIs, activity dashboards, or retention logic.

Do not overgeneralize:
This does not authorize execution, filesystem access, hidden surveillance, or cross-classroom monitor reads.
## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Server Owns Team Membership Validity

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

Fact:
Team membership update endpoints must validate team ownership and classroom enrollment on the server; client checkboxes are only UI state.

Applies when:
Changing classroom team create/edit flows or assignment logic that trusts team members.

Do not overgeneralize:
This does not replace route-level authorization; keep both permission checks and domain validation.
