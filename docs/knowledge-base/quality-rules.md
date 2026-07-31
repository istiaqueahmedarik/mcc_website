# Quality Rules

## 2026-08-01 - Bound Student Thread Surfaces

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Trainer and student chat surfaces must have bounded panel heights, internal scroll regions for message history, and composer max-height constraints so high-volume threads do not expand the whole classroom page.

Applies when:
Changing `ClassroomThreadsTab.js`, floating thread bubbles, thread lists, message history rendering, or chat composers.

Do not overgeneralize:
Bounded surfaces do not replace server-side pagination or virtualization if future measured volume exceeds the current message limit.

## 2026-08-01 - Page Thread and Update History

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Student-thread messages, student-thread events, and classroom Updates should load an initial bounded page and then expose explicit older/load-more actions. Do not fetch full history on initial chat, modal, or tab open.

Applies when:
Changing `ClassroomThreadsTab.js`, `UpdatesTab.js`, student-thread message/event APIs, or classroom update list APIs.

Do not overgeneralize:
Small current pages can still render all items already returned by the bounded API page; virtualization can be added later if measured DOM volume requires it.

## 2026-08-01 - Server Resolves Submission References

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Student-thread messages and attachments may carry submission context only after the server resolves the requested reference from authoritative live/topic pending submission rows. Never persist client-provided problem titles, student ids, class labels, or status values as authority.

Applies when:
Changing `ClassroomThreadsTab.js`, student-thread send endpoints, pending-submission chat buttons, or classroom message metadata.

Do not overgeneralize:
This rule is for submission-reference metadata; it does not make chat metadata a replacement for formal relational records when a future workflow needs querying or reporting.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Bound Dense Member Lists

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Rule:
Classroom group cards must not render unbounded member names inline beside action controls. Show member count, a small preview, and an explicit overflow affordance so edit/save/matrix actions remain reachable with large groups.

Applies when:
Changing People tab Groups lists, trainer Groups dashboard cards, student group/roster cards, or future group assignment summaries.

Do not overgeneralize:
Dense comparison matrices may still need scroll containers or virtualization; this rule is for card/list member previews.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Code Proof Still Requires Trainer Verdict

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Rule:
Allowing pasted code as proof must not give students final live problem verdict control. Server status handlers must keep student submissions as `pending_approval` and reserve `solved`, `tried`, and `not_solved` finalization for trainers/managers.

Applies when:
Changing `class_problems` proof fields, live Challenge submission dialogs, or trainer proof review surfaces.

Do not overgeneralize:
This rule does not add code execution or external judge verification.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Normalize Schedule Times At Boundaries

Source:
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Rule:
Class schedule writes must not send raw `datetime-local` strings across the API boundary. Convert browser local selections to ISO on submit and validate/normalize on the server before storing `classes.scheduled_time`.

Applies when:
Changing classroom session schedule create/edit handlers or adding new schedule-like fields.

Do not overgeneralize:
This rule does not migrate historical rows or define product-wide timezone preferences.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Separate Trainer Selectability From Student Access

Source:
- `docs/reviews/trainer-pre-enrolled-students-20260727-implementation-review.md`

Rule:
Pre-enrolled or link-pending classroom students may be selectable in trainer-side workflows, but student-facing classroom access must require active real membership (`classroom_students.enrollment_status = 'active'`) and must reject placeholder users.

Applies when:
Changing classroom roster queries, groups, attendance, problem assignment, topic access, chat/IDE/board access, signup/profile linking, or claim approval.

Do not overgeneralize:
This does not block trainers from managing placeholder roster identities; it blocks unapproved student-session access only.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Avoid Dead Table Space

Source:
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`

Rule:
Trainer classroom tables should use available width deliberately. Avoid narrow auto-width tables that leave dead space while important review controls and problem text become cramped.

Applies when:
Editing trainer Live progress, classroom review queues, or dense operational table layouts.

Do not overgeneralize:
Small content tables can stay compact when full-width layout would reduce readability.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Server Owns Problem Verdicts

Source:
- `docs/reviews/student-challenge-submission-duration-20260726-implementation-review.md`

Rule:
Student-facing problem status UI must not be the only control preventing solve self-approval. Live-class problem APIs must enforce trainer-owned final verdicts server-side and treat student solve attempts as proof submissions for trainer review.

Applies when:
Changing `class_problems.status`, student Challenge cards, trainer problem review, or related status endpoints.

Do not overgeneralize:
Students can still update allowed self-reported fields such as perceived difficulty when the server preserves final verdict ownership.

## 2026-07-26 - classroom-live-stop-polling-20260726 - No Hidden Classroom Live Polling

Source:
- `docs/reviews/classroom-live-stop-polling-20260726-implementation-review.md`

Rule:
Do not add interval polling or browser focus/visibility refetches to classroom live pages. Use explicit refresh/action-driven fetches or event-driven sockets instead.

Applies when:
Working on classroom live chat, classroom details, topic data, board state, or IDE tracking.

Do not overgeneralize:
Short-lived UI timers and countdowns are allowed when they do not fetch or post data.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Bulk Actions Need Single Request Feedback

Source:
- `docs/reviews/trainer-bulk-import-feedback-notifications-20260726-implementation-review.md`

Rule:
Trainer bulk actions should avoid per-row network loops, show disabled/loading state while the batch request is running, and replace loading feedback with one clear success/error result.

Applies when:
Implementing trainer bulk imports, batch mutations, or high-latency trainer classroom actions.

Do not overgeneralize:
Single small actions can remain simple handler calls if they still provide visible processing feedback.

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

## 2026-07-26 - trainer-qa-fixes-20260726 - Student Workflow Lists Must Be Role Clean

Source:
- `docs/reviews/trainer-qa-fixes-20260726-implementation-review.md`

Rule:
Classroom student-only workflows must filter or reject trainer/admin users on the server before returning rosters, group candidates, attendance rows, assignment targets, IDE monitor sources, or student notifications.

Applies when:
Changing classroom enrollment, People/Groups, attendance, assignments, IDE monitor reads, or student-targeted notifications.

Do not overgeneralize:
Do not delete existing enrollment rows without an explicit cleanup RSD and rollback plan.

## 2026-07-26 - trainer-qa-fixes-20260726 - Honest External Problem Metadata

Source:
- `docs/reviews/trainer-qa-fixes-20260726-implementation-review.md`

Rule:
Problem previews and saved assignment metadata must omit unavailable external judge limits or state that they are unavailable, rather than inventing placeholder limits such as `Standard sec | Standard MB`.

Applies when:
Changing `fetchProblemMetadata`, `problem-preview`, or classroom problem assignment displays.

Do not overgeneralize:
It is still valid to show real parsed time/memory limits when the source provides them.

## 2026-07-29 - Lazy Problem Thread Loading

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Rule:
Problem-thread components should mount only when the user opens a thread dialog or directly navigates to a thread surface. Do not render a thread component for every problem card on initial classroom load.

Applies when:
Changing live problem cards, topic problem cards, problem lists, or any classroom thread preview.

Do not overgeneralize:
It is still acceptable to load the Updates list on the first Updates tab mount because that is the tab's primary content.

## 2026-07-31 - Keep Student Thread Policy Server-Owned

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Rule:
Classroom student-thread modules must keep access policy, active-real-student filtering, event fan-out, safe attachment validation, storage paths, and signed URL creation on the server. Client components may show hints and states, but they must not decide authorization or file safety.

Applies when:
Changing student-thread APIs, classroom attachment uploads, realtime channels, or thread list UI.

Do not overgeneralize:
This rule does not forbid focused client components; it forbids moving policy decisions into them.
