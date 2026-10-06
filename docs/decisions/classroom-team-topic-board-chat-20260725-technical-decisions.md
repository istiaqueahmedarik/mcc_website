# Classroom Team Topic Board Chat Technical Decisions

Status: Approved
Task ID: classroom-team-topic-board-chat-20260725
Last updated: 2026-07-25
Delivery mode: Auto requested, repo technical-decision gate enforced

## Mode and Gate Results

Gates waited on:
- RSD gate: user approved `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md` in chat on 2026-07-25.
- Technical decision gate: user approved this package in chat on 2026-07-25.

Gates skipped:
- None for this package.

Waivers:
- None.

User approvals:
- Technical decision package and proposed ADRs approved by user in chat on 2026-07-25.

## Documentation and Knowledge Used

- Source: `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`
  Used for: all decisions.
  Evidence: approved scope covers reusable topics, team assignment, solve-count analytics, tldraw live board, and pet chat bubble.
  Confidence: High.

- Source: `AGENTS.md`
  Used for: process and safety constraints.
  Evidence: RSD, technical decisions, task plan, and implementation review gates are required.
  Confidence: High.

- Source: `docs/knowledge-base/project-index.md`
  Used for: entry points.
  Evidence: classroom live work centers on `ClassroomLiveClient.js`, `classroomController.ts`, and `classroomRoute.ts`.
  Confidence: High.

- Source: `docs/knowledge-base/patterns.md`
  Used for: classroom implementation patterns.
  Evidence: keep live/past problem state separate; preview before assign; use bounded list display before server pagination.
  Confidence: High.

- Source: `docs/knowledge-base/decisions.md`
  Used for: existing classroom resource/chat decisions.
  Evidence: resource detail access is classroom-scoped; class-scoped chat uses `class_id` and hides legacy null-scope common messages.
  Confidence: High.

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: security and maintainability.
  Evidence: resource/chat endpoints must validate classroom access; live UI behavior changes need explicit approval.
  Confidence: High.

- Source: `docs/knowledge-base/hci-rules.md`
  Used for: interaction model.
  Evidence: chat scope must stay visible; history/detail selection needs clear state and feedback.
  Confidence: High.

- Source: `server/src/utils/dbInit.ts`
  Used for: schema compatibility.
  Evidence: existing `class_problems` is class-bound and student-bound; teams/resources/messages already exist.
  Confidence: High.

- Source: `server/src/controllers/classroomController.ts`
  Used for: controller patterns and access helpers.
  Evidence: `canAccessClassroom`, `getClassAccess`, problem metadata preview, difficulty storage, resource access, and chat access already exist.
  Confidence: High.

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI boundaries.
  Evidence: trainer tabs currently mix live assignment with class operation; chat is sticky sidebar; resources live below main panels.
  Confidence: High.

- Source: `https://youkn0wwho.academy/topic-list`
  Used for: topic library inspiration.
  Evidence: module/topic search/filter, topic counts, stats, heatmap, useful links, online judge links, leaderboard, analytics, favorites, and mixed practice are relevant patterns.
  Confidence: Medium.

- Source: `https://tldraw.dev/docs/sync`
  Used for: tldraw production sync decision.
  Evidence: production tldraw sync should be self-hosted; `@tldraw/sync-core` can integrate with JavaScript backends that support WebSockets; backend needs per-room sync server and asset strategy.
  Confidence: High.

- Source: `https://tldraw.dev/reference/sync/useSync`
  Used for: client sync decision.
  Evidence: `useSync` manages WebSocket lifecycle, presence, loading, success, and error states and accepts a dynamic `uri`.
  Confidence: High.

- Source: `https://tldraw.dev/reference/sync-core/TLSocketRoom`
  Used for: server sync decision.
  Evidence: `TLSocketRoom` manages connections, real-time changes, sessions, presence, chunking, timeout, and conflict resolution.
  Confidence: High.

- Source: `https://tldraw.dev/sdk-features/collaboration`
  Used for: auth and room model.
  Evidence: tldraw recommends room-per-document WebSocket sync with server-authoritative conflict resolution; auth can use dynamic WebSocket URIs.
  Confidence: High.

- Source: `https://hono.dev/docs/helpers/websocket`
  Used for: Bun/Hono WebSocket integration.
  Evidence: Hono provides Bun WebSocket helper via `upgradeWebSocket` and `websocket` export.
  Confidence: High.

- Source: `https://bun.com/docs/runtime/http/websockets`
  Used for: Bun runtime support.
  Evidence: `Bun.serve()` supports server-side WebSockets and publish-subscribe APIs.
  Confidence: High.

- Source: `https://docs.lottiefiles.com/en/runtimes/distributions/react`
  Used for: pet animation dependency.
  Evidence: `@lottiefiles/dotlottie-react` renders `.lottie` and `.json` animations in React.
  Confidence: High.

## Context

The approved RSD changes classroom live from a class-session-only workspace into a richer trainer operations surface. The hard constraints are:

- Team-topic assignment must not be forced into an active class.
- Existing `class_problems.class_id` should not be weakened just to satisfy topic assignments.
- Board collaboration must use tldraw and live WebSocket sharing, but board contents must not be permanently saved.
- Chat must become easier to reach without losing class scope or current class-specific access rules.
- Existing dirty worktree changes must be preserved.

## Decisions

### TD-001: Classroom-Scoped Topic Library

Decision:
Create a classroom-scoped topic library owned by the classroom trainer/admin instead of global imported topics or trainer-wide topics.

Proposed storage:
- `classroom_topics`: `id`, `classroom_id`, `created_by`, `title`, `module`, `description`, `status`, `created_at`, `updated_at`.
- `classroom_topic_resources`: `id`, `topic_id`, `title`, `url`, `content`, `position`, `created_at`.
- `classroom_topic_problems`: `id`, `topic_id`, `platform`, `problem_link`, `title`, `details`, `difficulty`, `timer_minutes`, `tags text[]`, `position`, `created_at`.

Options considered:
- Global topic catalog. Better reuse, but introduces moderation/ownership, visibility, migration, and public taxonomy questions outside the RSD.
- Trainer-wide topic catalog. Better reuse across classrooms, but current authorization and UI are classroom-centered.
- Classroom-scoped topic library. Least surprise with existing routes/access checks and enough to satisfy prebuilt topic units.

Rationale:
The current classroom model already scopes students, teams, resources, chat, and class sessions by classroom. A classroom-scoped library keeps permissions easy to explain and avoids importing an external public topic taxonomy before the product has ownership rules.

Tradeoffs:
Topics must be copied manually across classrooms until a future reuse/import feature exists. This is acceptable because the RSD asks for prebuilt topics inside this classroom workflow, not a global content platform.

Security and privacy impact:
Every topic, resource, and problem query must validate classroom membership or classroom management rights. Student access must be filtered through team assignment, not merely classroom membership, when displaying assigned topic work.

Testing impact:
Need API checks for trainer create/list/update topic, student cannot list unassigned topic details, and cross-classroom resource access fails.

HCI impact:
The UI should teach one clear sequence: build topic unit, inspect included resources/problems, then assign to team. Topic search/filter can borrow YouKn0wWho-style module/topic patterns without copying its full product.

Code-quality impact:
Dedicated topic tables avoid overloading `classroom_resources` with a new nullable `topic_id` meaning. This keeps existing resource reader behavior stable.

Rollback or migration:
Drop new topic tables if not used. Existing class/resource/problem/chat tables remain compatible.

ADR required: Yes. See `docs/adr/0003-classroom-topic-team-assignment-model.md`.

### TD-002: Team Topic Assignment Uses Assignment Rows Plus Sparse Progress Rows

Decision:
Represent a team-topic assignment independently from class sessions, then derive student work from current team membership and topic problems. Store progress only when a student changes status.

Proposed storage:
- `classroom_team_topic_assignments`: `id`, `classroom_id`, `topic_id`, `team_id`, `assigned_by`, `assigned_at`, `status`.
- `classroom_topic_problem_progress`: `id`, `assignment_id`, `topic_problem_id`, `student_id`, `status`, `solved_at`, `updated_at`, unique on `assignment_id/topic_problem_id/student_id`.

Options considered:
- Make `class_problems.class_id` nullable and reuse existing rows. Rejected because it weakens a class-session invariant and risks breaking history/chat/resource assumptions.
- Materialize all per-student progress rows at assignment time. Good audit trail but drifts when team membership changes and creates more rows than needed.
- Assignment row plus sparse progress rows. Keeps team assignment class-independent while still supporting solve counts and current membership.

Rationale:
This preserves existing live-class problem semantics and directly satisfies "not fixed in a class." Student lists can show all assigned topic problems by joining current team membership to assignment/topic problems, with missing progress treated as `not_solved`.

Tradeoffs:
If a student leaves a team, old progress remains in the table but should be excluded from current team analytics unless an audit view is later needed. If a student joins a team, they see existing assignments with default `not_solved`.

Security and privacy impact:
Progress upserts must require that the requester is the target student or classroom manager, and that the target student is currently eligible through team membership unless manager override is explicit.

Testing impact:
Need status update checks for student, trainer, cross-team, and cross-classroom cases.

HCI impact:
Trainer can understand team assignment as a live team responsibility, not a one-time copy. UI should explain when team membership affects assigned work.

Code-quality impact:
Keeps topic assignment policy separate from class problem mechanism. Avoids shotgun changes to history/live class problem code.

Rollback or migration:
Drop new assignment/progress tables. Existing `class_problems` untouched.

ADR required: Yes. See `docs/adr/0003-classroom-topic-team-assignment-model.md`.

### TD-003: Team Strength Analytics Are Derived, Not Stored

Decision:
Add a server analytics endpoint that derives team and member counts from current team membership, topic assignment progress, and existing class problem rows, without storing strength snapshots.

Options considered:
- Store team strength snapshots. Rejected for stale data and labeling risk.
- Derive only from new topic progress. Too narrow; trainer asked member performance generally.
- Derive from topic progress plus existing classroom class problem statuses. Best initial signal from available data.

Rationale:
Solve counts change frequently and are better computed from source rows. Existing `class_problems.status` and new topic progress both express student ability signals.

Tradeoffs:
Derived queries may need indexes if data grows. Start bounded to classroom scope and add indexes where needed.

Security and privacy impact:
Analytics endpoint must be trainer/admin only. Students should not see ranked team strength unless a future requirement approves it.

Testing impact:
Need fixture-like checks for solved/tried/not-solved counts by team and member, including students in multiple teams.

HCI impact:
Use neutral labels: solved, tried, pending, solve rate. Avoid "weak" or "bad" wording.

Code-quality impact:
Derivation belongs in controller helper(s), not duplicated in client calculations. Client renders server-provided counts.

Rollback or migration:
Remove endpoint and UI; no stored analytics to migrate.

ADR required: No.

### TD-004: Trainer UI Gets Separate Topics Tab, Board Tab, and Floating Chat

Decision:
Refactor `/classroom/live/[id]` presentation locally:
- Add trainer `Topics` tab for topic library, topic resources/problems, team assignment, and team analytics.
- Add `Board` tab/section for tldraw broadcast.
- Keep `Live`, `Schedule`, and `People` meanings intact.
- Move chat out of sticky sidebar into a fixed bottom-right bubble for trainer and student views.

Options considered:
- Keep topic assignment inside live tab. Rejected by RSD.
- Create new routes for topics/analytics/board. Rejected for now because current classroom live page already owns these classroom operations.
- Local tabs/bubble in `ClassroomLiveClient.js`. Matches existing page ownership and minimizes route churn.

Rationale:
The RSD explicitly asks for a separate tab. Existing code already uses shadcn `Tabs`, so a local extension preserves user expectations.

Tradeoffs:
`ClassroomLiveClient.js` will grow unless implementation extracts local presentational subcomponents in the same file or small nearby components. The task plan should include refactoring checkpoints.

Security and privacy impact:
UI hiding is not authorization. All new endpoints must enforce access server-side.

Testing impact:
Need role scenario checks for trainer and student visible tabs, chat bubble open/close, and board join states.

HCI impact:
Tabs must clearly separate mental models: live class, topics/team work, schedule, people, board. Chat bubble must keep class/session scope visible after opening.

Code-quality impact:
Use small local helpers/components only where repeated JSX becomes hard to follow. Avoid global design-system churn.

Rollback or migration:
Revert local client tab/bubble changes. Existing routes unchanged.

ADR required: No.

### TD-005: Ephemeral tldraw Sync Runs Through App-Controlled Bun/Hono WebSocket

Decision:
Use tldraw's sync stack with app-owned WebSocket sync:
- Client dependency: `tldraw` and `@tldraw/sync`.
- Server dependency: `@tldraw/sync-core`.
- Server route: Hono/Bun WebSocket endpoint using `upgradeWebSocket` and exporting `websocket` from `server/src/index.ts`.
- Sync room: one `TLSocketRoom` per active board room.
- Storage: `InMemorySyncStorage` or equivalent in-memory storage; do not persist snapshots or assets.
- Session metadata: store only board session metadata in PostgreSQL, not drawing contents.
- Permissions: trainer/admin can start/stop and edit; students can join readonly.

Proposed session storage:
- `classroom_board_sessions`: `id`, `classroom_id`, `class_id nullable`, `room_id`, `started_by`, `started_at`, `ended_at`, `status`.

Options considered:
- tldraw demo sync. Rejected because demo data is public to anyone with room id and meant for prototypes.
- Cloudflare sync template. Strong production default but adds new infrastructure, Durable Objects, R2, and persistent storage beyond "no permanent save."
- Custom store listener over raw WebSocket. Rejected because it reimplements conflict resolution, protocol lifecycle, presence, chunking, and reconnection already handled by tldraw sync.
- App-controlled tldraw sync-core room over Bun/Hono WebSocket. Best fit for current Bun server and ephemeral no-save requirement.

Rationale:
tldraw docs recommend self-hosting sync for production and support JavaScript backends with WebSockets. Hono and Bun both support WebSocket routing in this stack. `TLSocketRoom` avoids hand-rolled collaborative canvas sync.

Tradeoffs:
In-memory board contents disappear on server restart and cannot scale across multiple server processes without sticky routing or external room coordination. This matches no-save scope but must be visible in UX and review. Uploaded image/video assets should be blocked or clearly unsupported in first version to avoid asset persistence complexity.

Security and privacy impact:
Do not expose the app auth JWT directly in a long-lived WebSocket URL. Create a short-lived board join token over authenticated HTTP, then pass that token to the `useSync` dynamic URI. WebSocket handler validates token, classroom access, session status, and role. Students connect readonly.

Testing impact:
Need HTTP checks for start/join/stop board session. Need WebSocket smoke or manual browser checks for trainer draw/student see, readonly student, invalid token rejected, and ended room rejected.

HCI impact:
Board UI must show connecting, synced, readonly, ended, disconnected, and restart-lost states. Trainer should see "no permanent save" near start/stop controls.

Code-quality impact:
Encapsulate board room lifecycle in a small server module instead of mixing `TLSocketRoom` management into controller functions. Keep HTTP session metadata separate from WebSocket sync mechanics.

Rollback or migration:
Remove board routes/module and package deps; drop `classroom_board_sessions`. No drawing data migration needed.

ADR required: Yes. See `docs/adr/0004-ephemeral-tldraw-board-sync.md`.

### TD-006: Chat Bubble Keeps Existing Class-Scoped Chat API and Polling

Decision:
Move chat presentation into a bottom-right floating bubble while preserving current class-scoped chat endpoints, direct/broadcast target semantics, reactions, and 15-second polling/focus refresh behavior.

Options considered:
- Convert chat to realtime in this task. Rejected because RSD only requires visual relocation and bubble behavior; realtime chat would add extra transport/security surface while board already adds WebSocket.
- Keep sticky sidebar and only style bubbles. Rejected by RSD.
- Floating bubble with existing API. Satisfies UX request with lower risk.

Rationale:
The existing chat API already validates `class_id`, classroom access, recipients, message length, and reactions. Moving the UI first keeps behavior stable.

Tradeoffs:
Unread counts may be approximate under polling. A future push signal can improve it after board sync is stable.

Security and privacy impact:
No new chat data exposure. Bubble must still filter direct messages through existing API.

Testing impact:
Need chat send/reaction/read-only completed-class manual checks after relocation.

HCI impact:
Floating closed state needs visible unread and class scope summary. Open state needs focus trap or predictable keyboard flow and escape/close behavior.

Code-quality impact:
Extract chat bubble locally if it reduces `ClassroomLiveClient.js` complexity. Keep chat fetch/send handlers unchanged unless needed for props.

Rollback or migration:
Restore sticky layout. API unchanged.

ADR required: No.

### TD-007: Pet Animation Uses dotLottie React With Reduced-Motion Fallback

Decision:
Add `@lottiefiles/dotlottie-react` to the client and load `/pet.lottie` in the chat bubble through a client-only component that respects reduced motion.

Options considered:
- Use raw `<object>` or `<iframe>`. Lower dependency but weaker playback controls and accessibility.
- Convert `.lottie` to GIF/video. Loses vector/runtime benefits and adds asset processing.
- Official dotLottie React runtime. Best fit for `.lottie` in React.

Rationale:
The asset already exists at `client/public/pet.lottie`, and official docs identify the React runtime as the component for `.lottie` files.

Tradeoffs:
Adds a dependency. Dynamic/client-only loading should protect SSR and bundle risk.

Security and privacy impact:
Local static asset only. No remote animation fetch.

Testing impact:
Need render check with asset present and reduced-motion fallback.

HCI impact:
Animation should add warmth without blocking chat, stealing focus, or causing motion discomfort.

Code-quality impact:
Keep animation as a small component; do not spread Lottie logic across chat markup.

Rollback or migration:
Remove dependency/component and leave static icon fallback.

ADR required: No.

### TD-008: Problem Difficulty Remains Trainer Metadata

Decision:
Store trainer-selected difficulty on topic problems and class problems, but do not make it part of authorization, grading, or automatic ability labels.

Options considered:
- Use external judge ratings only. Rejected because user wants trainer-selected information.
- Turn difficulty into score weighting. Rejected because RSD says it helps trainer understand ability, not grade.
- Store/display/filter metadata. Best fit.

Rationale:
Existing class assignment already accepts `difficulty`. Topic problems should follow the same pattern.

Tradeoffs:
Difficulty is subjective and may differ from judge rating. UI should label it as trainer difficulty.

Security and privacy impact:
No new sensitive data.

Testing impact:
Need create/update/list checks for difficulty on topic problems and assignments.

HCI impact:
Labels must not imply objective external rating unless sourced from preview metadata separately.

Code-quality impact:
Reuse current difficulty options where practical; avoid duplicating labels in multiple places without a shared local constant.

Rollback or migration:
Null/drop topic difficulty fields if removed; existing `class_problems.difficulty` remains.

ADR required: No.

## Technical Gate Summary

Blocking choices for approval:
- Topic storage is classroom-scoped.
- Team-topic work is class-independent through assignment/progress tables, not by weakening `class_problems`.
- Board uses self-hosted tldraw sync over Bun/Hono WebSocket with in-memory room data and short-lived join tokens.
- Chat stays polling-based but moves into a floating pet bubble.

After this package is approved, the task plan should split implementation into serial steps because database initialization, classroom controller/routes, package dependencies, and `ClassroomLiveClient.js` overlap in one feature surface.
