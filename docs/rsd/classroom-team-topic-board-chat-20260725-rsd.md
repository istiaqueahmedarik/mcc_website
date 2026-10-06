# Classroom Team Topic Board Chat RSD

Status: Approved
Task ID: classroom-team-topic-board-chat-20260725
Owner: Codex / Arik
Last updated: 2026-07-25
Delivery mode: Auto requested, repo RSD gate enforced

## Mode and Gate Policy

The user requested `mode:auto`. This task affects classroom data shape, trainer workflows, third-party dependencies, live collaboration, and student-visible chat. Repository `AGENTS.md` requires approval after the primary RSD, technical decisions, full task plan, and implementation review. This RSD therefore records the Auto request but pauses at the RSD gate before technical decisions.

Gates waited on:
- Primary RSD approval.

User approvals:
- RSD approved by user in chat on 2026-07-25.

Gates skipped:
- None yet.

Waivers:
- None yet.

## Grill Mode Summary

Task restatement:
Trainer/classroom workflow should gain a separate team assignment/topic unit tab, team member performance visibility, prebuilt topics with resources and problems, team-strength analytics from solve counts, trainer difficulty metadata, a tldraw-powered live board, and a bottom-right chat bubble with the existing `/pet.lottie` animation.

Answers received:
- Problem assignment to a team is not fixed to a class.
- A trainer can assign a topic and the problems under that topic to a team.
- Topic plus resources is a reusable unit, prebuilt before assigning to one or more teams.
- Trainer needs team member performance.
- Trainer needs team strength analytics by solve count.
- Problem difficulty is trainer-provided information used to understand student ability.
- Board should use tldraw, live share through WebSocket, no permanent board save required.
- Class chat should move to a bottom-right bubble and include a cute pet Lottie from `/pet.lottie`.
- External product inspiration requested from `https://youkn0wwho.academy/topic-list`.

Assumptions:
- Existing classroom trainer/admin authorization remains the permission boundary for creating topics, assigning topics/problems, viewing analytics, and starting board broadcasts.
- Students can view only their enrolled classroom/team assignments, active board broadcasts, and class chat.
- Existing individual and team problem assignment should continue working while topic/team assignment becomes its own trainer tab.
- Topic resources reuse the existing classroom resource model where possible, but topic-resource persistence may require a new relation because a topic is reusable before class/team assignment.
- Team strength analytics can initially derive from existing `class_problems.status` rows and team membership, not external online judge scraping.
- Board sessions are ephemeral. A room/session row may exist to advertise active broadcast state and room id, but drawing contents are not stored by this app.
- Chat bubble replaces the sticky sidebar on the classroom live page, with existing class-scoped chat API preserved unless technical decisions prove a live channel is required.
- The pet animation is loaded from `client/public/pet.lottie` via a dotLottie-capable React player.

Important unresolved questions:
- Should prebuilt topics be global to all classrooms, trainer-owned, or classroom-owned?
- Can a student belong to multiple teams in the same classroom, and if so how should team assignment targets behave?
- Should a topic assigned to a team create per-student `class_problems` rows immediately, or a team-topic assignment row that expands only in UI?
- Should board sharing be hosted by this Bun server, Supabase Realtime, tldraw demo sync, or a self-hosted tldraw sync service?
- Should topic assignments be tied to active class sessions, classroom-wide practice, or both?

Decisions needing approval later:
- Data model for reusable topics/resources/problems and team-topic assignments.
- Realtime board transport and dependency choice.
- Whether existing chat polling stays or becomes realtime.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow constraints.
  Evidence: RSD-first process and approval gates are mandatory.
  Confidence: High.

- Source: `docs/knowledge-base/project-index.md`
  Used for: classroom/trainer entry points.
  Evidence: classroom live, trainer dashboard, resources, problem preview, and chat surfaces are centered in `ClassroomLiveClient.js`, `classroomController.ts`, and `classroomRoute.ts`.
  Confidence: High.

- Source: `docs/knowledge-base/patterns.md`
  Used for: classroom live implementation boundaries.
  Evidence: keep active/past problem state separate, preview before assign, and start with bounded lists before API pagination.
  Confidence: High.

- Source: `docs/knowledge-base/decisions.md`
  Used for: resource and chat constraints.
  Evidence: classroom resource reader route validates access; class-scoped chat filters by classroom and class.
  Confidence: High.

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: security and maintainability constraints.
  Evidence: classroom chat/resource endpoints must validate access, and live UI changes must preserve polling unless a behavior RSD approves change.
  Confidence: High.

- Source: `docs/knowledge-base/hci-rules.md`
  Used for: chat and history interaction expectations.
  Evidence: chat scope must be visible and completed sessions should map selection to adjacent detail.
  Confidence: High.

- Source: `server/src/utils/dbInit.ts`
  Used for: current classroom data model.
  Evidence: `class_problems` has `student_id`, `difficulty`, `status`, `tags`; `trainer_teams` and `trainer_team_members` exist; `classroom_resources` supports nullable `class_id`, `url`, and `content`; `classroom_messages` supports nullable `class_id`.
  Confidence: High.

- Source: `server/src/controllers/classroomController.ts`
  Used for: current API behavior.
  Evidence: team problem assignment expands team members into per-student `class_problems`; trainer difficulty is already accepted and stored; class problems return student rows for trainers.
  Confidence: High.

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: current UI behavior.
  Evidence: trainer tabs are `Live`, `Schedule`, and `People`; assignment form is inside live tab; resources are below main panels; chat is a sticky sidebar; difficulty selector already exists.
  Confidence: High.

- Source: `https://youkn0wwho.academy/topic-list`
  Used for: topic feature inspiration.
  Evidence: site exposes module/topic search/filter, large topic taxonomy, useful CP links, profile stats, heatmap, online judge links, streaks, leaderboard, analytics, trending, favorites, mixed practice, and code library entry points.
  Confidence: Medium.

- Source: `https://tldraw.dev/`
  Used for: board dependency feasibility.
  Evidence: tldraw SDK offers React canvas tools, default shapes/tools, accessibility support, and multiplayer collaboration features.
  Confidence: High.

- Source: `https://tldraw.dev/reference/sync/useSyncDemo`
  Used for: sync risk.
  Evidence: demo sync is public to anyone with room id and deleted after about a day, so it is unsuitable for private classroom production use without accepted risk.
  Confidence: High.

- Source: `https://github.com/tldraw/tldraw-sync-cloudflare`
  Used for: production sync option.
  Evidence: official starter uses WebSockets with Cloudflare Durable Objects and persists room state/assets; app requirement says no permanent board save, so persistence may need disabling/avoidance.
  Confidence: Medium.

- Source: `https://docs.lottiefiles.com/en/runtimes/distributions/react`
  Used for: pet animation rendering.
  Evidence: official `@lottiefiles/dotlottie-react` renders `.lottie` and `.json` animations in React.
  Confidence: High.

## Goal

Make trainer classroom operation support reusable topic units, team-topic/problem assignment, team and member performance visibility, live board broadcast, and a compact chat bubble while preserving existing classroom access control and student workflows.

## Non-Goals

- Do not permanently save tldraw board contents.
- Do not scrape solve counts from external judges in this task unless a later technical decision explicitly approves it.
- Do not replace existing classroom routes or remove current individual assignment.
- Do not migrate old chat messages into new scopes unless separately approved.
- Do not create a full course marketplace or public topic-list clone.
- Do not add AI generation.

## Users and Use Cases

Trainer/admin:
- Prebuild topics containing resources and problem links.
- Assign a topic or specific problems under a topic to one or more teams.
- See member performance and team strength from solve counts.
- Set trainer difficulty on problems.
- Start a live board broadcast for a class/session.
- Open chat from a bottom-right bubble without losing main classroom workspace.

Student:
- Join assigned team work.
- See assigned topic resources and problems.
- Update solve/tried/not-solved state on their assigned problems.
- Join/watch active board broadcast.
- Use class chat from a compact bubble.

## User-Visible Behavior

- Trainer classroom page gains a separate tab for topic/team assignment instead of keeping this inside the live class section.
- Topic unit UI supports topic title, module/category, resources, problem links, difficulty metadata, tags, and assignment targets.
- Trainer can assign a topic to a team so all team members receive the intended problem work.
- Trainer can inspect team member performance from solve/tried/not-solved counts and recent problem rows.
- Analytics section ranks or groups teams by solved count and shows relative strength without implying permanent labels.
- Difficulty remains trainer-authored metadata visible in previews, assigned problem rows, and analytics filters.
- Board section lets trainer start/stop a live broadcast and lets enrolled students join/watch while active.
- Chat becomes a floating bottom-right bubble with unread/active state, class scope label, and `/pet.lottie` animation.
- Chat bubble preserves direct/broadcast messaging and completed-class read-only behavior.

## Acceptance Criteria

- [ ] Trainer sees a separate topic/team assignment tab on `/classroom/live/[id]`.
- [ ] Trainer can create or use a prebuilt topic unit with resources and problem links.
- [ ] Trainer can assign a topic or selected topic problems to a team.
- [ ] Team assignment does not require the problem to be fixed to a class unless technical decisions explicitly tie assignment to active/scheduled sessions.
- [ ] Existing individual problem assignment still works.
- [ ] Trainer can view each team member's solve/tried/not-solved counts and recent assigned problems.
- [ ] Trainer can view team strength analytics ordered by solved count with neutral labels.
- [ ] Trainer difficulty is stored and displayed as informational metadata, not a grading lock.
- [ ] Board tab/section lets trainer start a live tldraw room and students join the active broadcast.
- [ ] Board contents are not permanently saved by the app.
- [ ] Board access is limited to authorized classroom members.
- [ ] Chat is accessible through a bottom-right floating bubble on classroom live pages.
- [ ] Chat bubble includes the `/pet.lottie` animation with reduced-motion/accessibility fallback.
- [ ] Chat retains class scope, direct-message target, broadcast target, reactions, unread/empty/loading/error states, and read-only completed-class behavior.
- [ ] No classroom resource, chat, topic, board, or analytics endpoint leaks data outside authorized classroom membership.

## Constraints

- Repository is already dirty; existing user/uncommitted changes must not be reverted.
- Client stack is Next.js, React, Tailwind, shadcn/Radix, lucide icons.
- Server stack is Bun/Hono/PostgreSQL with schema ensured in `server/src/utils/dbInit.ts`.
- Current classroom chat uses HTTP polling through Next route handler plus Hono backend.
- Current notification realtime helper uses Supabase Realtime only as no-sensitive-payload broadcast.
- tldraw and dotLottie dependencies must be justified and verified against Next.js client-only rendering constraints.
- Board privacy cannot rely on a public demo room id unless accepted as a prototype-only waiver.

## Dependencies

- Existing auth cookie and bearer token flow.
- Existing `classrooms`, `classes`, `classroom_students`, `trainer_teams`, `trainer_team_members`, `class_problems`, `classroom_resources`, `classroom_messages`, and `classroom_message_reactions` tables.
- New topic/team assignment storage, pending technical decision.
- tldraw React SDK and sync transport, pending technical decision.
- dotLottie React runtime for `/pet.lottie`, pending technical decision.

## Assumptions

- The first deliverable should use app-local topic management, not import all YouKn0wWho topics.
- Topic taxonomy inspiration can include modules, search/filter, favorites/trending later, but core assignment and analytics ship first.
- Team strength analytics should be factual and reversible: counts, solve rate, attempted count, and member breakdown.
- Broadcast board should prioritize classroom privacy over demo-speed implementation.
- The chat bubble should be available to trainer and student, but interaction controls differ by role and class status.

## Risks and Open Questions

- Risk: topic assignment data model could duplicate `class_problems` too early. Mitigation: technical decision must choose between normalized topic assignment rows and materialized per-student problem rows.
- Risk: tldraw demo sync is public by room id. Mitigation: prefer authenticated self-hosted or app-controlled sync, or record a prototype-only waiver.
- Risk: adding true WebSocket to Bun/Hono may conflict with deployment/proxy environment. Mitigation: inspect deployment assumptions before final transport choice.
- Risk: chat bubble can hide important class scope. Mitigation: always show class/session label and disabled reasons inside bubble.
- Risk: analytics can stigmatize students. Mitigation: neutral labels, factual counts, and trainer-only visibility.
- Question: topic ownership model. Owner: user/technical decision.
- Question: team assignment lifecycle relative to active class sessions. Owner: user/technical decision.
- Question: board transport. Owner: technical decision.

## Test Expectations

- Client lint on changed classroom/UI files.
- Server bundle smoke check using the repo-preferred `bun build src/index.ts --target=bun --outdir .codex-build`.
- API tests or focused manual HTTP checks for topic CRUD, team-topic assignment, analytics, board session state, and chat access.
- Manual classroom scenarios for trainer and student:
  - create topic
  - assign topic to team
  - view team member performance
  - update solve status
  - inspect team analytics
  - start/join/stop board broadcast
  - open/send/read chat bubble
- Accessibility checks for keyboard focus, labels, reduced motion for pet animation, and readable small-screen chat.

## HCI Expectations

- Topic assignment tab must make the mental model explicit: "build topic unit" then "assign to team".
- Assignment controls must show target team, included resources/problems, difficulty, and what students will receive before submission.
- Board broadcast must show visible active/inactive state, who can join, and failure recovery if sync disconnects.
- Chat bubble must communicate unread, current class scope, direct/broadcast target, and completed-class read-only mode.
- Analytics must avoid ambiguous strength labels; counts and rates should be inspectable, not mysterious.
- Keyboard users must be able to open/close chat, choose class/recipient, send messages, and access board controls.

## Code Quality Expectations

- Keep topic data access behind cohesive classroom controller helpers rather than scattering SQL in UI route handlers.
- Prefer existing classroom patterns for auth, resource validation, problem preview, and bounded lists.
- Add dependencies only when they remove meaningful complexity and pass Next.js client-only constraints.
- Avoid reshaping the entire classroom page; change local components and helper sections within approved scope.
- Separate topic unit management, team assignment, analytics derivation, board state, and chat bubble concerns enough that later changes do not require shotgun surgery.
- Preserve existing endpoint strings and polling behavior unless technical decisions approve a behavior change.

## Definition of Done

- [ ] Mandatory Grill Mode completed.
- [ ] RSD gate satisfied for selected/repo mode.
- [ ] Technical decision gate satisfied.
- [ ] Full task plan gate satisfied.
- [ ] Implementation passes verification.
- [ ] Implementation review gate satisfied.
- [ ] Final Git workflow represents all approved changes.
- [ ] Knowledge base and mistake note updated.
